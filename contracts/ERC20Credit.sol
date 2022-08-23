// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

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
        require(_msgSender() == _client);
        require(recipient == _owner);

        CreditBook _book = CreditBook(_creditbook);

        return _book.payWithCredits(_client, amount);
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
