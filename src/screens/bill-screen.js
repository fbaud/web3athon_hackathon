import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import { Button, Dropdown, DropdownButton, FormGroup, FormControl, FormLabel, InputGroup } from 'react-bootstrap';

import '../css/poc.css';

//import {Header} from '@primusmoney/react_pwa';
import {Header} from '../nodemodules/@primusmoney/react_pwa';

import CurrencyInput from 'react-currency-input-field';

import {MyWidget} from '@primusmoney/my_widget_react_client/react-js-ui';



class BillScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		
		this.uuid = this.app.guid();

		//this.paybill_route = '#/paybill_pay';
		this.paybill_route = 'creditbookpay';
		this.paybill_path = ''; //'#/creditbook_pay';
			// path must be blank if we use route

		this.bill_pay_config = null;

		this.widget_client_id = 'MyWidgetClient-' + this.uuid;


		let widget_params = null;
	
		this.checking = false;

		this.billamount = '10';

		this.bill_tx_hash = null;

		this.state = {
			currency: {symbol: ''},
			currencies: [],
			symbol: '$',
			currentcard: null,
			canpay: false,
			instructions: 'Enter the amount to pay',
			current_scheme_name: 'unknown',
			widget_params,
			processing: false
		};
	}

	_setState(state) {
		if (this.closing !== true)
		this.setState(state);
	}

	// post render commit phase
	async _readVisibleCurrencies() {
		let mvcmypwa = this.getMvcMyPWAObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let currencies = await mvcmypwa.getCurrencies(rootsessionuuid, walletuuid);

		if (!currencies)
		return Promise.reject('could not get list of currencies');

		let arr = [];

		for (var i = 0; i < currencies.length; i++) {
			if (currencies[i].hidden && (currencies[i].hidden == true))
			continue;

			// check we have a currency card
			let currencycard = await mvcmypwa.getCurrencyCard(rootsessionuuid, walletuuid, currencies[i].uuid).catch(err=>{});

			if (currencycard)
			arr.push(currencies[i]);
		}

		return arr;
	}

	async _selectCurrency(currencyuuid) {
		let mvcmypwa = this.getMvcMyPWAObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;
		
		let currency = await mvcmypwa.getCurrencyFromUUID(rootsessionuuid, currencyuuid)
		.catch(err => {
			console.log('error in BillScreen._selectCurrency: ' + err);
		});		
		
		var card = await this.app.openCurrencyCard(currencyuuid);

		var currentcard = card;

		let billpay_config = await this.getBillPayConfig(currencyuuid);
		let current_scheme_name = await this.getCurrentSchemeName(currencyuuid);

		let currency_symbol = billpay_config.currency.symbol

		this._setState({current_scheme_name, symbol: currency_symbol, currency, currentcard});
	}

	componentDidUpdate(prevProps, prevState) {
		console.log('BillScreen.componentDidUpdate called');
		
		// selected a currency
		if (this.state.currency && this.state.currency.uuid && (this.state.currency.uuid != (prevState.currency ? prevState.currency.uuid : null))) {
			// we reset the current card
			let currentcard = null;
			let balance = '';

			const currency = this.state.currency;
			let currencyuuid = currency.uuid;

			this._selectCurrency(currencyuuid)			
			.catch(err => {
				this._setState({currentcard, balance})
			});

		}
	}

	componentDidMount() {
		console.log('BillScreen.componentDidMount called');
		
		// listen to widget event
		this.app.addWindowEventListener('mywidgetclient_on_widget_loaded', this.onWidgetLoaded.bind(this), this.uuid);

		this.checkNavigationState().catch(err => {console.log('error in BillScreen.checkNavigationState: ' + err);});

	}

	async getCurrentCurrencyUUID() {
		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		// TODO: find currency uuid from params
		let params = (app_nav_target ? app_nav_target.params : null);

		let json = await this.mvcmypwa.loadConfig('/bill-pay');

		return json.current_currency_uuid;
	}

	async getCurrentSchemeName(currencyuuid) {
		let currency_conf =  await this.getBillPayConfig(currencyuuid);

		return currency_conf.scheme_name;
	}

	async getBillPayConfig(currencyuuid) {
		let _currencyuuid = (currencyuuid ? currencyuuid : (this.state.currency ? this.state.currency.uuid : null));
		// take currently selected currency if none passed

		// read json config file
		let json = await this.mvcmypwa.loadConfig('/bill-pay');

		this.bill_pay_config = json.currencies[_currencyuuid];

		// we fill vendor address
		let mvcmypwa = this.getMvcMyPWAObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let currencycard = await mvcmypwa.getCurrencyCard(rootsessionuuid, walletuuid, _currencyuuid).catch(err=>{});

		if (currencycard)
		this.bill_pay_config.widget_params.vendor_address = currencycard.address;

		return this.bill_pay_config;
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();

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

			// list of currencies
			var currencies = await this._readVisibleCurrencies()
			.catch(err => {
				console.log('error in CreditBookCreateForm.checkNavigationState ' + err);
			});

			// potentially filter currencies
			var enabled_currencies = currencies;


			this.setState({currencies: enabled_currencies});
	
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
		console.log('BillScreen.componentWillUnmount called');

		// unregister to window events
		this.app.removeWindowEventListener('mywidgetclient_on_widget_loaded', this.uuid);

	}
	
	
	async onWidgetLoaded(ev) {
		console.log('onWidgetLoaded called');
	
		try {
			let billpay_config = await this.getBillPayConfig();

			let mvcmypwa = this.getMvcMyPWAObject();
			var mvcmycreditbook = this.getMvcMyCreditBookObject();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();
	
	
			let data = ev.detail;
			let widget_client_uuid = (data ? data.widget_client_uuid : null);
			let widget_client_name = (data ? data.widget_client_name : null);
	

			//let widget_client = my_widget_client.getWidgetObject(widget_client_uuid);
			let widget_client = my_widget_client.getWidgetObject(widget_client_name);
	
			let version_info = await widget_client.getWidgetVersionInfo();
	
			console.log('version info is: ' + JSON.stringify(version_info));

			// forcing display of qr code on mobile
  			widget_client.setStartConditionsParameter('qrcode_on_mobile', true);
			widget_client.sendRequest({action: 'switchTo', widget: 'payment-qrcode'});



			// we keep asking the linker contract if a transaction hash has been linked to our bill hash
			let web3_provider_url = billpay_config.widget_params.web3_provider_url;
			let linkercontractaddress = billpay_config.linker.address;
			let tx_hash = await mvcmycreditbook.retrieveLinkerValue(rootsessionuuid, linkercontractaddress, web3_provider_url, this.bill_tx_hash);

			let max_loops = 120; // 120 loops = 4 minutes
			let loop = 0;
			let lapse = 2000; // 2 s

			while(!tx_hash) {
				await this.app.sleep(lapse); // wait 2 s

				// ask order
				tx_hash = await mvcmycreditbook.retrieveLinkerValue(rootsessionuuid, linkercontractaddress, web3_provider_url, this.bill_tx_hash);

				loop++;
				if (loop > max_loops) break;
			}

			if (tx_hash) {
				this.setState({instructions: 'Payment has been submitted'});

				widget_client.setTransactionHash(tx_hash);

				let tx_info = await widget_client.fetchTransactionInfo(tx_hash);

				if ((tx_info && !((tx_info.status_int == 10) ||  (tx_info.status_int == -10)))) {
					// we wait until transaction is found on the blockchain
					max_loops = 15; // 30 s
					loop = 0;
					lapse = 2000; // 2 s
					while((tx_info && !((tx_info.status_int == 10) ||  (tx_info.status_int == -10)))) {
						await this.app.sleep(lapse);

						// fetch tx_info
						tx_info = await widget_client.fetchTransactionInfo(tx_hash);

						loop++;
						if (loop > max_loops) break;
					}

					// provoke a refresh
					widget_client.refreshWidget();

					this.setState({instructions: 'You have been paid'});

				}
			}
			else {
				this.app.alert("time has elapsed, this device can not wait longer for payment status");
			}
			

		}
		catch(e) {
			console.log('exception in onWidgetLoaded: ' + e);
			this.app.error('exception in onWidgetLoaded: ' + e);
		}
	}

	// user actions
	async onSelectCurrency(uuid) {
		var {currencies} = this.state;
		var currency;

		for (var i = 0; i < currencies.length; i++) {
			if (uuid === currencies[i].uuid) {
				currency = currencies[i];
				break;
			}
		}

		if (currency)
		this._setState({currency});
	}



	async onAmountChange(value, name) {
		let amount = value;

		if (isNaN(amount))
		return;

		let amount_float = parseFloat(amount);
		let amount_decimals = 2;

		this.billamount = amount_float.toFixed(amount_decimals);;
	}
	
	async onSubmit() {
		console.log('BillScreen.onSubmit pressed!');

		this._setState({processing: true});

 
		try {
			let mvcmypwa = this.getMvcMyPWAObject();
			var mvcmycreditbook = this.getMvcMyCreditBookObject();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			const {currentcard, currency} = this.state;

			let currencyuuid = currency.uuid;

			if (!currencyuuid) {
				this.app.alert('you must select a currency first');
				this._setState({processing: false});
				return;
			}

			if (!currentcard) {
				this.app.alert('no currency card selected for corresponding currency');
				this._setState({processing: false});
				return;
			}

			let current_card = currentcard;

			let billpay_config = await this.getBillPayConfig(currencyuuid);

			let web3_provider_url = billpay_config.widget_params.web3_provider_url;


			// we register this bill as a transaction
			let web3url = web3_provider_url;
			let to = current_card.address;
			let tokenaddress = billpay_config.widget_params.tokenaddress;
			let amount = this.billamount;

			let assignto = current_card.address; // not really used here
			let dataobj = {web3url, to, tokenaddress, amount};

			// check we have enough transaction credits
			let tx_fee = {};
			tx_fee.transferred_credit_units = 0;
			let create_account_cost_units = 55;
			tx_fee.estimated_cost_units = create_account_cost_units;

			// need a higher feelevel than standard this.app.getCurrencyFeeLevel(currencyuuuid)
			let _feelevel = await mvcmypwa.getRecommendedFeeLevel(rootsessionuuid, walletuuid, current_card.uuid, tx_fee);

			var canspend = await mvcmypwa.canCompleteTransaction(rootsessionuuid, walletuuid, current_card.uuid, tx_fee, _feelevel).catch(err => {});
	
			if (!canspend) {
				if (tx_fee.estimated_fee.execution_credits > tx_fee.estimated_fee.max_credits) {
					this.app.alert('The execution of this transaction is too large: ' + tx_fee.estimated_fee.execution_units + ' credit units.');
					this._setState({processing: false});
					return;
				}
				else {
					this.app.alert('You must add transaction units to the source card. You need at least ' + tx_fee.required_units + ' credit units.');
					this._setState({processing: false});
					return;
				}
			}
			

			var tx_hash = await mvcmypwa.registerTransaction(rootsessionuuid, walletuuid, current_card.uuid, dataobj, assignto, _feelevel);
			this.bill_tx_hash = tx_hash;

			// create widget to display the QR Code
			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();
	
			let _payurl = await this.app.getCleanUrl();
			_payurl += this.paybill_path;

			let _payroute = this.paybill_route;

			let widget_params = {};

			// from config
			widget_params.widget = 'payment-qrcode';
			widget_params.widget_url = billpay_config.widget_params.widget_url;
			widget_params.client_id = billpay_config.widget_params.client_id;
			widget_params.client_key = billpay_config.widget_params.client_key;
			widget_params.remote_wallet_driver = billpay_config.widget_params.remote_wallet_driver;
			widget_params.remote_wallet_url = _payurl;
			widget_params.remote_wallet_route = _payroute;
			widget_params.remote_wallet_ring = billpay_config.widget_params.remote_wallet_ring;
			widget_params.local_wallet_hide = billpay_config.widget_params.local_wallet_hide;
			widget_params.web3_provider_url = billpay_config.widget_params.web3_provider_url;
			widget_params.explorer_url = billpay_config.widget_params.explorer_url;
			widget_params.chainid = billpay_config.widget_params.chainid;
			widget_params.networkid = billpay_config.widget_params.networkid;
			widget_params.tokenaddress = billpay_config.widget_params.tokenaddress;

			widget_params.default_gas_limit = billpay_config.widget_params.default_gas_limit;
			widget_params.default_gas_price = billpay_config.widget_params.default_gas_price;
			widget_params.avg_transaction_fee = billpay_config.widget_params.avg_transaction_fee;
			widget_params.transaction_units_min = billpay_config.widget_params.transaction_units_min;

			widget_params.strings = billpay_config.widget_params.strings;
		
			// dynamic
			widget_params.string_amount = this.billamount;

			widget_params.to_address = billpay_config.widget_params.vendor_address;

			widget_params.invoice_id = tx_hash;


			this.setState({widget_params, canpay: true, instructions: 'Present this QRCode to the payer'});

			this._setState({processing: false});
	
			return true;
	
		}
		catch(e) {
			console.log('exception in BillScreen.onSubmit: '+ e);
			this.app.error('exception in BillScreen.onSubmit: '+ e);

			this._setState({processing: false});
		}


		return false;
	}

	renderBill() {
		return (
			<div className="Container">
				<div className="Instructions">{this.state.instructions}</div>
				<div className="Instructions">{this.billamount} {this.state.symbol}</div>
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

	renderDataForm() {
		const {currency, currencies} = this.state;
		return (
			<div className="Container">
				<div className="Instructions">{this.state.instructions}</div>
				<FormGroup controlId="currency">
					<FormLabel>Currency</FormLabel>
					<FormGroup className="DeedCurrencyPickLine" controlId="pickccy">
						<InputGroup>
							<FormControl  className="DeedCurrencyName"
								autoFocus
								type="text"
								value={(currency ? currency.symbol : '')}
								onChange={e => this.onChangeCurrency(e)}
							/>
							<DropdownButton
								id="input-dropdown-addon"
								title="Cur."
								onSelect={e => this.onSelectCurrency(e)}
							>
								{currencies.map((item, index) => (
									<Dropdown.Item key={item.uuid} eventKey={item.uuid} value={item.uuid}>{item.symbol}</Dropdown.Item>
								))}
							</DropdownButton>
						</InputGroup>
					</FormGroup>
				</FormGroup>


				<CurrencyInput
					className={'Currency-Amount-Input'}
					id="bill-amount"
					name="bill-amount"
					placeholder="Please enter the amount"
					defaultValue={this.billamount}
					decimalsLimit={2}
					prefix={this.state.symbol + ' '}
					onValueChange={this.onAmountChange.bind(this)}
				/>
				<div>
					<Button className={'Bill-Button'} onClick={this.onSubmit.bind(this)} type="submit">
						Bill
					</Button>
				</div>
				<div className="Dev-Info">{( this.app.exec_env === 'dev' ? 'Working on scheme ' + this.state.current_scheme_name : '')}</div>

			</div>
		);
	}
	
	render() {
		return (
			<div className="Screen">
				<Header app = {this.app}/>
				{(this.state.canpay ? this.renderBill() : this.renderDataForm())}
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
BillScreen.propTypes = {
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


export {BillScreen};
export default connect(mapStateToProps, mapDispatchToProps)(BillScreen);