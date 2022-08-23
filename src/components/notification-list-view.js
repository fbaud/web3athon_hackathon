import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Table } from 'react-bootstrap';


import PropTypes from 'prop-types';

import '../css/poc.css';



class NotificationListView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;
		this.parent = this.props.parent;

		this.getMvcMyQuoteObject = this.app.getMvcMyQuoteObject;
		
		this.uuid = this.app.guid();

		this.checking = false;

		this.state = {
			title: 'Notifications',
			instructions: 'Click on the notification you want to treat.',
			current_challenge_name: 'unknown',
			items: []
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
		console.log('NotificationListView.componentDidUpdate called');
		
	}

	componentDidMount() {
		console.log('NotificationListView.componentDidMount called');

		this.checkNavigationState().catch(err => {console.log('error in NotificationListView.checkNavigationState: ' + err);});
		
	}

	async checkNavigationState() {
		this.checking = true;

		try {
			// check navigation
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

			let mvcmyquote = this.getMvcMyQuoteObject();
			var mvcmypocs = this.getMvcMyPocs();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();

			// auth card config
			let authcard_config = await this.getAuthCardConfig();
			let current_challenge_name = await this.getCurrentChallengeName();

			let sessionuuid = await mvcmypocs.getWalletSession(rootsessionuuid, walletuuid);
			
			// from wallet
			let walletschemeinfo = await mvcmyquote.getSessionScheme(sessionuuid).catch(err => {});
			let walletschemeuuid = walletschemeinfo.uuid;
			
			// from auth-card.json
			let authschemeuuid = authcard_config.schemeuuid;

			if (walletschemeuuid !== authschemeuuid) {
				let authschemeinfo = await mvcmyquote.getSchemeInfo(rootsessionuuid, authschemeuuid);
				this.app.alert('please login on ' + authschemeinfo.name);
				return;
			}

			// look for notifications
			let schemeconfig = await this.getSchemeConfig(authschemeuuid);
			let buyer_address = authcard_config.widget_params.buyer_address;
			let transactions = await mvcmypocs.getAddressTransactions(rootsessionuuid, walletuuid, schemeconfig, buyer_address).catch(err => {});

			let challenges = [];
			let completed = [];
			let now = Date.now();

			for (var i = 0; i < (transactions ? transactions.length : 0); i++) {
				let item = {};
				let tx = transactions[i];
				let dataobj;
				let lapse = 24 * 60 * 60 * 1000; // 1 day
				let tx_age = now - tx.timeStamp *1000;

				if ( tx_age > lapse)
					continue; // too old

				try {
					dataobj = JSON.parse(tx.input_decoded_utf8);
				}
				catch(e) {
					// another type of transaction
					dataobj = {};
				}

				if (!dataobj.chlguuid)
					continue; // not a challenge, or a result

				if (dataobj.type === 'result') {
					item.hash = tx.hash;
					item.chlguuid = dataobj.chlguuid;
					item.auth_tx_hash = dataobj.auth_tx_hash;

					completed.push(item.chlguuid);
				}
				else if (dataobj.type === 'cancel') {
					item.chlguuid = dataobj.chlguuid;

					completed.push(item.chlguuid);
				}
				else {
					item.hash = tx.hash;
					item.uuid = dataobj.chlguuid;
					item.chlguuid = dataobj.chlguuid;
	
					item.web3_provider_url = dataobj.web3_provider_url;
					item.tokenaddress = dataobj.tokenaddress;
					item.amount = dataobj.amount;
	
					item.to_address = dataobj.to_address;
					item.identified = dataobj.identified;
	
					challenges.push(item);
				}
			}

			// just keep challenges that have not been completed
			let items = [];

			for (var i = 0; i < challenges.length; i++) {
				let challenge = challenges[i];
				if (completed.includes(challenge.chlguuid))
					continue;

				items.push(challenge);
			}


			this.setState({current_challenge_name, items});
		}
		catch(e) {
			console.log('exception in NotificationListView.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		

	}

	// end of life
	componentWillUnmount() {
		console.log('NotificationListView.componentWillUnmount called');

		// unregister to window events

	}


	async getCurrentChallengeName() {
		let json = await this.mvcmyquote.loadConfig('/pocs/auth-card');

		return json.current_challenge;
	}

	async getAuthCardConfig() {
		let json = await this.mvcmyquote.loadConfig('/pocs/auth-card');

		return json.challenges[json.current_challenge];
	}

	async getSchemeConfig(schemeuuid) {
		let schemes_json = await this.mvcmyquote.loadConfig('schemes-webapp');
		let schemes = Object.values(schemes_json);

		for (var i = 0; i < (schemes ? schemes.length : 0); i++) {
			if (schemes[i].uuid === schemeuuid)
				return schemes[i];
		}
	}



	async onClickItem(item) {
		console.log('NotificationListView.onClickItem pressed!');

		this.parent.current_notification = item;
	
		this.parent.setAction('authform');
	}


	renderItem(item){
		let mvcmyquote = this.app.getMvcMyQuoteObject();

		let uuid = item.uuid;

		let tx_hash = mvcmyquote.fitString(item.hash, 21);
		let amount = item.amount;


		return (
			<tr key={uuid} onClick={() => this.onClickItem(item)}>
				<td>{tx_hash}</td>
				<td>{amount}</td>
			</tr>
		);
	}
	
	renderList() {
		let {items} = this.state;

		return (
			<Table responsive>
				<thead className="ListHeader">
					<tr>
					<th>Hash</th>
					<th>Amount</th>
					</tr>
				</thead>
				<tbody className="ListItem" >
				{(items && items.length ?
				items.map((item, index) => {return (this.renderItem(item));})
				: <tr className="NoList">No notifications in the list</tr>
				)}
				</tbody>
			</Table>
		);	
	}

	render() {
		return (
			<div className="Container">
				<div className="Instructions">{this.state.title}</div>
				<div className="Explanations">{this.state.instructions}</div>
				{this.renderList()}
				<div className="Dev-Info">{( this.app.exec_env === 'dev' ? 'Working on challenge ' + this.state.current_challenge_name : '')}</div>
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
NotificationListView.propTypes = {
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


export {NotificationListView};
export default connect(mapStateToProps, mapDispatchToProps)(NotificationListView);