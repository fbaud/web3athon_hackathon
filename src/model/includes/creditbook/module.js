'use strict';


var Module = class {
	
	constructor() {
		this.name = 'creditbook';
		
		this.global = null; // put by global on registration
		this.app = null;
		
		this.controllers = null;

		this.isready = false;
		this.isloading = false;
		
	}
	
	init() {
		console.log('module init called for ' + this.name);

		var global = this.global;
		
		this.isready = true;
	}
	
	// compulsory  module functions
	loadModule(parentscriptloader, callback) {
		console.log('loadModule called for module ' + this.name);
		
		if (this.isloading)
			return;
			
		this.isloading = true;

		var self = this;

		// load module's files
		var modulescriptloader = parentscriptloader.getChildLoader('creditbookloader');

		modulescriptloader.load_scripts(function() { self.init(); if (callback) callback(null, self); });

		return modulescriptloader;	
	}
	
	isReady() {
		return this.isready;
	}

	hasLoadStarted() {
		return this.isloading;
	}

	// optional module functions
	registerHooks() {
		console.log('module registerHooks called for ' + this.name);
		
		var global = this.global;

		global.registerHook('creatingSession_hook', this.name, this.creatingSession_hook);
	}
	
	postRegisterModule() {
		console.log('postRegisterModule called for ' + this.name);
		if (!this.isloading) {
			var global = this.global;
			var self = this;
			var rootscriptloader = global.getRootScriptLoader();
			
			this.loadModule(rootscriptloader, function() {
				if (self.registerHooks)
				self.registerHooks();
			});
		}
	}

	//
	// hooks
	//
	creatingSession_hook(result, params) {
		console.log('creatingSession_hook called for ' + this.name);
		
		var global = this.global;
		var session = params[0];
		
		var ethnodemodule = global.getModuleObject('ethnode');
		
		var contracts = ethnodemodule.getContractsObject(session);
		
		// register CreditBook in the contracts global object
		// (could be transfered to preFinalizeGlobalScopeInit_hook if necessary)
		contracts.registerContractClass('CreditBook', this.CreditBook);
		
		// force refresh of list
		ethnodemodule.getContractsObject(session, true);
		result.push({module: this.name, handled: true});
		
		return true;
	}

	
	// API
	async createCreditBookObject(session, currency, data) {
		if (!currency || !currency.deeds_v1)
			return Promise.reject('currency does not support erc721');

		if (!data['basetokenuri']) {
			if (!currency.deeds_v1.basetokenuri)
			return Promise.reject('currency does not provide a base token uri');

			// fill basetokenuri
			data['basetokenuri'] = currency.deeds_v1.basetokenuri;
		}
	
		var global = this.global;
		
		// create contract using Minter class
		var global = session.getGlobalObject();

		var address = (data && data['address'] ? data['address'] : null);

		var name = (data && data['name'] ? data['name'] : null);
		var symbol = (data && data['symbol'] ? data['symbol'] : null);
		var basetokenuri = (data && data['basetokenuri'] ? data['basetokenuri'] : null);
		
		var description = (data && data['description'] ? data['description'] : null);


		var ethnodemodule = global.getModuleObject('ethnode');
		
		var contracts = ethnodemodule.getContractsObject(session);
		
		
		var contract = contracts.createBlankContractObject('CreditBook');
		
		contract.setAddress(address);

		contract.setLocalName(name);
		contract.setLocalSymbol(symbol);
		contract.setLocalBaseTokenURI(basetokenuri);

		contract.setLocalDescription(description);
		
		return contract;	
	}

	// locker functions
	async getLockerContent(session, currency, address) {
		if (!currency || !currency.deeds_v1 || !currency.deeds_v1.locker)
			return Promise.reject('currency does not support erc721');

		var global = this.global;

		var LockerClass = global.getModuleClass('creditbook', 'Locker');

		var contractaddress = currency.deeds_v1.locker;

		var currenciesmodule = global.getModuleObject('currencies');

		var web3providerurl = await currenciesmodule.getCurrencyWeb3ProviderUrl(session, currency)

		var locker = new LockerClass(session, contractaddress, web3providerurl);

		var value = await locker.retrieve(address);

		return value;
	}
	
	async putLockerContent(session, currency, contentstring, ethtx) {
		if (!currency || !currency.deeds_v1 || !currency.deeds_v1.locker)
			return Promise.reject('currency does not support erc721');

		var global = this.global;

		var LockerClass = global.getModuleClass('creditbook', 'Locker');

		var contractaddress = currency.deeds_v1.locker;

		var currenciesmodule = global.getModuleObject('currencies');

		var web3providerurl = await currenciesmodule.getCurrencyWeb3ProviderUrl(session, currency)

		var locker = new LockerClass(session, contractaddress, web3providerurl);

		var txhash = await locker.store(contentstring, ethtx);

		return txhash;
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

_GlobalClass.getGlobalObject().registerModuleObject(new Module());

// dependencies
_GlobalClass.getGlobalObject().registerModuleDepency('creditbook', 'common');
