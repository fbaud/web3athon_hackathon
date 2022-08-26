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
		super(session, contractaddress, web3providerurl);

		// local data
		this.local_owner = null;
		this.local_currencytoken= null;
		this.local_title= null;
		
	}

	getContractType() {
		return 'CreditBook';
	}
	
	getContractLocalPersistor() {
		if (this.contractlocalpersistor)
			return this.contractlocalpersistor;
		
		var session = this.session;
		var contractuuid = this.getUUID();
		
		var global = session.getGlobalObject();
		var creditbookmodule = global.getModuleObject('creditbook');
		
		this.contractlocalpersistor = new creditbookmodule.CreditBookLocalPersistor(session, contractuuid)
		
		return this.contractlocalpersistor;
	}
	
	// initialization of object
	initContract(json) {
		console.log('CreditBook.initContract called for ' + this.address);
		
		//console.log('json is ' + JSON.stringify(json));
		
		var session = this.session;
		var global = session.getGlobalObject();
		
		// load local ledger elements (if any)
		
		if (json["uuid"])
			this.uuid = json["uuid"];
		
		if (json["status"])
			this.setStatus(json["status"]);
		
		if (json["owner"])
			this.local_owner = json["owner"];
		
		if (json["currencytoken"])
			this.local_currencytoken = json["currencytoken"];
		
		if (json["title"])
			this.local_title = json["title"];
		
		if (json["description"])
			this.local_description = json["description"];
		
		if (json["creationdate"])
			this.setLocalCreationDate(json["creationdate"]);
			
		if (json["submissiondate"])
			this.setLocalSubmissionDate(json["submissiondate"]);
			
		
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
		var currencytoken = this.getLocalCurrencyToken();
		var title = this.getLocalTitle();
		
		var description = this.getLocalDescription();
		
		var creationdate = this.getLocalCreationDate();
		var submissiondate = this.getLocalSubmissionDate();

		
		var json = {uuid: uuid, address: address, contracttype: contracttype, status: status, 
				web3providerurl: web3providerurl, chainid: chainid, networkid: networkid, 
				owner: owner, currencytoken: currencytoken, title: title,
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
		return this.local_owner;
	}
	
	setLocalOwner(owner) {
		this.local_owner = owner;
	}
	
	getLocalCurrencyToken() {
		return this.local_currencytoken;
	}
	
	setLocalCurrencyToken(token) {
		this.local_currencytoken= token;
	}

	getLocalTitle() {
		return this.local_title;
	}
	
	setLocalTitle(title) {
		this.local_title = title;
	}

	// deployment
	deploy(ethtx, callback) {
		var self = this;
		var session = this.session;
		//var EthereumNodeAccess = session.getEthereumNodeAccessInstance();

		var contractinterface = this.getContractInterface();
		
		var owneraddr = this.getLocalOwner();
		var currencyaddr = this.getLocalCurrencyToken()
		var booktitle = this.getLocalTitle();
		
		var transactionuuid = ethtx.getTransactionUUID();

		if (!transactionuuid) {
			transactionuuid = this.getUUID();
			ethtx.setTransactionUUID(transactionuuid);
		}
		
		this.setStatus(self.Contracts.STATUS_SENT);
		
		return contractinterface.deploy(owneraddr, currencyaddr, booktitle, ethtx, function (err, res) {
			console.log('CreditBook.deploy transaction committed, transaction hash is: ' + res);
			
			self.setStatus(self.Contracts.STATUS_PENDING);
		})
		.then(function(res) {
			console.log('CreditBook.deploy promise of deployment resolved, address is: ' + res);
			
			if (res) {
				self.setAddress(contractinterface.getAddress());
				self.setStatus(self.Contracts.STATUS_DEPLOYED);
				
				if (callback)
					callback(null, res);
			}
			else {
				if (callback)
					callback('error deploying credit book ' + booktitle, null);
			}
			
			return res;
		})		
		.catch(err => {
			if (callback)
				callback(err, null);

			throw err;
		});
	}
	
	// chain part
	getContractPath() {
		var contractinterface = this.getContractInterface();
		return contractinterface.getContractPath();
	}

	setContractPath(path) {
		var contractinterface = this.getContractInterface();
		return contractinterface.setContractPath(path);
	}

	getContractInterface() {
		if (this.contractinterface)
			return this.contractinterface;
		
		var session = this.session;
		var contractaddress = this.address;
		var web3providerurl = this.web3providerurl;
		
		var global = session.getGlobalObject();
		var creditbookmodule = global.getModuleObject('creditbook');
		
		this.contractinterface = new creditbookmodule.CreditBookContractInterface(session, contractaddress);

		if (this.web3providerurl)
		this.contractinterface.setWeb3ProviderUrl(this.web3providerurl);

		if (this.chainid)
		this.contractinterface.setChainId(this.chainid);
		
		if (this.networkid)
		this.contractinterface.setNetworkId(this.networkid);
		
		return this.contractinterface;
	}

	async getChainOwner() {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.getOwner();
	}
	
	async getChainCurrencyToken() {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.getCurrencyToken();
	}
	
	async getChainTitle() {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.getTitle();
	}
	

	// read
	async accounts() {
		var contractinterface = this.getContractInterface();

		return contractinterface.accounts();
	}
	
	async creditlimitOf(client_address) {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.creditlimitOf(client_address);
	}

	async balanceOf(client_address) {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.balanceOf(client_address);
	}

	async creditToken(client_address) {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.creditToken(client_address);
	}

	
	// write
	async setTitle(newtitle, ethtx) {
		var contractinterface = this.getContractInterface();

		return contractinterface.setTitle(newtitle, ethtx);
	}
	
	async createAccount(accountdata, client_address, ethtx) {
		var contractinterface = this.getContractInterface();

		return contractinterface.createAccount(accountdata, client_address, ethtx);
	}
	
	async updateCreditLimit(client_address, new_limit, ethtx) {
		var contractinterface = this.getContractInterface();

		return contractinterface.updateCreditLimit(client_address, new_limit, ethtx);
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

