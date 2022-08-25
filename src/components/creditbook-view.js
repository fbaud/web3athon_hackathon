import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button, Dropdown, DropdownButton, FormGroup, FormControl, FormLabel, InputGroup } from 'react-bootstrap';

import PropTypes from 'prop-types';

import { faCopy} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

class CreditBookView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.dataobject = null;

		
		let title = '';
		let description = '';
		let amount = 0;
		let currency = {symbol: ''};
		let currencies= [];
		let signingkey = null;
		let currentcard = null;
		
		this.state = {
				title,
				description,
				amount,
				currency,
				currencies,
				signingkey,
				currentcard,
				isOwner: false,
				message_text: 'loading...',
				sharelinkmessage: 'loading...',
				sharelink: 'loading...'
		}
	}


	
	// post render commit phase
	componentDidMount() {
		console.log('CreditBookView.componentDidMount called');
		
		let mvcmypwa = this.getMvcMyPWAObject();

		let registration_text = mvcmypwa.t('This quote has been registered.');

		let message_text = mvcmypwa.t(
			'You can add credit lines on this book. \
			 Each credit line will let your client choose \
             to pay cash with a currency card or use \
             their credit if the balance allows it.');
	
		let sharelinkmessage = mvcmypwa.t('You can share this order with the following link:');
		
		
		this.setState({registration_text, message_text, sharelinkmessage});

		this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	}

	async checkNavigationState() {
		let mvcmypwa = this.getMvcMyPWAObject();
		let mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		if (app_nav_target && (app_nav_target.route == 'creditbook') && (app_nav_target.reached == false)) {
			var params = app_nav_target.params;
            var creditbookuuid = params.creditbookuuid;

            if (creditbookuuid) {
                let creditbook = await mvcmycreditbook.readCreditBook(rootsessionuuid, walletuuid, creditbookuuid).catch(err => {});

                if (creditbook) {
                    let title = creditbook.title;

                    this.setState({title});
                }
            }


			// mark target as reached
			app_nav_target.reached = true;
		}
	}

	
	// user actions
	async onSubmit() {
		console.log('onSubmit pressed!');
		
		if (this.dataobject) {
			let params = {action: 'create', txhash: this.dataobject.txhash, currencyuuid: this.dataobject.currencyuuid, dataobject: this.dataobject};
			this.app.gotoRoute('order', params);
		}
		else
			this.app.alert('Credit Book parameters not found');

		return true;
	}

	async onShareLinkClick() {
		const {sharelink} = this.state;
		
		// create a textarea on the fly, then remove it to
		// be able to copy to clipboard
		var textArea = document.createElement("textarea");
		textArea.value = sharelink;

		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand("Copy");
		textArea.remove();

		this.app.alert("Share link has been copied to clipboard");
	}

	
	// rendering
	renderCreditBookView() {
		let { title, description, amount, currency, registration_text, message_text, sharelinkmessage, sharelink, isOwner } = this.state;
		
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

				<FormGroup controlId="description">
				  <FormLabel>Description</FormLabel>
				  <FormControl 
					disabled
					as="textarea" 
					rows="5" 
					autoFocus
					type="text"
					value={description}
					onChange={e => this.setState({description: e.target.value})}
				  />
				</FormGroup>
				
				<FormGroup className="Proposal" controlId="proposal">
				<span className="ProposalCol">
				<FormLabel>Amount</FormLabel>
				  <FormControl 
					disabled
					autoFocus
					type="text"
					value={amount}
					onChange={e => this.setState({amount: e.target.value})}
				  />
				</span>
				<span className="ProposalCol">
				<FormLabel>Currency</FormLabel>
				<InputGroup>
					<FormControl 
						disabled
						autoFocus
						type="text"
						value={currency.symbol}
						onChange={e => this.onChangeCurrency(e)}
					/>
				</InputGroup>
				 </span>
				</FormGroup>

				<div className="TextBox">
				  {registration_text}
			  	</div>

				<div className="TextBox">
					<div>{sharelinkmessage}</div>
					<div className="ShareBlock">
					<span className="ShareLink" onClick={this.onShareLinkClick.bind(this)}>{sharelink}</span>
					<span className="ShareIcon" onClick={this.onShareLinkClick.bind(this)}><FontAwesomeIcon icon={faCopy} /></span>
					</div>
				</div>

				<Button onClick={this.onSubmit.bind(this)} type="submit">
				  Register an order
				</Button>

				<div className="TextBox">
				  {message_text}
			  	</div>


				{(this.dataobject ?
				<div>
				<hr></hr>
				<div>
					List of credits
				</div>
				</div> :
				<></>
				)}
			</div>
		  );
	}

	render() {
		return (
			<div className="Container">
				<div className="Title">Credit Book View</div>
				{ this.renderCreditBookView()}
			</div>
		  );
	}
	
}


// propTypes validation
CreditBookView.propTypes = {
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


export {CreditBookView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditBookView);

