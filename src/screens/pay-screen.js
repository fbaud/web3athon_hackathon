import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import { Button } from 'react-bootstrap';


//import {Header} from '@primusmoney/react_pwa';
import {Header} from '../nodemodules/@primusmoney/react_pwa';

import {MyWidget} from '@primusmoney/my_widget_react_client/react-js-ui';

class PayScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;
		this.getMvcMyQuoteObject = this.app.getMvcMyQuoteObject;
		
		this.uuid = this.app.guid();

		this.widget_client_id = 'MyWidgetClient-' + this.uuid;

		let widget_params = null;
	
		this.checking = false;

		this.bill_tx_hash = null;
		this.bill_web3_provider_url = null;

		this.pay_tx_hash = null;

		this.state = {
			instructions: 'Do you want to proceed?',
			current_scheme_name: 'unknown',
			widget_params
		};
	}
	
	getMvcMyPocs() {
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
	
		if (_GlobalClass) {
			var global = _GlobalClass.getGlobalObject();

			return global.getModuleObject('mvc-mypocs');
		}
		
	}
	

	componentDidUpdate(prevProps) {
		console.log('PayScreen.componentDidUpdate called');
	}

	componentDidMount() {
		console.log('PayScreen.componentDidMount called');

		// listen to widget event
		this.app.addWindowEventListener('mywidgetclient_on_widget_loaded', this.onWidgetLoaded.bind(this), this.uuid);
		this.app.addWindowEventListener('widget_on_pay', this.widget_on_pay.bind(this), this.uuid);

		this.checkNavigationState().catch(err => {console.log('error in PayScreen.checkNavigationState: ' + err);});
	}

	_getQueryParameters() {
		let queryparams = {};
		const URL = require("url");

		const current_url = window.location.href;

		let querystring = current_url.split('?')[1];
		let urlSearchParams = new URLSearchParams(querystring);
		let params = Object.fromEntries(urlSearchParams.entries());

		let b64url = params.b64url;
		
		if (b64url) {
			try {
				let _encodedurl = b64url;
				let _decoded_url = this.app.decodebase64(_encodedurl);

				querystring = _decoded_url.split('?')[1];
				urlSearchParams = new URLSearchParams(querystring);
				queryparams = Object.fromEntries(urlSearchParams.entries());

			}
			catch(e) {
				throw new Error('exception in App.gotoUrl: ' + e);
			}
		}
		else {
			// no encoding (e.g. for qr code short link)
			queryparams = params;
		}

		return queryparams;
	}

	async checkNavigationState() {
		this.checking = true;

		try {
			let mvcmyquote = this.getMvcMyQuoteObject();
			var mvcmypocs = this.getMvcMyPocs();
	
			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			// check wallet is unlocked
			let unlocked = await this.app.checkWalletUnlocked()
			.catch(err => {
			});

			if (!unlocked) {
				// we open the default device wallet
				let devicewallet = await this.app.openDeviceWallet()
				.catch(err => {
				});
	
				walletuuid = devicewallet.uuid;
			}
			
	
			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();

			// read parameters in the query string
			let queryparams = this._getQueryParameters();

			let web3_provider_url = (queryparams.web3url ? this.app.decodebase64(queryparams.web3url) : null);
			let tokenaddress = queryparams.tokenaddress;
			let amount = queryparams.amount;
			let to_address = queryparams.to;


			let callbackurl = (queryparams.callbackurl ? this.app.decodebase64(queryparams.callbackurl) : null);
			let returnurl = (queryparams.returnurl ? this.app.decodebase64(queryparams.returnurl) : null);
	
			// we stored the bill tx hash in invoiceid
			this.bill_tx_hash = queryparams.invoiceid;

			// get scheme
			this.bill_web3_provider_url = web3_provider_url;
			let options = {}; // no other requirement on ethnodeserverconfig
			let scheme = await mvcmyquote.findLocalSchemeInfoFromWeb3Url(rootsessionuuid, web3_provider_url, options)
			.catch(err => {
				console.log('error in PayScreen.checkNavigationState: ' + err);
			});

			if (!scheme) {
				// no scheme yet for this web3url, we build a local one
				scheme = await mvcmypocs.buildSchemeFromWeb3Url(rootsessionuuid, walletuuid, web3_provider_url, options);
			}

			// let's read the bill on the blockchain
						
			let dataobj = (this.bill_tx_hash ? await mvcmyquote.fetchTransaction(rootsessionuuid, walletuuid, scheme.uuid, this.bill_tx_hash).catch(err => {}) : null);

			// we also could check in the linker if the payment has not already been done
	
			let billpay_config = await this.getBillPayConfig();
			let current_scheme_name = await this.getCurrentSchemeName();

			// build our widget params for payment
			let widget_params = {};

			// from config
			widget_params.widget = 'pay';
			widget_params.widget_url = billpay_config.widget_params.widget_url;
			widget_params.client_id = billpay_config.widget_params.client_id;
			widget_params.client_key = billpay_config.widget_params.client_key;

			widget_params.remote_wallet_driver = billpay_config.widget_params.remote_wallet_driver;
			widget_params.remote_wallet_url = billpay_config.widget_params.remote_wallet_url;
			widget_params.remote_wallet_ring = billpay_config.widget_params.remote_wallet_ring;
			widget_params.local_wallet_hide = billpay_config.widget_params.local_wallet_hide;
			widget_params.explorer_url = billpay_config.widget_params.explorer_url;

			widget_params.default_gas_limit = billpay_config.widget_params.default_gas_limit;
			widget_params.default_gas_price = billpay_config.widget_params.default_gas_price;
			widget_params.avg_transaction_fee = billpay_config.widget_params.avg_transaction_fee;
			widget_params.transaction_units_min = billpay_config.widget_params.transaction_units_min;

			widget_params.strings = billpay_config.widget_params.strings;
	
			// dynamic
			widget_params.web3_provider_url = web3_provider_url;
			widget_params.tokenaddress = tokenaddress;
			widget_params.amount = amount;
			widget_params.to_address = to_address;

			this.setState({current_scheme_name, widget_params});

		}
		catch(e) {
			console.log('exception in PayScreen.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		

	}


	// end of life
	componentWillUnmount() {
		console.log('PayScreen.componentWillUnmount called');

		// unregister to window events
		this.app.removeWindowEventListener('mywidgetclient_on_widget_loaded', this.uuid);
		this.app.removeWindowEventListener('widget_on_pay', this.uuid);

	}



	
	async onWidgetLoaded(ev) {
		console.log('onWidgetLoaded called');
	
		try {
			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();
	
	
			let data = ev.detail;
			let widget_client_uuid = (data ? data.widget_client_uuid : null);
			let widget_client_name = (data ? data.widget_client_name : null);
	
			//let widget_client = my_widget_client.getWidgetObject(widget_client_uuid);
			let widget_client = my_widget_client.getWidgetObject(widget_client_name);
	
			let version_info = await widget_client.getWidgetVersionInfo();
	
			console.log('version info is: ' + JSON.stringify(version_info));
		}
		catch(e) {
			console.log('exception in onWidgetLoaded: ' + e);
		}
	}

	async getCurrentSchemeName() {
		let json = await this.mvcmyquote.loadConfig('/pocs/bill-pay');

		return json.current_scheme;
	}

	async getBillPayConfig() {
		let json = await this.mvcmyquote.loadConfig('/pocs/bill-pay');

		return json.schemes[json.current_scheme];
	}

	async widget_on_pay(ev) {	
		console.log('WP - PayScreen.widget_on_pay called');

		// it is our widget firing this event
		try {
			let billpay_config = await this.getBillPayConfig();

			let mvcmyquote = this.getMvcMyQuoteObject();
			var mvcmypocs = this.getMvcMyPocs();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();

			let widget_client = my_widget_client.getWidgetObject(this.widget_client_id);
	
			if (ev.detail && ev.detail.app_uuid && ( ev.detail.app_uuid == widget_client.app_uuid)) {
				// it is our widget firing this event

				let data = ev.detail;
		
				let tx_info = data.tx_info;
				let tx_hash = tx_info.hash;

				if (this.pay_tx_hash == tx_hash)
					return; // already processing
	
				if (tx_hash) {
					this.pay_tx_hash = tx_hash;
					this.setState({instructions: 'Payment has been sent'});
	
					// link transaction hash to bill hash
					let web3_provider_url = this.bill_web3_provider_url;
					let card_address = billpay_config.widget_params.buyer_address;
	
					// find a card with this address capable of transacting on this web3provider
					// whatever the exact scheme
					var current_card;
					var cards = await mvcmypocs.getCardListWithAddressOnWeb3Url(rootsessionuuid, walletuuid, web3_provider_url, card_address).catch(err => {});
	
					// we then pick the first card that is on a local scheme
					for (var i = 0; i < (cards ? cards.length : 0); i++) {
						var cardschemetype = await mvcmypocs.getCardSchemeType(rootsessionuuid, walletuuid, cards[i].uuid);
	
						if (cardschemetype === 0) {
							current_card = cards[i];
							break;
						}
					}
	
					if (!current_card) {
						this.app.alert('could not find a card with address ' + card_address + ' web3 provider ' + web3_provider_url);
						return;
					}
	
					let linker_config = billpay_config.linker;
					let linkercontractaddress = linker_config.address; // assume web3url is the same
	
					// compute necessary fee level for this scheme
					let tx_fee = {};
					tx_fee.transferred_credit_units = 0;
					let link_store_cost_units = (linker_config.store_cost_units ? parseInt(linker_config.store_cost_units) : 1);
					tx_fee.estimated_cost_units = link_store_cost_units;
	
					let _feelevel = await mvcmyquote.getRecommendedFeeLevel(rootsessionuuid, walletuuid, current_card.uuid, tx_fee);
	
					let result = await mvcmypocs.storeLinkerValue(rootsessionuuid, walletuuid, current_card.uuid, linkercontractaddress, this.bill_tx_hash, tx_hash, _feelevel)
					.catch(err => {
						this.app.error('error signaling payment: ' + err);
					});
	
					console.log('linker transaction hash is: ' + result);
	
	
					//
					// then wait for the payment transaction to be visible on the blockchain
					let _tx_info = await widget_client.fetchTransactionInfo(tx_hash);

					if (_tx_info) {
						if (!((_tx_info.status_int == 10) ||  (_tx_info.status_int == -10))) {
							// we wait until transaction is found on the blockchain
							let max_loops = 15; // 30 s
							let loop = 0;
							let lapse = 2000; // 2 s
							while((_tx_info && !((_tx_info.status_int == 10) ||  (_tx_info.status_int == -10)))) {
								await this.app.sleep(lapse);
		
								// fetch tx_info again
								_tx_info = await widget_client.fetchTransactionInfo(tx_hash);
		
								loop++;
								if (loop > max_loops) break;
							}
		
						}

						if (_tx_info.status_int == 10)
						this.setState({instructions: 'Payment has been done'});
						else if (_tx_info.status_int == -10)
						this.setState({instructions: 'Payment has failed'});
						else
						this.setState({instructions: 'Please refresh the widget to get the status'});
	
						// provoke a refresh
						widget_client.refreshWidget();
	
					}
	



				}
			}
	
		}
		catch(e) {
			console.log('exception in onWidgetLoaded: ' + e);
			this.app.error('exception in onWidgetLoaded: ' + e);
		}
	}
	
	async onSubmit() {
		console.log('PayScreen.onSubmit pressed!');

		let My_Widget_Client = require('@primusmoney/my_widget_react_client');
		let my_widget_client = My_Widget_Client.getObject();

 
		this.app.alert('Submit clicked');
	}

	renderDataForm() {
		return (
			<div className="Container">
				<div className="Instructions">{this.state.instructions}</div>
				{(this.state.widget_params ?
				<MyWidget
					className={'MyWidgetContainer'}
					widget_client_id={this.widget_client_id}
					params = {this.state.widget_params}
				/>
				: <></>
				)}
				<div className="Dev-Info">{( this.app.exec_env === 'dev' ? 'Working on scheme ' + this.state.current_scheme_name : '')}</div>
			</div>
		);		
	}
	
	render() {
		return (
			<div className="Screen">
				<Header app = {this.app}/>
				{this.renderDataForm()}
			</div>
		);
	}
	
	static getDerivedStateFromProps(nextProps, prevState) {
		// fill state
		return {
			rootsessionuuid: nextProps.rootsessionuuid,
		};
	}
}

// propTypes validation
PayScreen.propTypes = {
	app: PropTypes.object.isRequired,
	rootsessionuuid: PropTypes.string,
	currentwalletuuid: PropTypes.string,
};

//redux
const mapStateToProps = (state) => {
	return {
		rootsessionuuid: state.session.sessionuuid,
		currentwalletuuid: state.wallets.walletuuid,
	};
} 

const mapDispatchToProps = (dispatch) => {
	return {
	};
}


export {PayScreen};
export default connect(mapStateToProps, mapDispatchToProps)(PayScreen);