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

var ERC20Credit = class extends SmartContractClass {
	
	constructor(session, contractaddress, web3providerurl) {
		super(session, contractaddress, web3providerurl);

		// local data
		this.creditbook = null;
		
	}

	getContractType() {
		return 'ERC20Credit';
	}
	
	getContractLocalPersistor() {
		if (this.contractlocalpersistor)
			return this.contractlocalpersistor;
		
		var session = this.session;
		var contractuuid = this.getUUID();
		
		var global = session.getGlobalObject();
		var creditbookmodule = global.getModuleObject('creditbook');
		
		this.contractlocalpersistor = new creditbookmodule.ERC20CreditLocalPersistor(session, contractuuid)
		
		return this.contractlocalpersistor;
	}
	
	// initialization of object
	initContract(json) {
		console.log('ERC20Credit.initContract called for ' + this.address);
		
		//console.log('json is ' + JSON.stringify(json));
		
		var session = this.session;
		var global = session.getGlobalObject();
		
		// load local ledger elements (if any)
		
		if (json["uuid"])
			this.uuid = json["uuid"];
		
		if (json["status"])
			this.setStatus(json["status"]);
		
		if (json["creditbook"])
			this.local_name = json["creditbook"];
		
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
		
		var token = this.getLocalToken();
		
		var creationdate = this.getLocalCreationDate();
		var submissiondate = this.getLocalSubmissionDate();

		
		var json = {uuid: uuid, address: address, contracttype: contracttype, status: status, 
				web3providerurl: web3providerurl, chainid: chainid, networkid: networkid, 
				owner: owner, token: token,
				creationdate: creationdate, submissiondate: submissiondate};
		
		return json;
	}
	
	saveLocalJson(callback) {
		console.log('ERC20Credit.saveLocalJson called for ' + this.address);

		var persistor = this.getContractLocalPersistor();
		
		persistor.saveERC20CreditJson(this, callback);
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
	
	getContractInterface() {
		if (this.contractinterface)
			return this.contractinterface;
		
		var session = this.session;
		var contractaddress = this.address;
		var web3providerurl = this.web3providerurl;
		
		var global = session.getGlobalObject();
		var creditbookmodule = global.getModuleObject('creditbook');
		
		this.contractinterface = new creditbookmodule.ERC20CreditContractInterface(session, contractaddress);

		if (this.web3providerurl)
		this.contractinterface.setWeb3ProviderUrl(this.web3providerurl);

		if (this.chainid)
		this.contractinterface.setChainId(this.chainid);
		
		if (this.networkid)
		this.contractinterface.setNetworkId(this.networkid);
		
		return this.contractinterface;
	}

	async getChainCreditBook() {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.getCreditBook();
	}
	
	async getChainCurrencyToken() {
		var contractinterface = this.getContractInterface();
		
		return contractinterface.getCurrencyToken();
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

_GlobalClass.registerModuleClass('creditbook', 'ERC20Credit', ERC20Credit);

