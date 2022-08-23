// SPDX-License-Identifier: GPL-3.0

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

    mapping(address => address) private _accounts;

    mapping(address => uint) private _creditlimits;
    mapping(address => uint) private _balances;

    constructor(address owneraddr, address currencyaddr) {
        _owner = owneraddr;
        _currency_token = currencyaddr;
    }

    // views
    function owner() public view returns (address) {
        return _owner;
    }

    function currencyToken() public view returns (address) {
        return _currency_token;
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
        address _credittokenaddr = _accounts[client];

        if (_credittokenaddr == address(0))
            return address(0);

        ERC20Credit _credittoken = ERC20Credit(_credittokenaddr);

        return address(_credittoken);
   }  
   
    // transactions
    function createAccount(address client) public virtual returns (bool) {
        require(_accounts[client] == address(0));

        ERC20Credit _credittoken = new ERC20Credit(address(this), client);

        _accounts[client] = address(_credittoken);
 
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
            _balances[client] = _old_balance + _old_limit - limit;
        }
 
        return _creditlimits[client];
   }

   function payWithCredits(address client, uint256 amount) public virtual returns (bool) {
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

        require( (_current_limit - _current_balance) <= amount, "TOPUP: amount exceeds ceiling");

        IERC20 tok = IERC20(_currency_token);

        bool _done = tok.transfer(_owner, amount);

        if (_done) {
            _balances[_client] = _current_balance + amount;
        }

        return true;
    }
}