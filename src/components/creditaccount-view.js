import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button,  FormGroup, FormControl, FormLabel, InputGroup, Table} from 'react-bootstrap';

import PropTypes from 'prop-types';

//import {TextCopyIcon} from '@primusmoney/react_pwa';
import {TextCopyIcon} from '../nodemodules/@primusmoney/react_pwa';

class CreditAccountView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.uuid = this.app.guid();

		this.closing = false;


		let creditbookuuid = null;

		
		let title = '';
		let currency = {symbol: ''};

		let client_name = null;
		let client_address = null;

		let accounts = [];

		let currentcard = null;

		let account = null;

		let limit_string = null;
		let balance_string = null;
		let credittoken_address = null;

		let new_limit = null;
		
		
		this.state = {
				creditbookuuid,
				currency,
				title,
				client_name,
 				client_address,
                accounts,
				currentcard,
				account,
				limit_string,
				balance_string,
				credittoken_address,
				new_limit,
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
		console.log('CreditAccountView.componentDidMount called');
		
		let mvcmypwa = this.getMvcMyPWAObject();

		let message_text = mvcmypwa.t(
			'You can raise or lower credit for this account. \
			 The balance will be adapted accordingly. \
             Note that if lowering the credit limit to zero \
			 corresponds to closing the account.');
	
		
		this.setState({message_text});

		this.checkNavigationState().catch(err => {console.log('error in CreditAccountView.checkNavigationState: ' + err);});
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		let mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		if (app_nav_target && (app_nav_target.route == 'creditaccount') && (app_nav_target.reached == false)) {
			var params = app_nav_target.params;
			var creditbookuuid = params.creditbookuuid;
			var client_addr = params.client_addr;

			if (creditbookuuid && client_addr) {
				let creditbook = await mvcmycreditbook.readCreditBook(rootsessionuuid, walletuuid, creditbookuuid).catch(err => {});

				if (creditbook) {
					let title = creditbook.title;
					let creditbookuuid = creditbook.uuid;

					// corresponding card
					let carduuid = creditbook.carduuid;

					let accounts = await mvcmycreditbook.fetchCreditAccounts(rootsessionuuid, walletuuid, carduuid, creditbookuuid);

					// currency
					let currencyuuid = creditbook.currencyuuid;
					let currency = await mvcmypwa.getCurrencyFromUUID(rootsessionuuid, currencyuuid)
					.catch(err => {
						console.log('error in CreditAccountView.checkNavigationState: ' + err);
					});

					// current card
					let maincurrencycard = await mvcmypwa.getCurrencyCard(rootsessionuuid, walletuuid, currencyuuid).catch(err=>{});

					// retrieve account
					let account = await mvcmycreditbook.fetchCreditAccount(rootsessionuuid, walletuuid, carduuid, creditbookuuid, client_addr).catch(err=>{});
					let client_name = (account && account.name ? account.name : 'unknown');
					let client_address = (account && account.address ? account.address : 'unknown');

					// limit, balance and credit token address
					
					var options = {showdecimals: true, decimalsshown: 2 /* currency.decimals */};
 
					let limit_string = await mvcmycreditbook._formatCurrencyIntAmount(rootsessionuuid, currency.uuid, account.limit, options);
					
					let balance_string = await mvcmycreditbook._formatCurrencyIntAmount(rootsessionuuid, currency.uuid, account.balance, options);
					
					let credittoken_address = account.credittoken;

					this.setState({creditbookuuid, currency, title, 
						currentcard: maincurrencycard, accounts,
						client_name, client_address, account,
						limit_string, balance_string, credittoken_address});
				}
			}


			// mark target as reached
			app_nav_target.reached = true;
		}
	}

	// end of life
	componentWillUnmount() {
		console.log('CreditAccountView.componentWillUnmount called');
		
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
			let {creditbookuuid, currentcard, currency, client_address, new_limit} = this.state;

			let new_limit_amount = await mvcmypwa.getCurrencyAmount(rootsessionuuid, currency.uuid, new_limit);
			let new_limit_amount_int = await new_limit_amount.toInteger();

			// check we have enough transaction credits
			let tx_fee = {};
			tx_fee.transferred_credit_units = 0;
			let update_cost_units = 3;
			tx_fee.estimated_cost_units = update_cost_units;

			let _feelevel = await mvcmypwa.getRecommendedFeeLevel(rootsessionuuid, walletuuid, currentcard.uuid, tx_fee);


			var canspend = await mvcmypwa.canCompleteTransaction(rootsessionuuid, walletuuid, currentcard.uuid, tx_fee, _feelevel).catch(err => {});

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
	
			// perform update
			let txhash = await mvcmycreditbook.registerCreditAccountLimit(rootsessionuuid, walletuuid, currentcard.uuid, creditbookuuid, client_address, new_limit_amount_int, _feelevel)
			.catch(err => {
				console.log('error in CreditAccountView.onSubmit: ' + err);
			});
	
			if (!txhash) {
				this.app.alert('Could not update limit');
				this.setState({processing: false});
				return;
			}

			// goto credit book to let time for new account to be updated
			let params = {action: 'view', creditbookuuid};

			this.app.gotoRoute('creditbook', params);
	

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
	renderAccountUpdateForm() {
		let { balance_string, limit_string, credittoken_address, new_limit} = this.state;

		return (
			<div className="Form">
				<div >
					<FormGroup className="CurrencyCard" controlId="balance">
						<span>
							<FormLabel>Balance</FormLabel>
							<FormControl
								className="CurrencyCardBalance"
								disabled
								autoFocus
								type="text"
								value={balance_string}
							/>
						</span>
						<span>
							<FormLabel>Limit</FormLabel>
							<FormControl
								className="CurrencyCardBalance"
								disabled
								autoFocus
								type="text"
								value={limit_string}
							/>
						</span>
					</FormGroup>


					<FormGroup controlId="address">
						<FormLabel>Credit Token Address</FormLabel>
						<FormGroup className="ClaimerCardLine">
							<FormControl
								className="CurrencyCardAddress"
								disabled
								autoFocus
								type="text"
								value={(credittoken_address ? credittoken_address : '')}
							/>
							<div className="ShareIcon">
								<TextCopyIcon
									app={this.app}
									text={credittoken_address}
									message="address has been copied to clipboard"
								/>
							</div>
						</FormGroup>
					</FormGroup>

					<FormGroup controlId="credit_limit">
					<FormLabel>New limit</FormLabel>
					<InputGroup>
						<FormControl 
							autoFocus
							type="text"
							value={new_limit}
							onChange={e => this.setState({new_limit: e.target.value})}
						/>
					</InputGroup>
				</FormGroup>


				</div>

				<Button onClick={this.onSubmit.bind(this)} type="submit">
				 Update credit account
				</Button>

			</div>
		  );
	}

	renderCreditAccountView() {
		let { client_name, client_address, message_text} = this.state;
		
		return (
			<div className="Form">
				<FormGroup controlId="client_name">
					<FormLabel>Client Name</FormLabel>
					<InputGroup>
						<FormControl
							disabled
							autoFocus
							type="text"
							value={client_name}
						/>
					</InputGroup>
				</FormGroup>
				<FormGroup controlId="client_address">
					<FormLabel>Client Address</FormLabel>
					<InputGroup>
						<FormControl
							disabled
							autoFocus
							type="text"
							value={client_address}
						/>
					</InputGroup>
				</FormGroup>

				<div className="Separator">&nbsp;</div>

				{this.renderAccountUpdateForm()}

				<div className="TextBox">
				  {message_text}
			  	</div>

				
			</div>
		  );
	}

	renderCreditBookView() {
		let { currency, title, message_text} = this.state;
		
		return (
			<div className="Form">
				<FormGroup controlId="title">
				  <FormLabel>Credit Book Title</FormLabel>
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
							value={currency.name}
							onChange={e => this.onChangeCurrency(e)}
						/>
				</FormGroup>
			</div>
		  );
	}

	render() {
		return (
			<div className="Container">
				<div className="Title">Credit Account View</div>
				{ this.renderCreditBookView()}
				<div className="Separator">&nbsp;</div>
				{ this.renderCreditAccountView()}
			</div>
		  );
	}
	
}


// propTypes validation
CreditAccountView.propTypes = {
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


export {CreditAccountView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditAccountView);

