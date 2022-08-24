'use strict';

var Linker = class {
	
	constructor(session, contractaddress, web3providerurl) {
		this.session = session;
		this.address = contractaddress;
		
		this.web3providerurl = web3providerurl;

		this.contractpath = './contracts/pwa-pocs/Linker.json';
		
		// operating variables
		this.contractinstance = null;
	}

	getContractPath() {
		return this.contractpath;
	}

	setContractPath(path) {
		this.contractpath = path;
		this.contractinstance = null;
	}
	
	getContractInstance() {
		if (this.contractinstance)
			return this.contractinstance;
		
		var session = this.session;
		var global = session.getGlobalObject();
		var ethnodemodule = global.getModuleObject('ethnode');

		var contractpath = this.getContractPath();
		
		this.contractinstance = ethnodemodule.getContractInstance(session, this.address, contractpath, this.web3providerurl);
		
		return this.contractinstance;
	}

	// string value
	async store(txhash, next_txhash, ethtx) {
		var contractinstance = this.getContractInstance();

		var fromaccount = ethtx.getFromAccount();
		var payingaccount = ethtx.getPayingAccount();

		payingaccount = (payingaccount ? payingaccount : fromaccount);

		var gas = ethtx.getGas();
		var gasPrice = ethtx.getGasPrice();

		var transactionuuid = ethtx.getTransactionUUID();
		var value = ethtx.getValue();


		var contractinstance = this.getContractInstance();
		var contracttransaction = contractinstance.getContractTransactionObject(payingaccount, gas, gasPrice);

		contracttransaction.setArguments(args);
		
		contracttransaction.setContractTransactionUUID(transactionuuid);
		contracttransaction.setValue(value);

		contracttransaction.setMethodName('store');	
		
		var args = [];

		var _entry_bytes32 = (typeof txhash === 'string' || txhash instanceof String ? Buffer.from(txhash.split('x')[1], 'hex') : txhash);
		var _next_bytes32 = (typeof next_txhash === 'string' || next_txhash instanceof String ? Buffer.from(next_txhash.split('x')[1], 'hex') : next_txhash);

	
		args.push(_entry_bytes32);
		args.push(_next_bytes32);
		
		contracttransaction.setArguments(args);

		return contractinstance.method_send(contracttransaction);
	}
	
	async retrieve(txhash) {
		var contractinstance = this.getContractInstance();

		var params = [];
	
		var _entry_bytes32 = (typeof txhash === 'string' || txhash instanceof String ? Buffer.from(txhash.split('x')[1], 'hex') : txhash);

		params.push(_entry_bytes32);
		
		const valstr = await contractinstance.method_call('retrieve', params);
		
		return valstr;
	}
	

	
}

if ( typeof window !== 'undefined' && typeof window.GlobalClass !== 'undefined' && window.GlobalClass ) {
	var _GlobalClass = window.GlobalClass;
}
else if (typeof window !== 'undefined') {
	var _GlobalClass = ( window && window.simplestore && window.simplestore.Global ? window.simplestore.Global : null);
}
else if (typeof global !== 'undefined') {
	// we are in node js
	var _GlobalClass = ( global && global.simplestore && global.simplestore.Global ? global.simplestore.Global : null);
}

_GlobalClass.registerModuleClass('common', 'Linker', Linker);

