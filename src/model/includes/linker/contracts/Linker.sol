// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Linker {
	mapping (bytes32 => bytes32) private _values;
	
	// bytes32 value
	function store(bytes32 entry, bytes32 value) public payable {
		_values[entry] = value;
	}

	function retrieve(bytes32 entry) public view returns (bytes32 ) {
		return _values[entry];
	}


}
