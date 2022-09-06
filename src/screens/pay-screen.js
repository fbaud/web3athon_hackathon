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

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		

		this.uuid = this.app.guid();

		this.widget_client_id = 'MyWidgetClient-' + this.uuid;

		this.currencyuuid = null;
	
		this.checking = false;

		this.bill_tx_hash = null;
		this.bill_web3_provider_url = null;

		this.pay_tx_hash = null;

		this.state = {
			instructions: 'Do you want to proceed?',
			canpaycredit: null,
			wantpaycredit: null,
			currentcard: null,
			current_scheme_name: 'unknown',
			widget_params: null
		};
	}
	
	componentDidUpdate(prevProps, prevState) {
		console.log('PayScreen.componentDidUpdate called');

		if (this.state.wantpaycredit != prevState.wantpaycredit) {
			this.buildWidgetParams();
		}
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

	async buildWidgetParams() {
		const {canpaycredit, wantpaycredit} = this.state;

		let currencyuuid = this.currencyuuid;
		let billpay_config = await this.getBillPayConfig(currencyuuid);

		// read parameters in the query string
		let queryparams = this._getQueryParameters();

		let web3_provider_url = (queryparams.web3url ? this.app.decodebase64(queryparams.web3url) : null);
		let tokenaddress = queryparams.tokenaddress;
		let amount = queryparams.amount;
		let to_address = queryparams.to;

		if ((canpaycredit === true) && (wantpaycredit === true)) {
			// we change the token address to use the credit token address
			let mvcmypwa = this.getMvcMyPWAObject();
			var mvcmycreditbook = this.getMvcMyCreditBookObject();
	
			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;
	
			let erc20credit = await mvcmycreditbook.findCreditToken(rootsessionuuid, walletuuid, currencyuuid, to_address).catch(err => {});

			tokenaddress = erc20credit.address;
		}

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

		this.setState({widget_params});

	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		var mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		this.checking = true;

		try {
			// check wallet is unlocked
			let unlocked = await this.app.checkWalletUnlocked()
			.catch(err => {
			});

			if (!unlocked) {
				let params = (app_nav_target ? app_nav_target.params : null);
				this.app.gotoRoute('login', params);
				return;
			}
			else {
				// check it is not the device wallet, because we need a safer wallet
				let isdevicewallet = await this.app.isDeviceWallet();
				
				if (isdevicewallet) {
					await this.app.resetWallet();
					
				let params = (app_nav_target ? app_nav_target.params : null);
				this.app.gotoRoute('login', params);
				return;
				}
			}

			
			if (app_nav_target && (app_nav_target.route == 'creditbook_pay') && (app_nav_target.reached == false)) {

				// mark target as reached
				app_nav_target.reached = true;
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
			let scheme = await mvcmypwa.findLocalSchemeInfoFromWeb3Url(rootsessionuuid, web3_provider_url, options)
			.catch(err => {
				console.log('error in PayScreen.checkNavigationState: ' + err);
			});

			if (!scheme) {
				// no scheme yet for this web3url, we build a local one
				scheme = await mvcmycreditbook.buildSchemeFromWeb3Url(rootsessionuuid, walletuuid, web3_provider_url, options);
			}

			// let's read the bill on the blockchain
						
			let dataobj = (this.bill_tx_hash ? await mvcmypwa.fetchTransaction(rootsessionuuid, walletuuid, scheme.uuid, this.bill_tx_hash).catch(err => {}) : null);

			// we also could check in the linker if the payment has not already been done
	
			// currency that is referenced
			let currencyuuid;

			let currencies = await mvcmypwa.getCurrenciesFromAddress(rootsessionuuid, walletuuid, scheme.uuid, tokenaddress);

			if (!currencies || (currencies.length == 0))
				return Promise.reject('could not find currency for ' + tokenaddress);
			else if (currencies.length > 1)
				console.log('Warning: more than one currency with address' + tokenaddress);

			currencyuuid = currencies[0].uuid;

			this.currencyuuid = currencyuuid;
						
			let current_scheme_name = await this.getCurrentSchemeName(currencyuuid);
			let canpaycredit = false;

			// get currency card for this currency
			let currentcard = await mvcmypwa.getCurrencyCard(rootsessionuuid, walletuuid, currencyuuid).catch(err=>{});

			// look if we have a credit card for this currency and this vendor
			let erc20credit = await mvcmycreditbook.findCreditToken(rootsessionuuid, walletuuid, currencyuuid, to_address).catch(err => {});

			if (erc20credit) {
				// display possibility to pay on credit
				canpaycredit = true;
			}


			if (canpaycredit === false){
				await this.buildWidgetParams();
			}

			this.setState({current_scheme_name, canpaycredit, currentcard});

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

	async reloadWidget() {
		// rebuild widget params which will lead to a re-render
		await this.buildWidgetParams();

		// change widget key to force remount
		let widgetkey = Date.now().toString(); 

		this.setState({widgetkey});
	}
	
	async onWidgetLoaded(ev) {
		console.log('onWidgetLoaded called');

		let mvcmypwa = this.getMvcMyPWAObject();
		var mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;


	
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

			// set card inside the widget
	
			const {currentcard} = this.state;

			// check if current card is set in the widget
			let widget_address = await widget_client.getCardAddress();
			let are_equal = await mvcmypwa.areAddressesEqual(rootsessionuuid, currentcard.address, widget_address);

			if (!are_equal) {
				// card does not exist, create it
				const card_private_key = await mvcmypwa.getCardPrivateKey(rootsessionuuid, walletuuid, currentcard.uuid);

				widget_address = await widget_client.doAddCard(currentcard.address, card_private_key);

				if (!widget_address)
					this.app.alert('could not add card to widget');

				//widget_address = await  widget_client.doChangeCurrentCard(currentcard.address);

				// provoke a reload
				await this.reloadWidget();

			}



		}
		catch(e) {
			console.log('exception in onWidgetLoaded: ' + e);
		}
	}

	async getCurrentSchemeName(currencyuuid) {
		let currency_conf =  await this.getBillPayConfig(currencyuuid);

		return currency_conf.scheme_name;
	}

	async getBillPayConfig(currencyuuid) {
		let _currencyuuid = (currencyuuid ? currencyuuid : (this.currencyuuid ? this.currencyuuid : null));
		// take currently selected currency if none passed


		// read json config file
		let json = await this.mvcmypwa.loadConfig('/bill-pay');

		this.bill_pay_config = json.currencies[_currencyuuid];


		// we fill buyer address
		let mvcmypwa = this.getMvcMyPWAObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let currencycard = await mvcmypwa.getCurrencyCard(rootsessionuuid, walletuuid, _currencyuuid).catch(err=>{});

		if (currencycard)
		this.bill_pay_config.widget_params.buyer_address = currencycard.address;

		return this.bill_pay_config;
	}

	async widget_on_pay(ev) {	
		console.log('WP - PayScreen.widget_on_pay called');

		// it is our widget firing this event
		try {
			let billpay_config = await this.getBillPayConfig();

			let mvcmypwa = this.getMvcMyPWAObject();
			var mvcmycreditbook = this.getMvcMyCreditBookObject();

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
					console.log('bill transaction hash is: ' + this.bill_tx_hash);
					console.log('payment transaction hash is: ' + tx_hash);
	
					// link transaction hash to bill hash
					let web3_provider_url = this.bill_web3_provider_url;
					let card_address = billpay_config.widget_params.buyer_address;
	
					// find a card with this address capable of transacting on this web3provider
					// whatever the exact scheme
					var current_card;
					var cards = await mvcmycreditbook.getCardListWithAddressOnWeb3Url(rootsessionuuid, walletuuid, web3_provider_url, card_address).catch(err => {});
	
					// we then pick the first card that is on a local scheme
					for (var i = 0; i < (cards ? cards.length : 0); i++) {
						var cardschemetype = await mvcmycreditbook.getCardSchemeType(rootsessionuuid, walletuuid, cards[i].uuid);
	
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
	
					let _feelevel = await mvcmypwa.getRecommendedFeeLevel(rootsessionuuid, walletuuid, current_card.uuid, tx_fee);
	
					let result = await mvcmycreditbook.storeLinkerValue(rootsessionuuid, walletuuid, current_card.uuid, linkercontractaddress, this.bill_tx_hash, tx_hash, _feelevel)
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
	
	async onChooseCash() {
		console.log('PayScreen.onChooseCash pressed!');

		this.setState({wantpaycredit: false});
	}

	async onChooseCredit() {
		console.log('PayScreen.onChooseCash pressed!');

		this.setState({wantpaycredit: true});
	}

	renderPayForm() {
		const {instructions, widgetkey, widget_params} = this.state;
		return (
			<div className="Container">
				<div className="Instructions">{instructions}</div>
				{(widget_params ?
				<MyWidget
					key={widgetkey}
					className={'MyWidgetContainer'}
					widget_client_id={this.widget_client_id}
					params = {widget_params}
				/>
				: <></>
				)}
				<div className="Dev-Info">{( this.app.exec_env === 'dev' ? 'Working on scheme ' + this.state.current_scheme_name : '')}</div>
			</div>
		);		
	}

	renderDataForm() {
		const {canpaycredit, wantpaycredit} = this.state;

		if ((canpaycredit === true) && (wantpaycredit === null)) {
			return (
				<div className="Container">
					<div className="Instructions">Do you want to pay with your credit?</div>
					<div>
						<span>
						<Button className={'PaymentMethod-Button'} onClick={this.onChooseCash.bind(this)} type="submit">
							Cash
						</Button>
						</span>
						<span>
						<Button className={'PaymentMethod-Button'} onClick={this.onChooseCredit.bind(this)} type="submit">
							Credit
						</Button>
						</span>

					</div>
					<div className="Dev-Info">{( this.app.exec_env === 'dev' ? 'Working on scheme ' + this.state.current_scheme_name : '')}</div>
	
				</div>
			);
		}
		else {
			// payment widget has been set
			return (
				<>
				{this.renderPayForm()}
				</>
			);
		}

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