import React from 'react'
import { connect } from 'react-redux';
import { Button, Dropdown, DropdownButton, FormGroup, FormControl, FormLabel, InputGroup } from 'react-bootstrap';

import PropTypes from 'prop-types';

import { Dots } from 'react-activity';
import 'react-activity/dist/react-activity.css';

import { faKey, faGlasses, faStar, faUserLock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

//import {CurrencyCardIcon} from '@primusmoney/react_pwa';
import {CurrencyCardIcon} from '../nodemodules/@primusmoney/react_pwa';


class CreditBookCreateForm extends React.Component {
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		
		let title = '';
		let currency = {symbol: ''};
		let currencies= [];
		let signingkey = null;
		let currentcard = null;
		let balance = '';
		
		this.state = {
			title,
			currency,
			currencies,
			signingkey,
			currentcard,
			balance,
			message_text: '',
			processinginfo: 'processing submission',
			processing: false
		};	
	}

	_setState(state) {
		if (this.closing !== true)
		this.setState(state);
	}


	// post render commit phase
	componentDidUpdate(prevProps, prevState) {
		//console.log('CreditBookCreateForm.componentDidUpdate called');
		
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
		console.log('CreditBookCreateForm.componentDidMount called');
		
		let mvcmypwa = this.getMvcMyPWAObject();
		
		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		// list of currencies
		this.mvcmypwa.getCurrencies(rootsessionuuid, walletuuid)
		.then((currencies) => {
			this._setState({currencies});
		})
		.catch(err => {
			console.log('error in CreditBookCreateForm.componentDidMount ' + err);
		});


		// message translated in user's language
		let message_text = mvcmypwa.t(
		'When you press the button \'Create Book\', a credit book will be created \
		for the currency card that have been selected and deployed on the blockchain \
		You will then be able to grant credit to specific addresses corresponding to \
		customers that you trust. They will be able to pay you either in the original \
		currency or use the balance they have on their credit allowance.');

		this._setState({message_text});

		this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		
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
		var currencies = await this.mvcmypwa.getCurrencies(rootsessionuuid, walletuuid)
		.catch(err => {
			console.log('error in CreditBookCreateForm.checkNavigationState ' + err);
		});

		// potentially filter currencies
		var enabled_currencies = currencies;


		this._setState({currencies: enabled_currencies});
		
		if (app_nav_target && (app_nav_target.route == 'creditbook') && (app_nav_target.reached == false)) {
			// mark target as reached
			app_nav_target.reached = true;
		}

	 }

	// end of life
	componentWillUnmount() {
		console.log('CreditBookCreateForm.componentWillUnmount called');
		
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
			let { currency, currentcard, signingkey, title } = this.state;

	
			if (!title || (title.length == 0)) {
				this.app.alert('You need to enter a title for this deed');
				this._setState({processing: false});
				return;
			}
	
	
			if (!currency || !currency.uuid) {
				this.app.alert('You need to specify a valid currency');
				this._setState({processing: false});
				return;
			}
	
			// get wallet details
			wallet = await mvcmypwa.getWalletInfo(rootsessionuuid, walletuuid);
	
			if (currentcard) {
				card = currentcard;
				carduuid = card.uuid;
			}
			else {
				if (signingkey) {
					let currencyuuid = currency.uuid;
		
					card = await this.app.createCurrencyCard(currencyuuid, signingkey, {maincard: true})
					.catch(err => {
						console.log('error in DeedCreateForm.onSubmit: ' + err);
					});
	
					if (!card) {
						this.app.alert('Could not create card from private key');
						this._setState({processing: false});
						return;
					}
				}
				else {
					this.app.alert('You need to provide your private key for ' + currency.name + ' in order to sign and fund your deed');
					this._setState({processing: false});
					return;
				}
		
			}

			// check card can transfer credit units and tokens
			let _privkey = await  mvcmypwa.getCardPrivateKey(rootsessionuuid, walletuuid, currentcard.uuid).catch(err => {});
			let cansign = (_privkey ? true : false);

			if (cansign !== true) {
				this.app.alert('Current card for the currency is read-only');
				this._setState({processing: false});
				return;
			}
	
			// credit book
			let creditbook = {owner: currentcard.address, currencytoken: currency.address, title};
			let currencyuuid = currency.uuid;

			// check we have enough transaction credits
			let tx_fee = {};
			tx_fee.transferred_credit_units = 0;
			let deploy_cost_units = 225;
			tx_fee.estimated_cost_units = deploy_cost_units;

			// need a higher feelevel than standard this.app.getCurrencyFeeLevel(currencyuuuid)
			let _feelevel = await mvcmypwa.getRecommendedFeeLevel(rootsessionuuid, walletuuid, card.uuid, tx_fee);

			var canspend = await mvcmypwa.canCompleteTransaction(rootsessionuuid, walletuuid, card.uuid, tx_fee, _feelevel).catch(err => {});
	
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
			
			// deploy
			creditbook = mvcmycreditbook.deployCreditBook(rootsessionuuid, walletuuid, currencyuuid, carduuid, creditbook, _feelevel)
			.catch(err => {
				console.log('error in CreditBookCreateForm.onSubmit: ' + err);
			});


			// go to list view (to let time for the blockchain to commit the transactions)
			let params = {action: 'view', currencyuuid: currency.uuid, cardaddress: currentcard.address};
	
			await this.app.gotoRoute('creditbooks', params);
	
			this._setState({processing: false});
	
			return true;
		}
		catch(e) {
			console.log('exception in onSubmit: ' + e);
			this.app.error('exception in onSubmit: ' + e);

			this.app.alert('could not create credit book');

			this._setState({processing: false});
		}
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
					<FormGroup className="CurrencyCard" controlId="address">
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

	
	renderCreditBookCreateForm() {
		let { title, currencies, currency, currentcard, message_text } = this.state;
		
		return (
			<div className="Form">
			  <div>
				<FormGroup controlId="title">
				  <FormLabel>Credit Book Title</FormLabel>
				  <FormControl
					autoFocus
					type="text"
					value={title}
					onChange={e => this._setState({title: e.target.value})}
				  />
				</FormGroup>
				
				<Button 
				disabled={(currentcard ? false : true)}
				onClick={this.onSubmit.bind(this)} 
				type="submit">
				  Create Book
				</Button>

				<div className="TextBox">
				  {message_text}
			  	</div>

			  </div>
			</div>
		  );
	}
	
	render() {
		let {processing} = this.state; 
		
		if (processing === true) {
			return (
				<div className="Splash">
					<div>{this.state.processinginfo}</div>
					<Dots />
				</div>
			);
		}
		
		return (
			<div className="Container">
				<div className="Title">Create Credit Book</div>
				{ this.renderCurrencyPickForm()}
				{ this.renderCreditBookCreateForm()}
			</div>
		  );
	}
}


// propTypes validation
CreditBookCreateForm.propTypes = {
	app: PropTypes.object.isRequired,
	rootsessionuuid: PropTypes.string,
	currentwalletuuid: PropTypes.string,
};

//redux
const mapStateToProps = (state) => {
	return {
		rootsessionuuid: state.session.sessionuuid,
		pending: state.login.pending,
		success: state.login.success,
		lasterror: state.login.error,
		currentwalletuuid: state.wallets.walletuuid,
		currentcarduuid: state.cards.carduuid,
	};
}

const mapDispatchToProps = (dispatch) => {
	return {
	};
}


export {CreditBookCreateForm};
export default connect(mapStateToProps, mapDispatchToProps)(CreditBookCreateForm);

