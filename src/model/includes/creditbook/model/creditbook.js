'use strict';

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


var SmartContractClass = _GlobalClass.getGlobalObject().getModuleClass('common', 'SmartContract');

var CreditBook = class extends SmartContractClass {
	
	constructor(session, contractaddress, web3providerurl) {
		this.session = session;
		this.address = contractaddress;
		
		this.web3providerurl = web3providerurl;

		this.contractpath = './contracts/creditbook/CreditBook.json';
		
		// operating variables
		this.contractinstance = null;

		// local data
		this.owner = null;
		this.token = null;
		
	}

	// local part
	getLocalJson() {
		// ledger part
		var uuid = this.getUUID();
		var address = this.getAddress();
		var contracttype = this.getContractType();
		var web3providerurl = this.getWeb3ProviderUrl();
		var chainid = this.getChainId();
		var networkid = this.getNetworkId();
		
		var status = this.getStatus();
		
		var owner = this.getLocalOwner();
		var token = this.getLocalToken();
		
		var description = this.getLocalDescription();
		
		var creationdate = this.getLocalCreationDate();
		var submissiondate = this.getLocalSubmissionDate();

		
		var json = {uuid: uuid, address: address, contracttype: contracttype, status: status, 
				web3providerurl: web3providerurl, chainid: chainid, networkid: networkid, 
				owner: owner, token: token,
				creationdate: creationdate, submissiondate: submissiondate,
				description: description};
		
		return json;
	}
	
	saveLocalJson(callback) {
		console.log('CreditBook.saveLocalJson called for ' + this.address);

		var persistor = this.getContractLocalPersistor();
		
		persistor.saveCreditBookJson(this, callback);
	}

	getLocalOwner() {
		return this.owner;
	}
	
	setLocalOwner(owner) {
		this.owner = owner;
	}
	
	getLocalToken() {
		return this.token;
	}
	
	setLocalToken(token) {
		this.token = token;
	}

	// chain part
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

	// read

	async creditlimitOf(client_address) {
		var contractinstance = this.getContractInstance();

		var params = [];
	
		params.push(client_address);
		
		const limit = await contractinstance.method_call('creditlimitOf', params);
		
		return limit;
	}
	
	// write
	async createAccount(client_address, ethtx) {
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

		contracttransaction.setMethodName('createAccount');		
		
		var args = [];
	
		args.push(client_address);

		contracttransaction.setArguments(args);
		
		return contractinstance.method_send(contracttransaction);
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

_GlobalClass.registerModuleClass('creditbook', 'CreditBook', CreditBook);

