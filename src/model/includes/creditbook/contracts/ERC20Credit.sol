// SPDX-License-Identifier: MIT
// PrimusMoney Contracts v0.1

pragma solidity >=0.7.0 <0.9.0;

import "./erc20/IERC20.sol";
import "./erc20/extensions/IERC20Metadata.sol";
import "./utils/Context.sol";

import "./CreditBook.sol";


contract ERC20Credit is Context, IERC20, IERC20Metadata {
    address private _creditbook;
    address private _owner;
    address private _client;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;


    constructor(address creditbookaddr, address clientaddr) {
        _creditbook = creditbookaddr;
        CreditBook _book = CreditBook(_creditbook);

        _owner = _book.owner();
        _client = clientaddr;
    }

    // standard ERC20 functions
    function name() public view virtual override returns (string memory) {
        CreditBook _book = CreditBook(_creditbook);

        return _book.currencyName();
    }

    function symbol() public view virtual override returns (string memory) {
         CreditBook _book = CreditBook(_creditbook);

        return _book.currencySymbol();
    }


    function decimals() public view virtual override returns (uint8) {
         CreditBook _book = CreditBook(_creditbook);

        return _book.currencyDecimals();
    }

    function totalSupply() public view virtual override returns (uint256) {
         CreditBook _book = CreditBook(_creditbook);

        return _book.creditlimitOf(_client);
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        CreditBook _book = CreditBook(_creditbook);

        if (account != _client)
            return 0;

        return _book.balanceOf(_client);
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        require(_msgSender() == _client, "TRANSFER: only benificiary of credit can transfer");
        require(recipient == _owner, "TRANSFER: can only transfer to creditor");

        CreditBook _book = CreditBook(_creditbook);

        bool _done = _book.payWithCredits(_client, amount);

        if (_done) {
            emit Transfer(_client, recipient, amount);
        }

        return true;
    }

    // ERC20 functions not applicable
    function allowance(address /*owner*/, address /*spender*/) public view virtual override returns (uint256) {
        return 0;
    }

    function approve(address /*spender*/, uint256 /*amount*/) public virtual override returns (bool) {
        return false;
    }

   function transferFrom(
        address /*sender*/,
        address /*recipientr*/,
        uint256 /*amountr*/
    ) public virtual override returns (bool) {
        return false;
    }

    function increaseAllowance(address /*spenderr*/, uint256 /*addedValuer*/) public virtual returns (bool) {
        return false;
    }

 
    function decreaseAllowance(address /*spenderr*/, uint256 /*subtractedValuer*/) public virtual returns (bool) {
        return false;
    }

    // xtra functions
    function creditbook() public view virtual returns (address) {
        return _creditbook;
    }    

}
