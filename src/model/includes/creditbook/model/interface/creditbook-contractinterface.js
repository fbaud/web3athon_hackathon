'use strict';

var CreditBookContractInterface = class {
	
	constructor(session, contractaddress) {
		this.session = session;
		this.address = contractaddress;
		
		this.contractpath = './contracts/CreditBook.json';
		
		this.web3providerurl = null;

		this.chainid = null;
		this.networkid = null;

		// operating variables
		this.finalized_init = null;
		
		this.contractinstance = null;
		
		var global = session.getGlobalObject();
		this.ethnodemodule = global.getModuleObject('ethnode');
	}
	
	getContractPath() {
		return this.contractpath;
	}

	setContractPath(path) {
		this.contractpath = path;
		this.contractinstance = null;
	}
	
	getAddress() {
		return this.address;
	}
	
	setAddress(address) {
		this.address = address;
	}
	
	getWeb3ProviderUrl() {
		return this.web3providerurl;
	}
	
	setWeb3ProviderUrl(url) {
		this.web3providerurl = url;
	}
	
	getChainId() {
		return this.chainid;
	}

	setChainId(chainid) {
		this.chainid = chainid;
	}

	getNetworkId() {
		return this.networkid;
	}

	setNetworkId(networkid) {
		this.networkid = networkid;
	}

	getContractInstance() {
		if (this.contractinstance)
			return this.contractinstance;
		
		var session = this.session;
		var global = session.getGlobalObject();
		var ethnodemodule = global.getModuleObject('ethnode');

		var contractpath = this.getContractPath();

		this.contractinstance = ethnodemodule.getContractInstance(session, this.address, contractpath, this.web3providerurl);

		if (this.chainid)
		this.contractinstance.setChainId(this.chainid);
		
		if (this.networkid)
		this.contractinstance.setNetworkId(this.networkid);
		
		return this.contractinstance;
	}
	
	validateTransactionExecution(payingaccount, gas, gasPrice, callback) {
		var session = this.session;
		var ethnodemodule = this.ethnodemodule;

		// we check the account is unlocked
		if (ethnodemodule.isAccountLocked(session, payingaccount))
			throw 'account ' + payingaccount.getAddress() + ' is locked, unable to initiate transaction';
		
		return true;
	}
	
	validateTransferFromExecution(fromaccount, toaddress, tokenid, callback) {
		var session = this.session;
		var fromaddress = fromaccount.getAddress();
		
		// we check the account is the owner
		// TODO: otherwise check is it is an operator
		return this.ownerOf(tokenid)
		.then(function(res) {
			if (session.areAddressesEqual(res, fromaddress)) {
				if (callback)
					callback(null, true);

				return true;
			}
			else {
				if (callback)
					callback(null, false);

				throw 'ERR_CAN_NOT_TRANSFER_ERC721TOKEN';
			}
		});
		
	}
	
	validateBurnExecution(fromaccount, amount, callback) {
		var fromaddress = fromaccount.getAddress();
		
		// we check the account balance is sufficient
		return this.balanceOf(fromaddress, function(err, balance) {
			if (err) {
				if (callback)
					callback('error checking balance of ' + err, null);
			}
			else {
				if (parseInt(amount.toString(),10) > parseInt(balance.toString(),10))
					throw 'account ' + fromaddress + ' balance (' + balance + ') is too low to burn '+ amount + ' token(s).';
				
				if (callback)
					callback(null, true);
				
				return true;
			}
		});
		
	}
	
	validateBurnFromExecution(fromaccount, burnedaddress, amount, callback) {
		var fromaddress = fromaccount.getAddress();
		
		// we check the account balance is sufficient
		return this.allowance(burnedaddress, fromaddress, function(err, allowance) {
			if (err) {
				if (callback)
					callback('error checking allowance of ' + err, null);
			}
			else {
				console.log('allowance of ' + fromaddress + ' on ' + burnedaddress + ' is ' + allowance);
				if (parseInt(amount.toString(),10) > parseInt(allowance.toString(),10))
					throw 'account ' + fromaddress + ' allowance (' + allowance + ') is too low to burn '+ amount + ' token(s) from ' + burnedaddress + '.';
				
				if (callback)
					callback(null, true);
				
				return true;
			}
		});
		
	}
	
	// contract api
	activateContractInstance(callback) {
		return this.getContractInstance().activate(callback);
	}
	

	deploy(tokenName, tokenSymbol, tokenBaseURI, ethtx, callback) {
		if (!ethtx)
			return Promise.reject('ethereum transaction is undefined');

		var self = this;
		var session = this.session;

		var fromaccount = ethtx.getFromAccount();
		var payingaccount = ethtx.getPayingAccount();

		payingaccount = (payingaccount ? payingaccount : fromaccount);

		var gas = ethtx.getGas();
		var gasPrice = ethtx.getGasPrice();

		var fromaddress = fromaccount.getAddress();
		var transactionuuid = ethtx.getTransactionUUID();
		var value = ethtx.getValue();
		
		console.log('CreditBookContractInterface.deploy called for ' + tokenName + " from " + fromaddress + " with gas limit " + gas + " and gasPrice " + gasPrice + " and transactionuuid " + transactionuuid);
		
		
		// we validate the transaction
		if (!this.validateTransactionExecution(payingaccount, gas, gasPrice, callback))
			return;
		
		var contractinstance = this.getContractInstance();
		
		var contracttransaction = contractinstance.getContractTransactionObject(payingaccount, gas, gasPrice);
				
		contracttransaction.setContractTransactionUUID(transactionuuid);
		contracttransaction.setValue(value);
	
		var args = [];
		
		args.push(tokenName);
		args.push(tokenSymbol);
		args.push(tokenBaseURI);
		
		contracttransaction.setArguments(args);
		
		var promise = contractinstance.contract_new_send(contracttransaction, function(err, res) {
			console.log('CreditBookContractInterface.deploy callback called, result is: ' + res);
			
			if (callback)
				callback(null, res); // res is txhash
			
			return res;
		})
		.then(function(res) {
			// res is now address and contractinstance address is set
			console.log('CreditBookContractInterface.deploy promise of deployment resolved, result is: ' + res);
			
			self.setAddress(contractinstance.getAddress());
			
			return res;
		})
		.catch(err => {
			if (callback)
				callback(err, null);

			throw err;
		});
		
		return promise;
	}
	
	getOwner(callback) {
		var self = this;
		var session = this.session;
		
		var contractinstance = this.getContractInstance();
		var params = [];
		
		return contractinstance.method_call("owner", params, callback);
	}
	
	getToken(callback) {
		var self = this;
		var session = this.session;
		
		var contractinstance = this.getContractInstance();
		var params = [];
		
		return contractinstance.method_call("currencyToken", params, callback);
	}
	


	
	// transactions
	getAddressFromTransactionUUID(transactionuuid, callback) {
		console.log('CreditBookContractInterface.getAddressFromTransactionUUID called for transactionuuid ' + transactionuuid);

		var self = this;
		var session = this.session;
		
		var contractinstance = this.getContractInstance();

		var promise = contractinstance.findAddressFromUUID(transactionuuid)
		.then(function(res) {
			
			if (callback)
				callback(( res ? null: 'error'), res);
				
			return res;
		});
		
		return promise;
		
	}

	approve(address, tokenId, ethtx, callback) {
		var self = this;
		var session = this.session;
		
		var fromaccount = ethtx.getFromAccount();
		var payingaccount = ethtx.getPayingAccount();

		payingaccount = (payingaccount ? payingaccount : fromaccount);

		var gas = ethtx.getGas();
		var gasPrice = ethtx.getGasPrice();

		var fromaddress = fromaccount.getAddress();
		var transactionuuid = ethtx.getTransactionUUID();
		var value = ethtx.getValue();
		
		console.log('CreditBookContractInterface.approve called for ' + address + " on token " + tokenId + " with gas limit " + gas + " and gasPrice " + gasPrice + " and transactionuuid " + transactionuuid);

		// we validate the transaction
		if (!this.validateTransactionExecution(payingaccount, gas, gasPrice, callback))
			return;
		
		var contractinstance = this.getContractInstance();
		var contracttransaction = contractinstance.getContractTransactionObject(payingaccount, gas, gasPrice);
		
		contracttransaction.setContractTransactionUUID(transactionuuid);
		contracttransaction.setValue(value);
	
		var args = [];

		var _tokenId = parseInt(tokenId);
		
		args.push(fromaddress);
		args.push(_tokenId);
		
		contracttransaction.setArguments(args);
		
		contracttransaction.setContractTransactionUUID(transactionuuid);

		contracttransaction.setMethodName('approve');
		
		var promise = contractinstance.method_send(contracttransaction, callback)
		.then(function(res) {
			console.log('CreditBookContractInterface.approve promise resolved, result is ' + res);
			
			return res;
		})
		.catch(err => {
			console.log('CreditBookContractInterface.approve error: ' + err);

			if (callback)
				callback(err, null);

			throw err;
		});

		return promise;
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

_GlobalClass.registerModuleClass('creditbook', 'CreditBookContractInterface', CreditBookContractInterface);
