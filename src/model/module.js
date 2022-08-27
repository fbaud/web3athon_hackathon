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
	// credit books
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
		
		let txhash = await creditbookobj.createAccount(crypted_account_string, client_address, ethereumtransaction);

		if (txhash) {
			accountdata.txhash = txhash;
		}
	
		return txhash;
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

	async _findCreditAccount(sessionuuid, walletuuid, carduuid, creditbookuuid, client_addr) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		let accounts = await this.fetchCreditAccounts(sessionuuid, walletuuid, carduuid, creditbookuuid);

		for (var i = 0; i < (accounts ? accounts.length : 0); i++) {
			let are_equal = await mvcpwa.areAddressesEqual(sessionuuid, accounts[i].address, client_addr);
			if (are_equal)
				return accounts[i];
		}
	}

	async fetchCreditAccount(sessionuuid, walletuuid, carduuid, creditbookuuid, client_addr) {
		if (!sessionuuid)
		return Promise.reject('session uuid is undefined');
	
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!carduuid)
			return Promise.reject('card uuid is undefined');
		
		if (!creditbookuuid)
			return Promise.reject('credit book uuid is undefined');

		// get local account info
		let accountinfo = await this._findCreditAccount(sessionuuid, walletuuid, carduuid, creditbookuuid, client_addr);
		let accountname = (accountinfo ? accountinfo.name : 'unknown');

		// get credit book on chain
		let creditbookobj = await this._getCreditBookObject(sessionuuid, walletuuid, carduuid, creditbookuuid);

		let account = {address: client_addr, name: accountname};
		let limit_str = await creditbookobj.creditlimitOf(client_addr);
		let balance_str = await creditbookobj.balanceOf(client_addr);
		
		account.limit_string = limit_str;
		account.limit = parseInt(limit_str);
		account.balance_string = balance_str;
		account.balance = parseInt(balance_str);
		account.credittoken = await creditbookobj.creditToken(client_addr);

		return account;
	}

	async registerCreditAccountLimit(sessionuuid, walletuuid, carduuid, creditbookuuid, client_addr, new_limit, feelevel) {
		if (!sessionuuid)
		return Promise.reject('session uuid is undefined');
	
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!carduuid)
			return Promise.reject('card uuid is undefined');
		
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
	
		var card = await wallet.getCardFromUUID(carduuid);

		if (!card)
			return Promise.reject('could not find card ' + carduuid);

		// get credit book on chain
		let creditbookobj = await this._getCreditBookObject(sessionuuid, walletuuid, carduuid, creditbookuuid);

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

		let txhash = await creditbookobj.updateCreditLimit(client_addr, new_limit, ethereumtransaction);

		return txhash;
	}


	//
	// credit cards
	//
	async readCreditCards(sessionuuid, walletuuid) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);

		if (!walletuuid) {
			var keys = ['mypwa', 'creditcards']; 
			// shared keys
		}
		else {
			console.log('WARNING: walletuuid specific case not implemented!!!');
			var keys = ['mypwa', 'creditcards']; 
			// shared keys, also we could look in wallet
			// with mvcmodule.getFromWallet
		}
	
		let creditcard_list = await mvcpwa._readClientSideJson(session, keys);

		if (!creditcard_list)
		creditcard_list = [];

		return creditcard_list;
	}

	async saveCreditCard(sessionuuid, walletuuid, creditcard) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var creditcard_list = await this.readCreditCards(sessionuuid, walletuuid);

		// look not in list
		var bInList = false;

		for (var i = 0; i < creditcard_list.length; i++) {
			if (creditcard_list[i].uuid == creditcard.uuid) {
				bInList = true;
				break;
			}
		}

		if (!bInList) {
			var session = await _apicontrollers.getSessionObject(sessionuuid);
		
			if (!session)
				return Promise.reject('could not find session ' + sessionuuid);

			// creditcard parameters to be saved
			var {uuid, currencyuuid, carduuid, credittotken} = creditcard;
	
			if (!walletuuid) {
				var keys = ['mypwa', 'creditcards']; 
				// shared keys
			}
			else {
				console.log('WARNING: walletuuid specific case not implemented!!!');
				var keys = ['mypwa', 'creditcards']; 
				// shared keys, also we could put in wallet
				// with mvcmodule.putInWallet			
			}
		
			var localjson = {uuid, currencyuuid, carduuid, credittotken};

			localjson.savetime = Date.now();

			creditcard_list.push(localjson);
	
			var mvcpwa = this._getMvcPWAObject();
			return mvcpwa._saveClientSideJson(session, keys, creditcard_list);
		}
		else {
			return creditcard_list;
		}
	}

	async readCreditCard(sessionuuid, walletuuid, creditcarduuid) {
		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
		
		if (!walletuuid)
			return Promise.reject('wallet uuid is undefined');

		if (!creditcarduuid)
			return Promise.reject('credit card uuid is undefined');

		let creditcards = await this.readCreditCards(sessionuuid, walletuuid);

		for (var i = 0; i < (creditcards ? creditcards.length : 0); i++) {
			if (creditcards[i].uuid == creditcarduuid)
				return creditcards[i];
		}
		
	}

	async _createERC20CreditObject(session, data) {
		// for local contract objects (before deployment)
		var global = this.global;
		var creditbookmodule = global.getModuleObject('creditbook');

		var erc20credit = await creditbookmodule.createERC20CreditObject(session, data);

		return erc20credit;
	}

	async fetchCreditToken(sessionuuid, walletuuid, currencyuuid, credittoken_addr) {
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

		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
	
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);
	
		var currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);
	
		// get a child session on correct scheme
		var currencyscheme = await mvcpwa._getCurrencyScheme(session, currency);
		var childsession = await mvcpwa._getMonitoredSchemeSession(session, wallet, currencyscheme);
	
		// get erc20 credit on chain
		let data = {address: credittoken_addr}
		let erc20creditobj = await this._createERC20CreditObject(childsession, data);

		let erc20credit = {address: credittoken_addr};

		// fetch corresponding credit book
		let creditbook_addr = await erc20creditobj.getChainCreditBook();
		
		data = {address: creditbook_addr};
		let creditbookobj = await this._createCreditBookObject(childsession, currency, data);
		
		let owner = await creditbookobj.getChainOwner();
		let title = await creditbookobj.getChainTitle();

		erc20credit.creditbook = creditbook_addr;
		erc20credit.creditor = owner;
		erc20credit.description = title;

		return erc20credit;
	}

	async fetchCreditLimit(sessionuuid, walletuuid, currencyuuid, credittoken_addr, client_addr) {
		// !!! as a privacy measure, you need to provide the client address to get the limit

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

		var wallet = await _apicontrollers.getWalletFromUUID(session, walletuuid);
	
		if (!wallet)
			return Promise.reject('could not find wallet ' + walletuuid);
	
		var currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);

		// get erc20 credit on chain
		let erc20credit = await this.fetchCreditToken(sessionuuid, walletuuid, currencyuuid, credittoken_addr);

		let creditbook_addr = erc20credit.creditbook;


		// get a child session on correct scheme
		var currencyscheme = await mvcpwa._getCurrencyScheme(session, currency);
		var childsession = await mvcpwa._getMonitoredSchemeSession(session, wallet, currencyscheme);

		let data = {address: creditbook_addr};
		let creditbookobj = await this._createCreditBookObject(childsession, currency, data);

		let limit_string = await creditbookobj.creditlimitOf(client_addr);
		let limit_int = parseInt(limit_string);

		return limit_int;
	}

	// credit currency
	async _getCurrencyFromAddress(session, wallet, scheme, credittoken_addr) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();
		var mvccurrenciesmodule = global.getModuleObject('mvc-currencies');

		var sessionuuid = session.getSessionUUID();
		var schemeuuid = scheme.getSchemeUUID();
		
		// check if we have already added it
		var currencies = await mvccurrenciesmodule.getCurrencies(sessionuuid); // all currencies

		for (var i = 0; i < currencies.length; i++) {
			if (currencies[i].scheme_uuid != schemeuuid)
				continue;

			let are_equal = await mvcpwa.areAddressesEqual(sessionuuid, currencies[i].address, credittoken_addr);
			if (are_equal)
				return currencies[i];
		}

		// add a currency on the fly
		var childsession = await mvcpwa._getMonitoredSchemeSession(session, wallet, scheme);
	
		// get token object to access erc20 data
		let data = {address: credittoken_addr}

		var erc20credittokenobject = await scheme.getTokenObject(credittoken_addr);

		// initialize
		erc20credittokenobject._getERC20TokenContract(session);

		// synchronize
		const Token = global.getModuleClass('wallet', 'Token');
		await Token.synchronizeERC20TokenContract(session, erc20credittokenobject);

		// structure
		var credit_currency = {};

		credit_currency.uuid = session.guid();

		credit_currency.name = "credit - " + erc20credittokenobject.getName();
		credit_currency.symbol = erc20credittokenobject.getSymbol();
		credit_currency.decimals = erc20credittokenobject.getDecimals();
		credit_currency.address = credittoken_addr;
		credit_currency.web3providerurl = scheme.getWeb3ProviderUrl();
		credit_currency.scheme_uuid = schemeuuid;
		credit_currency.ops = {canpay: true, cantopup: false, canswap: false};

		credit_currency.hidden = false;
		credit_currency.temporary = true;

		// add to list of currencies
		var currenciesmodule = global.getModuleObject('currencies');
		currenciesmodule.addCurrency(credit_currency);

		return credit_currency;
	}


	async _createCurrencyCreditCard(session, wallet, card, credittoken_addr) {
		var card_scheme = card.scheme

		// get a credit currency for credittoken_addr
		var credit_currency = await this._getCurrencyFromAddress(session, wallet, card_scheme, credittoken_addr);
		var creditcard_currencyuuid = credit_currency.uuid;


		// look if we have not cloned the card already
		var cards = await wallet.getCardList(true);
		var carduuid = card.getCardUUID();

		for (var i = 0; i < cards.length; i++) {
			let xtradata = cards[i].getXtraData('myquote');

			if (xtradata && xtradata.creditfacility 
			&& (xtradata.creditfacility.oncard == carduuid)
			&& (xtradata.creditfacility.credittoken == credittoken_addr)) {
				// reuse card associating to new credit currency
				xtradata.currencyuuid = creditcard_currencyuuid;

				return cards[i];
			}
		}

		// we clone card on same scheme

		var islocked = card.isLocked();

		if (islocked) {
			// unlock for cloning
			await card.unlock();
		}

		var clonedcard = await wallet.cloneCard(card, card_scheme);

		if (islocked) {
			// relock
			card.lock();
		}


		// set it's associated to credit_currency in XtraData
		let cloned_xtradata = clonedcard.getXtraData('myquote');

		cloned_xtradata = (cloned_xtradata ? cloned_xtradata : {});
		cloned_xtradata.currencyuuid = creditcard_currencyuuid;

		// save xtradata on creditfacility to re-use card
		cloned_xtradata.creditfacility = {oncard: card.getCardUUID(), credittoken: credittoken_addr};

		clonedcard.putXtraData('myquote', cloned_xtradata);

		if (clonedcard.isLocked()) {
			await clonedcard.unlock();
		}

		await clonedcard.save();
				

		return clonedcard;
	}

	async getCurrencyCreditCard(sessionuuid, walletuuid, carduuid, credittoken_addr) {
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

		// get credit card object			
		var credit_card = await this._createCurrencyCreditCard(session, wallet, card, credittoken_addr)

		var mvcclientwalletmodule = global.getModuleObject('mvc-client-wallet');
		var creditcard_info = await mvcclientwalletmodule.getCardInfo(sessionuuid, walletuuid, carduuid)

		creditcard_info.currencyuuid = credit_card.getXtraData('myquote').currencyuuid;

		return creditcard_info;
	}


	//
	// utils
	//


	async _fitAmountString(session, amount_string, decimals, options) {
		if (amount_string === undefined)
			return;
		
		var _inputamountstring = amount_string;
		var amountstring;

		if (_inputamountstring.includes(".")) {
			const parts = _inputamountstring.split('.');

			// integer part
			var integerpart = parts[0];
			var decimalpart;

			if (parts[1].length > decimals)
				decimalpart = parts[1].substring(decimals); // cut
			else {
				decimalpart = parts[1]; // fill if necessary
				for (var i = 0; i < (decimals -parts[1].length) ; i++) decimalpart += '0';
			}

			amountstring = integerpart + '.' + decimalpart;
		}
		else {
			if (_inputamountstring.length > decimals) {
				// integer part
				var integerpart = _inputamountstring.substring(0, _inputamountstring.length - decimals);
				var decimalpart = _inputamountstring.substring(_inputamountstring.length - decimals);
	
				amountstring = integerpart + '.' + decimalpart;
			}
			else {
				var leading = '';
				for (var i = 0; i < (decimals -_inputamountstring.length) ; i++) leading += '0';
				amountstring = '0.' + leading + _inputamountstring;
			}
		}
		


		if (options) {
			if (typeof options.showdecimals !== 'undefined') {
				if (options.showdecimals === false) {
					// we remove . and after
					amountstring = amountstring.substring(0, amountstring.indexOf('.'));
				}
				else {
					var decimalsshown = (options.decimalsshown ? options.decimalsshown : decimals);
					amountstring = amountstring.substring(0, amountstring.indexOf('.') + 1 + decimalsshown);
				}

			}
		}

		return amountstring;
	}
	

	async _formatMonetaryAmountString(session, amount_string, symbol, decimals, options) {
		var amountstring = await this._fitAmountString(session, amount_string, decimals, options);
		
		return amountstring + ' ' + symbol;
	}

	async _formatCurrencyIntAmount(sessionuuid, currencyuuid, amount_int, options) {
		// because of issues with double points when formatting  
		// with mvccurrencies formatCurrencyAmount (e.g. 0.30.10) from integer

		if (!sessionuuid)
			return Promise.reject('session uuid is undefined');
	
		if (!currencyuuid)
			return Promise.reject('currency uuid is undefined');
		
	
		
		var global = this.global;
		var _apicontrollers = this._getClientAPI();
		var mvcpwa = this._getMvcPWAObject();

		var session = await _apicontrollers.getSessionObject(sessionuuid);
		
		if (!session)
			return Promise.reject('could not find session ' + sessionuuid);
		
		var currency = await mvcpwa.getCurrencyFromUUID(sessionuuid, currencyuuid);

		if (!currency)
			return Promise.reject('could not find currency ' + currencyuuid);

		var currency_amount = await mvcpwa.getCurrencyAmount(sessionuuid, currency.uuid, amount_int);
		var tokenamountstring = await currency_amount.toString();

		//var currency_amount_string = await mvcpwa.formatCurrencyAmount(sessionuuid, currency.uuid, currency_amount, options);
		var _options = (options ? options : {showdecimals: true, decimalsshown: 2});
		
		var tokenamountstring = await currency_amount.toString(); 
		// !!! faulty because of _formatAmount (see above)
		
		var currencyamountstring = await this._formatMonetaryAmountString(session, tokenamountstring, currency.symbol, currency.decimals, _options);


		return currencyamountstring;
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
