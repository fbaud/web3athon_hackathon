import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button, Dropdown, DropdownButton, FormGroup, FormControl, FormLabel, InputGroup} from 'react-bootstrap';

import PropTypes from 'prop-types';

//import {CurrencyCardIcon} from '@primusmoney/react_pwa';
import {CurrencyCardIcon} from '../nodemodules/@primusmoney/react_pwa';

class CreditCardCreateForm extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.uuid = this.app.guid();

		this.closing = false;


		let currency = {symbol: ''};
		let currencies= [];
		let signingkey = null;
		let currentcard = null;
		let balance = '';

		let credittoken_address = null;

		let new_limit = null;
		
		
		this.state = {
				currency,
				currencies,
				signingkey,
				currentcard,
				balance,
				credittoken_address,
				message_text: 'loading...',
				processing: false
		}
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

			arr.push(currencies[i]);
		}

		return arr;
	}

	componentDidUpdate(prevProps, prevState) {
		//console.log('CreditCardCreateForm.componentDidUpdate called');
		
		let mvcmypwa = this.getMvcMyPWAObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;
		

		// entered a private key
		if (this.state.signingkey != prevState.signingkey) {
			const {currency} = this.state;

			if ( (currency) && (currency.uuid)) {
				let currentcard = null;
				let balance = '';
				
				let currencyuuid = currency.uuid;

				this.app.createCurrencyCard(currencyuuid, this.state.signingkey, {maincard: true})
				.then(card => {
					currentcard = card;

					return mvcmypwa.getCurrencyPosition(rootsessionuuid, walletuuid, currencyuuid)
				})
				.then((pos) => {
					return mvcmypwa.formatCurrencyAmount(rootsessionuuid, currencyuuid, pos);
				})
				.then((balance) => {
					this._setState({currentcard, balance});
				})
				.catch(err => {
					this._setState({currentcard, balance})
				});
			}
		}

		// selected a currency
		if (this.state.currency && this.state.currency.uuid && (this.state.currency.uuid != (prevState.currency ? prevState.currency.uuid : null))) {
			// we reset the current card
			let currentcard = null;
			let balance = '';

			const currency = this.state.currency;
			let currencyuuid = currency.uuid;

			this.app.openCurrencyCard(currencyuuid)
			.then(card => {
				if (!card)
					throw 'no current card';

				currentcard = card;

				return mvcmypwa.getCurrencyPosition(rootsessionuuid, walletuuid, currencyuuid);
			})
			.then((pos) => {
				return mvcmypwa.formatCurrencyAmount(rootsessionuuid, currencyuuid, pos);
			})
			.then((balance) => {
				this._setState({currentcard, balance});
			})			
			.catch(err => {
				this._setState({currentcard, balance})
			});

		}
	}
	
	componentDidMount() {
		console.log('CreditCardCreateForm.componentDidMount called');
		
		let mvcmypwa = this.getMvcMyPWAObject();

		let message_text = mvcmypwa.t(
			'You can raise or lower credit for this account. \
			 The balance will be adapted accordingly. \
             Note that if lowering the credit limit to zero \
			 corresponds to closing the account.');
	
		
		this.setState({message_text});

		this.checkNavigationState().catch(err => {console.log('error in CreditCardCreateForm.checkNavigationState: ' + err);});
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		let mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

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


		this._setState({currencies: enabled_currencies});
		

		if (app_nav_target && (app_nav_target.route == 'creditcard') && (app_nav_target.reached == false)) {

			// mark target as reached
			app_nav_target.reached = true;
		}
	}

	// end of life
	componentWillUnmount() {
		console.log('CreditCardCreateForm.componentWillUnmount called');
		
		this.closing = true;
	}


	
	// user actions
	async onSubmit() {
		console.log('onSubmit pressed!');

		let mvcmypwa = this.getMvcMyPWAObject();
		let mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;
		
		let wallet;
		let carduuid;
		let card;

		this._setState({processing: true});

		try {
			let {currentcard, currency, credittoken_address} = this.state;


			// fetch erc20 credit
			let erc20credit = await mvcmycreditbook.fetchCreditToken(rootsessionuuid, walletuuid, currency.uuid, credittoken_address);

			// save credit card locally
			let creditcard = {};
			creditcard.uuid = this.app.guid();
			creditcard.currencyuuid = currency.uuid;
			creditcard.carduuid = currentcard.uuid;
			creditcard.credittotken = credittoken_address;

			await mvcmycreditbook.saveCreditCard(rootsessionuuid, walletuuid, creditcard);


			// goto credit card list to let time for new account to be updated
			let params = {action: 'view'};

			this.app.gotoRoute('creditcards', params);
	

			this._setState({processing: false});
	
			return true;
		}
		catch(e) {
			console.log('exception in onSubmit: ' + e);
			this.app.error('exception in onSubmit: ' + e);

			this.app.alert('could not associate credit facility');

			this._setState({processing: false});
		}


		return false;
	}

	async onChangeCurrency(e) {
		var cur = e.target.value;

		var {currencies} = this.state;
		var currency;

		for (var i = 0; i < currencies.length; i++) {
			if (cur === currencies[i].symbol) {
				currency = currencies[i];
				break;
			}
		}

		if (currency) {
			this._setState({currency});
		}
	}

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

	async onShowCurrencyCard() {
		let currency = this.state.currency;
		let params = {currencyuuid: currency.uuid};
		this.app.gotoRoute('currencycard', params);
	}
	
	// rendering
	renderMainCardPart() {
		let { currency, currentcard, signingkey, balance } = this.state;

		return (
			<span>
				{(currentcard ?
					<FormGroup className="CurrencyCard" controlId="currencycard">
					<span className="CardIconCol">
						<CurrencyCardIcon
							app={this.app}
							currency={currency}
							card={currentcard}
						/>
					</span>
					<span className="CardBalanceCol">
						<FormLabel>Balance</FormLabel>
						<FormControl
							className="CardBalanceCol"
							disabled
							autoFocus
							type="text"
							value={balance}
						/>
					</span>
					</FormGroup> :
					<FormGroup controlId="signingkey">
						<FormLabel>Private key {(currency && currency.name ? 'for ' + currency.name : '')}</FormLabel>
						<FormControl
						autoFocus
						type="text"
						value={(signingkey ? signingkey : '')}
						onChange={e => this._setState({signingkey: e.target.value})}
						/>
					</FormGroup>
				)}		
			</span>
		);

	}

	renderCurrencyPickForm() {
		let { currencies, currency, } = this.state;
		
		return (
			<div className="Form">
			  <FormGroup controlId="currency">
			  <FormLabel>Currency</FormLabel>
			  <FormGroup className="DeedCurrencyPickLine" controlId="pickccy">
				<InputGroup>
					<FormControl  className="DeedCurrencyName"
						autoFocus
						type="text"
						value={currency.symbol}
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

				{this.renderMainCardPart()}

			</div>
		  );
	}


	renderCreditCardCreateForm() {
		let { credittoken_address, message_text} = this.state;
		
		return (
			<div className="Form">
				<FormGroup controlId="credittoken_address">
					<FormLabel>Credit token</FormLabel>
					<FormControl
							autoFocus
							type="text"
							value={(credittoken_address ? credittoken_address : '')}
							onChange={e => this.setState({credittoken_address: e.target.value})}
						/>
				</FormGroup>


				<Button onClick={this.onSubmit.bind(this)} type="submit">
				 Register credit facility
				</Button>


				<div className="TextBox">
				  {message_text}
			  	</div>

				
			</div>
		  );
	}



	render() {
		return (
			<div className="Container">
				<div className="Title">Associate Credit Facility</div>
				{ this.renderCurrencyPickForm()}
				<div className="Separator">&nbsp;</div>
				{ this.renderCreditCardCreateForm()}
			</div>
		  );
	}
	
}


// propTypes validation
CreditCardCreateForm.propTypes = {
	app: PropTypes.object.isRequired,
	rootsessionuuid: PropTypes.string,
	currentwalletuuid: PropTypes.string,
	iswalletlocked: PropTypes.bool,
};

//redux
const mapStateToProps = (state) => {
	return {
		rootsessionuuid: state.session.sessionuuid,
		pending: state.login.pending,
		success: state.login.success,
		lasterror: state.login.error,
		currentwalletuuid: state.wallets.walletuuid,
		iswalletlocked: state.wallets.islocked,
	};
}

const mapDispatchToProps = (dispatch) => {
	return {
	};
}


export {CreditCardCreateForm};
export default connect(mapStateToProps, mapDispatchToProps)(CreditCardCreateForm);

