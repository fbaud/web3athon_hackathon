import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button,  FormGroup, FormControl, FormLabel, InputGroup, Table} from 'react-bootstrap';

import PropTypes from 'prop-types';

//import {TextCopyIcon} from '@primusmoney/react_pwa';
import {TextCopyIcon} from '../nodemodules/@primusmoney/react_pwa';

class CreditCardView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.uuid = this.app.guid();

		this.closing = false;


		this.creditcarduuid = null;

		
		this.state = {
				currency: {symbol: ''},
				title: '',

				clientcard: null,
				client_creditbalance: 'loading...',
				client_position: null,
				client_position_int: -1,
				client_position_string: 'loading...',
				client_address_string: 'loading...',
				web3providerurl_string: 'loading...',
				message_text: 'loading...',
	
				creditcard: null,
				credit_limit_string: 'loading...',
				credit_balance_string: 'loading...',

				message_text: 'loading...',
				processing: false
		}
	}

	_setState(state) {
		if (this.closing !== true)
		this.setState(state);
	}


	
	// post render commit phase
	componentDidMount() {
		console.log('CreditCardView.componentDidMount called');
		
		let mvcmypwa = this.getMvcMyPWAObject();

		let message_text = mvcmypwa.t(
			'You can check above what is your credit limit \
			 and credit balance for the corresponding credit facility. \
             Below you have the position in cash of your currency card. \
			 You can use available cash to topup your credit balance.');
	
		
		this.setState({message_text});

		this.checkNavigationState().catch(err => {console.log('error in CreditCardView.checkNavigationState: ' + err);});
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		let mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		if (app_nav_target && (app_nav_target.route == 'creditcard') && (app_nav_target.reached == false)) {
			var params = app_nav_target.params;
			var creditcarduuid = params.creditcarduuid;

			let options = {showdecimals: true, decimalsshown: 2 /* currency.decimals */};



			if (creditcarduuid) {
				this.creditcarduuid = creditcarduuid;

				let creditcard_meta = await mvcmycreditbook.readCreditCard(rootsessionuuid, walletuuid, creditcarduuid);

				let currencyuuid = creditcard_meta.currencyuuid;
				let clientcarduuid = creditcard_meta.carduuid;
				let credittoken_addr = creditcard_meta.credittotken;

				//
				// currency
				let currency = await mvcmypwa.getCurrencyFromUUID(rootsessionuuid, currencyuuid);

				//
				// client card
				let clientcard = await mvcmypwa.getWalletCard(rootsessionuuid, walletuuid, clientcarduuid).catch(err=>{});
				let client_addr = clientcard.address;

				let clientscheme = await mvcmypwa.getCardSchemeInfo(rootsessionuuid, walletuuid, clientcard.uuid);

				const client_credits = await mvcmypwa.getCreditBalance(rootsessionuuid, walletuuid, clientcarduuid);
				const client_creditbalance = client_credits.transactionunits;

				const client_position = await mvcmypwa.getCurrencyPosition(rootsessionuuid, walletuuid, currencyuuid, clientcarduuid);
				const client_position_string = await mvcmypwa.formatCurrencyAmount(rootsessionuuid, currencyuuid, client_position);
				const client_position_int = await client_position.toInteger();
		
				
				// message translated in user's language
				let message_text = '';
				
				// export
				let client_address = clientcard.address;
				let web3providerurl = clientscheme.network.ethnodeserver.web3_provider_url;

				let client_address_string = (client_address ? mvcmypwa.fitString(client_address, 32) : '');
				let web3providerurl_string = (web3providerurl ? mvcmypwa.fitString(web3providerurl, 48) : '');


				//
				// erc20 credit
				let erc20credit = await mvcmycreditbook.fetchCreditToken(rootsessionuuid, walletuuid, currencyuuid, credittoken_addr);

				//
				// credit limit
				let credit_limit = await mvcmycreditbook.fetchCreditLimit(rootsessionuuid, walletuuid, currencyuuid, credittoken_addr, client_addr);
 
				// limit
				let credit_limit_string = await mvcmycreditbook._formatCurrencyIntAmount(rootsessionuuid, currencyuuid, credit_limit, options);

				//
				//  credit card info
				let creditcard = await mvcmycreditbook.getCurrencyCreditCard(rootsessionuuid, walletuuid, clientcarduuid, credittoken_addr);
				let creditcurrencyuuid = creditcard.currencyuuid;

				let credit_balance_pos = await mvcmypwa.getCurrencyPosition(rootsessionuuid, walletuuid, creditcurrencyuuid, creditcard.uuid);
				const credit_balance_string = await mvcmypwa.formatCurrencyAmount(rootsessionuuid, creditcurrencyuuid, credit_balance_pos);
				const credit_balance = await credit_balance_pos.toInteger();

				this.setState({	
					currency,

					title: erc20credit.description, 

					clientcard,
					client_address_string,
					client_creditbalance, 
					client_position_int, client_position_string,
					web3providerurl, web3providerurl_string,

					creditcard,
					credit_limit, credit_limit_string, 
					credit_balance, credit_balance_string});
	
			}
			// mark target as reached
			app_nav_target.reached = true;
		}
	}

	// end of life
	componentWillUnmount() {
		console.log('CreditCardView.componentWillUnmount called');
		
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
			let {clientcard, client_position_int, credit_limit, credit_balance} = this.state;
			let creditcarduuid = this.creditcarduuid;

			let creditcard_meta = await mvcmycreditbook.readCreditCard(rootsessionuuid, walletuuid, creditcarduuid);

			let currencyuuid = creditcard_meta.currencyuuid;
			let clientcarduuid = creditcard_meta.carduuid;
			let credittoken_addr = creditcard_meta.credittotken;

			// amount to topup
			let amount = credit_limit - credit_balance;

			if (amount <= 0) {
				this.app.alert('Balance is already at its top');
				this._setState({processing: false});
				return;
			}

			if (amount > client_position_int) {
				this.app.alert('Not enough funds to top up');
				this._setState({processing: false});
				return;
			}

			// check we have enough transaction credits
			let tx_fee = {};
			tx_fee.transferred_credit_units = 0;
			let topup_cost_units = 10;
			tx_fee.estimated_cost_units = topup_cost_units;

			let _feelevel = await mvcmypwa.getRecommendedFeeLevel(rootsessionuuid, walletuuid, clientcard.uuid, tx_fee);


			var canspend = await mvcmypwa.canCompleteTransaction(rootsessionuuid, walletuuid, clientcard.uuid, tx_fee, _feelevel).catch(err => {});

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
	
			// perform top up
			let txhash = await mvcmycreditbook.topupCurrencyCreditCard(rootsessionuuid, walletuuid, clientcard.uuid, credittoken_addr, amount, _feelevel)
			.catch(err => {
				console.log('error in CreditCardView.onSubmit: ' + err);
			});
	
			if (!txhash) {
				this.app.alert('Could not top up credit card');
				this.setState({processing: false});
				return;
			}

			// goto list of credit card to let time for new balance to be updated
			let params = {action: 'view'};

			this.app.gotoRoute('creditcards', params);
	

			this._setState({processing: false});
	
			return true;
		}
		catch(e) {
			console.log('exception in onSubmit: ' + e);
			this.app.error('exception in onSubmit: ' + e);

			this.app.alert('could not update credit account');

			this._setState({processing: false});
		}


		return false;
	}

	
	// rendering
	renderCurrencyCardView() {
		let { currency, client_address_string,
			client_creditbalance, client_position_string,
			address, web3providerurl,web3providerurl_string } = this.state;
			

		
		return (
			<div className="Form">
				<FormGroup className="CurrencyCard" controlId="balance">
				<span>
					<FormLabel># tx units</FormLabel>
					<FormControl
						className="CurrencyCardBalance"
						disabled
						autoFocus
						type="text"
						value={client_creditbalance}
					/>
				</span>
				<span>
					<FormLabel>Balance</FormLabel>
					<FormControl
						className="CurrencyCardBalance"
						disabled
						autoFocus
						type="text"
						value={client_position_string}
					/>
				</span>
				<span className="CurrencyCardIconCol">
				</span>

				</FormGroup>

				<FormGroup controlId="address">
					<FormLabel>Address</FormLabel>
					<FormGroup className="ClaimerCardLine">
						<FormControl
							className="CurrencyCardAddress"
							disabled
							autoFocus
							type="text"
							value={(client_address_string ? client_address_string : '')}
						/>
						<div className="ShareIcon">
							<TextCopyIcon
								app={this.app}
								text={address}
								message="address has been copied to clipboard"
							/>
						</div>
					</FormGroup>
				</FormGroup>


				<FormGroup controlId="web3providerurl">
					<FormLabel>RPC URL {(currency && currency.name ? 'for ' + currency.name : '')}</FormLabel>
					<FormGroup className="ClaimerCardLine">
						<FormControl
							className="CurrencyCardAddress"
							disabled
							autoFocus
							type="text"
							value={(web3providerurl_string ? web3providerurl_string : '')}
						/>
						<div className="ShareIcon">
							<TextCopyIcon
								app={this.app}
								text={web3providerurl}
								message="rpc url has been copied to clipboard"
							/>
						</div>
					</FormGroup>
				</FormGroup>

				<Button onClick={this.onSubmit.bind(this)} type="submit">
				 Top up credit card
				</Button>

			</div>
		  );
	}

	renderCreditCardView() {
		let { credit_balance_string,  credit_limit_string, message_text} = this.state;
		
		return (
			<div className="Form">
				<FormGroup className="CurrencyCard" controlId="balance">
					<span>
						<FormLabel>Balance</FormLabel>
						<FormControl
							className="CurrencyCardBalance"
							disabled
							autoFocus
							type="text"
							value={credit_balance_string}
						/>
					</span>
					<span>
						<FormLabel>Limit</FormLabel>
						<FormControl
							className="CurrencyCardBalance"
							disabled
							autoFocus
							type="text"
							value={credit_limit_string}
						/>
					</span>
				</FormGroup>



				<div className="TextBox">
				  {message_text}
			  	</div>

				
			</div>
		  );
	}

	renderCreditBookView() {
		let { currency, title} = this.state;
		
		return (
			<div className="Form">
				<FormGroup controlId="title">
				  <FormLabel>Creditor</FormLabel>
				  <FormControl
					disabled
					autoFocus
					type="text"
					value={title}
					onChange={e => this.setState({title: e.target.value})}
				  />
				</FormGroup>

				<FormGroup controlId="currency">
					<FormLabel>Currency</FormLabel>
					<FormControl 
							disabled
							autoFocus
							type="text"
							value={(currency && currency.name ? currency.name : '')}
							onChange={e => this.onChangeCurrency(e)}
						/>
				</FormGroup>
			</div>
		  );
	}

	renderForm() {
		return (
			<div className="Form">
				{ this.renderCreditBookView()}
				<div className="Separator">&nbsp;</div>
				{ this.renderCreditCardView()}
				<div className="Separator">&nbsp;</div>
				{ this.renderCurrencyCardView()}
			</div>
		  );
	}

	render() {
		return (
			<div className="Container">
				<div className="Title">Credit Card View</div>
				{ this.renderForm()}
			</div>
		  );
	}
	
}


// propTypes validation
CreditCardView.propTypes = {
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


export {CreditCardView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditCardView);

