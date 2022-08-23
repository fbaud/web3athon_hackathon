'use strict';

var ERC20CreditLocalPersistor = class {
	
	constructor(session, contractuuid) {
		this.session = session;
		this.contractuuid = contractuuid;
		
		this.commonmodule = this.session.getGlobalObject().getModuleObject('common');
	}
	
	saveERC20CreditJson(creditbook, callback) {
		var session = this.session;
		var keys = ['contracts'];
		
		var uuid = creditbook.getUUID();
		var json = creditbook.getLocalJson();
		
		console.log('ERC20CreditLocalPersistor.saveERC20CreditJson json to save is ' + JSON.stringify(json));
		
		// update cache
		var commonmodule = this.commonmodule;
		
		var jsonleaf = commonmodule.getLocalJsonLeaf(session, keys, uuid);
		if (jsonleaf) {
			commonmodule.updateLocalJsonLeaf(session, keys, uuid, json);
		}
		else {
			commonmodule.insertLocalJsonLeaf(session, keys, null, null, json);
		}
		
		// save contracts
		var contractsjson = commonmodule.readLocalJson(session, keys); // from cache, since no refresh
		
		commonmodule.saveLocalJson(session, keys, contractsjson, callback);
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


_GlobalClass.registerModuleClass('creditbook', 'ERC20CreditLocalPersistor', ERC20CreditLocalPersistor);
