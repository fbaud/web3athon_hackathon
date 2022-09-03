// SPDX-License-Identifier: MIT
// PrimusMoney Contracts v0.1

pragma solidity >=0.7.0 <0.9.0;

import "./erc20/extensions/IERC20Metadata.sol";
import "./erc20/IERC20.sol";

import "./ERC20Credit.sol";

/**
 * @title CreditBook
 * @dev Manager merchant's credit book
 */
contract CreditBook {

    address private _owner;

    address private _currency_token;

    string private _title;

    string [] private _accounts;
    mapping(address => address) private _erc20credits;

    mapping(address => uint) private _creditlimits;
    mapping(address => uint) private _balances;

    constructor(address owneraddr, address currencyaddr, string memory booktitle) {
        _owner = owneraddr;
        _currency_token = currencyaddr;
        _title = booktitle;
    }

    // views
    function owner() public view returns (address) {
        return _owner;
    }

    function currencyToken() public view returns (address) {
        return _currency_token;
    }

     function title() public view returns (string memory) {
        return _title;
    }

   function currencyName() public view virtual returns (string memory) {
        IERC20Metadata tok = IERC20Metadata(_currency_token);
        return tok.name();
    }

    function currencySymbol() public view virtual returns (string memory) {
        IERC20Metadata tok = IERC20Metadata(_currency_token);
        return tok.symbol();
    }

    function currencyDecimals() public view virtual returns (uint8) {
        IERC20Metadata tok = IERC20Metadata(_currency_token);
        return tok.decimals();
    }

    // client
    function creditlimitOf(address client) public view virtual returns (uint256) {
        return _creditlimits[client];
    }

    function balanceOf(address client) public view virtual returns (uint256) {
        return _balances[client];
    }

   function creditToken(address client) public view virtual returns (address) {
        address _credittokenaddr = _erc20credits[client];

        if (_credittokenaddr == address(0))
            return address(0);

        ERC20Credit _credittoken = ERC20Credit(_credittokenaddr);

        return address(_credittoken);
   }  
   
    // transactions
    function setTitle(string calldata newtitle) public virtual returns (string memory) {
        require(msg.sender == _owner, "Only for owner");

        string memory _old_title = _title;

        _title = newtitle;

        return _old_title;
    }

    // accounts
    function accounts() public view returns( string  [] memory){
        return _accounts;
    }

    function createAccount(string calldata accountdata, address client) public virtual returns (bool) {
        require(client != address(0), "Client address needed");
        require(_erc20credits[client] == address(0), "Account for client already exists");

        _accounts.push(accountdata);
        ERC20Credit _credittoken = new ERC20Credit(address(this), client);

        _erc20credits[client] = address(_credittoken);
 
        return true;
   }

   function updateCreditLimit(address client, uint256 limit) public virtual returns (uint256) {
        uint _old_limit = _creditlimits[client];
        uint _old_balance = _balances[client];

        _creditlimits[client] = limit;

        if (limit > _old_limit) {
            _balances[client] = _old_balance + limit - _old_limit;
        }
        else {
            if (_old_balance > _old_limit - limit)
            _balances[client] = _old_balance - _old_limit + limit;
            else
            _balances[client] = 0;
        }
 
        return _creditlimits[client];
   }

   function payWithCredits(address client, uint256 amount) public virtual returns (bool) {
        address _credittokenaddr = _erc20credits[client];
        require(msg.sender == _credittokenaddr); // only credit token contract can call payWithCredits
        uint _old_balance = _balances[client];

        require(_old_balance >= amount, "CREDIT: transfer amount exceeds balance");

        if (amount <= _old_balance) {
            _balances[client] = _old_balance - amount;
        }

        return true;
    }


   function topupCredits(uint256 amount) public virtual returns (bool) {
        address _client = msg.sender;
        uint _current_limit = _creditlimits[_client];
        uint _current_balance = _balances[_client];

        require( (_current_limit - _current_balance) >= amount, "TOPUP: amount exceeds ceiling");

        IERC20 _ccytok = IERC20(_currency_token);

        uint256 _ccybalance = _ccytok.balanceOf(_client);
 
        uint256 _ccyallowance = _ccytok.allowance(_client, address(this));


        require(_ccybalance >= amount, "TOPUP: balance of currency token is too low");
        require(_ccyallowance >= amount, "TOPUP: check the currency allowance for contract");

        bool _done = _ccytok.transferFrom(_client, _owner, amount);

        if (_done) {
            _balances[_client] = _current_balance + amount;
        }

        return true;
    }
}