'use strict';


var Module = class {
	
	constructor() {
		this.name = 'mvc-mycreditbook';
		
		this.global = null; // put by global on registration

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
		var modulescriptloader = parentscriptloader.getChildLoader('mvccreditbookloader');

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

	
	_getClientAPI() {
		if (this.clientapicontrollers)
			return this.clientapicontrollers;
		
		var global = this.global;
		
		var mvcmodule = global.getModuleObject('mvc');
		
		this.clientapicontrollers = mvcmodule._getClientAPI();

		return  this.clientapicontrollers;
	}

	_getMvcPWAObject() {
		var global = this.global;
		
		var mvcmodule = global.getModuleObject('mvc-myquote');

		return mvcmodule;
	}

	// API
	t(string) {
		var mvcpwa = this._getMvcPWAObject();

		return mvcpwa.t(string);
	}

	// credit book
	async readCreditBooks(sessionuuid, walletuuid) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);

		if (!walletuuid) {
			var keys = ['mypwa', 'creditbooks']; 
			// shared keys
		}
		else {
			console.log('WARNING: walletuuid specific case not implemented!!!');
			var keys = ['mypwa', 'creditbooks']; 
			// shared keys, also we could look in wallet
			// with mvcmodule.getFromWallet
		}
	
		var mvcpwa = this._getMvcPWAObject();
		let creditbook_list = await mvcpwa._readClientSideJson(session, keys);

		if (!creditbook_list)
			creditbook_list = [];

		return creditbook_list;
	}

	async saveCreditBook(sessionuuid, walletuuid, creditbook) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var creditbook_list = await this.readCreditBooks(sessionuuid, walletuuid);

		// look not in list
		var bInList = false;

		for (var i = 0; i < creditbook_list.length; i++) {
			if (creditbook_list[i].address == creditbook.address) {
				bInList = true;
				break;
			}
		}

		if (!bInList) {
			var session = await _apicontrollers.getSessionObject(sessionuuid);
		
			if (!session)
				return Promise.reject('could not find session ' + sessionuuid);

			// creditbook parameters to be saved
			var {address, title, token, owner} = creditbook;
	
			if (!walletuuid) {
				var keys = ['mypwa', 'creditbooks']; 
				// shared keys
			}
			else {
				console.log('WARNING: walletuuid specific case not implemented!!!');
				var keys = ['mypwa', 'creditbooks']; 
				// shared keys, also we could put in wallet
				// with mvcmodule.putInWallet			
			}
		
			var localjson = {address, title, token, owner};

			localjson.savetime = Date.now();

			creditbook_list.push(localjson);
	
			var mvcpwa = this._getMvcPWAObject();
			return mvcpwa._saveClientSideJson(session, keys, creditbook_list);
		}
		else {
			return creditbook_list;
		}
	}

	async _createCreditBookObject(session, currency, data) {
		// for local contract objects (before deployment)
		var global = this.global;
		var creditbookmodule = global.getModuleObject('creditbook');

		var creditbookobj = await creditbookmodule.createCreditBookbject(session, currency, data);

		return creditbookobj;
	}

	async deployCreditBook(sessionuuid, walletuuid, currencyuuid, carduuid, creditbook, feelevel) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');
		
		if (!currencyuuid)
			return Promise.reject('currency uuid is undefined');
		
		if (!carduuid)
			return Promise.reject('card uuid is undefined');
		
		
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
		
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);
	
		var currency = await this.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);
	
		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		var mvcpwa = this._getMvcPWAObject();

		var childsession = mvcpwa._getMonitoredCardSession(session, wallet, card);

		// create contract object (local)
		var data = Object.create(null);

		data['owner'] = creditbook.owner;
		data['token'] = creditbook.token;

		var creditbookobj = await this._createCreditBookObject(childsession, currency, data);

		var fromaccount = card._getSessionAccountObject();
		var from_card_scheme = card.getScheme();

		var ethereumnodeaccessmodule = global.getModuleObject('ethereum-node-access');

		var ethereumtransaction = ethereumnodeaccessmodule.getEthereumTransactionObject(childsession, fromaccount);
		
		// fee
		var fee = await _apicontrollers.createSchemeFee(from_card_scheme, feelevel);

		ethereumtransaction.setGas(fee.gaslimit);
		ethereumtransaction.setGasPrice(fee.gasPrice);

 		var contractaddress = await creditbookobj.deploy(ethereumtransaction);

		var creditbookobjaddress = creditbookobj.getAddress();

		if (!creditbookobjaddress)
			return Promise.reject('could not generate a minter for currency ' + currencyuuid);

		creditbook.address = creditbookobjaddress;
		creditbook.card_uuid = carduuid;
		creditbook.card_address = card.getAddress();

		return creditbook;	
	}

	async fetchCreditBook(sessionuuid, bookaddress) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		var _apicontrollers = this._getClientAPI();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
	
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);

		return null;
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
_GlobalClass.getGlobalObject().registerModuleDepency('mvc-mycreditbook', 'common');
