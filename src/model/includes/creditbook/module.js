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

	//
	// model
	//
	
	async createCreditBookObject(session, currency, data) {
		if (!session)
			return Promise.reject('session is missing');

		if (!currency)
			return Promise.reject('currency is missing');

		var global = this.global;
		
		// create contract using Minter class
		var global = session.getGlobalObject();

		var address = (data && data['address'] ? data['address'] : null);

		var owner = (data && data['owner'] ? data['owner'] : null);
		var currencytoken = (data && data['currencytoken'] ? data['currencytoken'] : currency.address);
		var title = (data && data['title'] ? data['title'] : currency.address);
		
		var description = (data && data['description'] ? data['description'] : null);


		var ethnodemodule = global.getModuleObject('ethnode');
		
		var contracts = ethnodemodule.getContractsObject(session);
		
		
		var contract = contracts.createBlankContractObject('CreditBook');
		
		contract.setAddress(address);

		contract.setLocalOwner(owner);
		contract.setLocalCurrencyToken(currencytoken);
		contract.setLocalTitle(title);

		contract.setLocalDescription(description);
		
		return contract;	
	}

	async createERC20CreditObject(session, data) {
		if (!session)
			return Promise.reject('session is missing');

		var global = this.global;
		
		// create contract using Minter class
		var global = session.getGlobalObject();

		var address = (data && data['address'] ? data['address'] : null);

		var creditbook = (data && data['creditbook'] ? data['creditbook'] : null);
		
		var description = (data && data['description'] ? data['description'] : null);


		var ethnodemodule = global.getModuleObject('ethnode');
		
		var contracts = ethnodemodule.getContractsObject(session);
		
		
		var contract = contracts.createBlankContractObject('ERC20Credit');
		
		contract.setAddress(address);

		contract.setLocalCreditBook(creditbook);

		contract.setLocalDescription(description);
		
		return contract;	
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
