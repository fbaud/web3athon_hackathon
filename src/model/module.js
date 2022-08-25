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

		this.Linker = global.getModuleClass('common', 'Linker');

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

	//
	// Storage-access
	//

	// Linker
	async _getLinker(session, contractaddress, web3providerurl) {
		var global = this.global;

		// create linker object
		const Linker = this.Linker;
		const linker = new Linker(session, contractaddress, web3providerurl);

		return linker;
	}
	
	async storeLinkerValue(sessionuuid, walletuuid, carduuid, contractaddress, txhash, next_txhash, feelevel = null) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');

		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');
		
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
	
		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		let cardscheme = card.getScheme();
		let web3providerurl = cardscheme.getWeb3ProviderUrl();

		let linker = await this._getLinker(session, contractaddress, web3providerurl);

		// create ethereum transaction object
		var fromaccount = card._getSessionAccountObject();
		var from_card_scheme = card.getScheme();

		var ethereumnodeaccessmodule = global.getModuleObject('ethereum-node-access');
		var ethereumtransaction = ethereumnodeaccessmodule.getEthereumTransactionObject(session, fromaccount);
		
		// fee
		var fee = await _apicontrollers.createSchemeFee(from_card_scheme, feelevel);

		ethereumtransaction.setGas(fee.gaslimit);
		ethereumtransaction.setGasPrice(fee.gasPrice);

		
		let tx_hash = await linker.store(txhash, next_txhash, ethereumtransaction);

		return tx_hash;
	}
	
	async retrieveLinkerValue(sessionuuid, contractaddress, web3providerurl, txhash) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');

		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		let linker = await this._getLinker(session, contractaddress, web3providerurl)
		
		let value = await linker.retrieve(txhash);

		if (value == '0x0000000000000000000000000000000000000000000000000000000000000000')
			return;

		return value;
	}

	//
	// credit book
	//
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
			if (creditbook_list[i].uuid == creditbook.uuid) {
				bInList = true;
				break;
			}
		}

		if (!bInList) {
			var session = await _apicontrollers.getSessionObject(sessionuuid);
		
			if (!session)
				return Promise.reject('could not find session ' + sessionuuid);

			// creditbook parameters to be saved
			var {uuid, address, title, currencyuuid, carduuid} = creditbook;
	
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
		
			var localjson = {uuid, address, title, walletuuid, currencyuuid, carduuid};

			localjson.savetime = Date.now();

			creditbook_list.push(localjson);
	
			var mvcpwa = this._getMvcPWAObject();
			return mvcpwa._saveClientSideJson(session, keys, creditbook_list);
		}
		else {
			return creditbook_list;
		}
	}

	async readCreditBook(sessionuuid, walletuuid, creditbookuuid) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!creditbookuuid)
			return Promise.reject('credit book uuid is undefined');

		let creditbooks = await this.readCreditBooks(sessionuuid, walletuuid);

		for (var i = 0; i < (creditbooks ? creditbooks.length : 0); i++) {
			if (creditbooks[i].uuid == creditbookuuid)
				return creditbooks[i];
		}
		
	}


	async _createCreditBookObject(session, currency, data) {
		// for local contract objects (before deployment)
		var global = this.global;
		var creditbookmodule = global.getModuleObject('creditbook');

		var creditbookobj = await creditbookmodule.createCreditBookObject(session, currency, data);

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
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
		
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);
	
		var currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);
	
		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		var childsession = await mvcpwa._getMonitoredCardSession(session, wallet, card);

		// create contract object (local)
		var data = Object.create(null);

		data['owner'] = creditbook.owner;
		data['currencytoken'] = creditbook.currencytoken;
		data['title'] = creditbook.title;

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
			return Promise.reject('could not generate a credit book for currency ' + currencyuuid);

		creditbook.address = creditbookobjaddress;

		return creditbook;	
	}

	async fetchCreditBook(sessionuuid, walletuuid, currencyuuid, bookaddress) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
 		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');
		
		if (!currencyuuid)
			return Promise.reject('currency uuid is undefined');
		
		
		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid).catch(err => {});
		
 		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);
	
		var currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);
		

		// get a child session on correct scheme
		var currencyscheme = await mvcpwa._getCurrencyScheme(session, currency);
		var childsession = await mvcpwa._getMonitoredSchemeSession(session, wallet, currencyscheme);
	
		let data = {};
		data['address'] = bookaddress;

		var creditbookobj = await this._createCreditBookObject(childsession, currency, data);

		let creditbook = {};
		creditbook.owner = await creditbookobj.getChainOwner();
		creditbook.currencytoken = await creditbookobj.getChainCurrencyToken();
		creditbook.title = await creditbookobj.getChainTitle();

	
		return creditbook;
	}

	// credit accounts
	async _getCreditBookObject(sessionuuid, walletuuid, carduuid, creditbookuuid) {
		if (!sessionuuid)
		return Promise.reject('session uuid is undefined');
	
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!creditbookuuid)
			return Promise.reject('credit book uuid is undefined');

		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
		
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);

		var creditbookdata = await this.readCreditBook(sessionuuid, walletuuid, creditbookuuid);

		if (!creditbookdata)
			return Promise.reject('could not find credit book for uuid ' + creditbookuuid);

		let currencyuuid = creditbookdata.currencyuuid;

		let currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);

		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		let cardchemeuuid = card.getSchemeUUID();
		let currencychemeuuid = currency.scheme_uuid;
		if (cardchemeuuid != currencychemeuuid)
			return Promise.reject('card' + carduuid + ' does not match currency ' + currencyuuid);

		// child session
		var childsession = await mvcpwa._getMonitoredCardSession(session, wallet, card);
	
	
		// get credit book on chain
		let data = {};
		data['address'] = creditbookdata.address;

		var creditbookobj = await this._createCreditBookObject(childsession, currency, data);
	
		return creditbookobj;
	}

	async createCreditAccount(sessionuuid, walletuuid, carduuid, creditbookuuid, accountdata, client_address, feelevel) {
		if (!sessionuuid)
		return Promise.reject('session uuid is undefined');
	
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!carduuid)
			return Promise.reject('card uuid is undefined');
		
		if (!creditbookuuid)
			return Promise.reject('credit book uuid is undefined');

		// get credit book on chain
		let creditbookobj = await this._getCreditBookObject(sessionuuid, walletuuid, carduuid, creditbookuuid);


		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
		
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);

		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		// child session corresponding to card to perform transaction
		var childsession = await mvcpwa._getMonitoredCardSession(session, wallet, card);

		var fromaccount = card._getSessionAccountObject();
		var from_card_scheme = card.getScheme();

		var ethereumnodeaccessmodule = global.getModuleObject('ethereum-node-access');

		var ethereumtransaction = ethereumnodeaccessmodule.getEthereumTransactionObject(childsession, fromaccount);
		
		// fee
		var fee = await _apicontrollers.createSchemeFee(from_card_scheme, feelevel);

		ethereumtransaction.setGas(fee.gaslimit);
		ethereumtransaction.setGasPrice(fee.gasPrice);

		// create account with crypted data
		let account_string = JSON.stringify(accountdata);
		let crypted_account_string = await mvcpwa.aesEncryptString(sessionuuid, walletuuid, carduuid, account_string);
		
		let res = await creditbookobj.createCreditAccount(crypted_account_string, client_address, ethereumtransaction);
	
	}

	async fetchCreditAccounts(sessionuuid, walletuuid, carduuid, creditbookuuid) {
		if (!sessionuuid)
		return Promise.reject('session uuid is undefined');
	
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!carduuid)
			return Promise.reject('card uuid is undefined');
		
		if (!creditbookuuid)
			return Promise.reject('credit book uuid is undefined');

		// get credit book on chain
		let creditbookobj = await this._getCreditBookObject(sessionuuid, walletuuid, carduuid, creditbookuuid);

		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();



		// get list of accounts
		let array = await creditbookobj.accounts();

		// decrypt the strings
		let accounts = [];

		for (var i = 0; i < (array ? array.length : 0); i++) {
			let account_string = await mvcpwa.aesDecryptString(sessionuuid, walletuuid, carduuid, array[i]);
			let account_data = {};

			try {
				account_data = JSON.parse(account_string);
			}
			catch(e) {
				account_data = {};
			}

			account_data.uuid = i;
			account_data.creditbookuuid = creditbookuuid;

			accounts.push(account_data);
		}

		return accounts;
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
