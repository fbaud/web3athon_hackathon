import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Table } from 'react-bootstrap';


import PropTypes from 'prop-types';

import '../css/poc.css';



class CreditBookListView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;
		this.parent = this.props.parent;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		
		this.uuid = this.app.guid();

		this.checking = false;

		this.state = {
			title: 'Credit Books',
			instructions: 'Click on the credit book you want to open.',
			current_challenge_name: 'unknown',
			items: []
		};		
	}
	
	componentDidUpdate(prevProps) {
		console.log('CreditBookListView.componentDidUpdate called');
		
	}

	componentDidMount() {
		console.log('CreditBookListView.componentDidMount called');

		this.checkNavigationState().catch(err => {console.log('error in CreditBookListView.checkNavigationState: ' + err);});
		
	}

	async checkNavigationState() {
		this.checking = true;

		try {
			// check navigation
			let app_nav_state = this.app.getNavigationState();
			let app_nav_target = app_nav_state.target;

			let mvcmypwa = this.getMvcMyPWAObject();
			var mvcmycreditbook = this.getMvcMyCreditBookObject();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;

			let My_Widget_Client = require('@primusmoney/my_widget_react_client');
			let my_widget_client = My_Widget_Client.getObject();

			// auth card config
			let authcard_config = await this.getAuthCardConfig();
			let current_challenge_name = await this.getCurrentChallengeName();

			let sessionuuid = await mvcmycreditbook.getWalletSession(rootsessionuuid, walletuuid);
			
			// from wallet
			let walletschemeinfo = await mvcmypwa.getSessionScheme(sessionuuid).catch(err => {});
			let walletschemeuuid = walletschemeinfo.uuid;
			
			// from auth-card.json
			let authschemeuuid = authcard_config.schemeuuid;

			if (walletschemeuuid !== authschemeuuid) {
				let authschemeinfo = await mvcmypwa.getSchemeInfo(rootsessionuuid, authschemeuuid);
				this.app.alert('please login on ' + authschemeinfo.name);
				return;
			}

			// look for credit books
			let schemeconfig = await this.getSchemeConfig(authschemeuuid);
			let buyer_address = authcard_config.widget_params.buyer_address;
			let creditbooks = await mvcmycreditbook.readCreditBooks(sessionuuid, walletuuid).catch(err => {});

			this.setState({current_challenge_name, items: creditbooks});
		}
		catch(e) {
			console.log('exception in CreditBookListView.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		

	}

	// end of life
	componentWillUnmount() {
		console.log('CreditBookListView.componentWillUnmount called');

		// unregister to window events

	}


	async getCurrentChallengeName() {
		let json = await this.mvcmypwa.loadConfig('/pocs/auth-card');

		return json.current_challenge;
	}

	async getAuthCardConfig() {
		let json = await this.mvcmypwa.loadConfig('/pocs/auth-card');

		return json.challenges[json.current_challenge];
	}

	async getSchemeConfig(schemeuuid) {
		let schemes_json = await this.mvcmypwa.loadConfig('schemes-webapp');
		let schemes = Object.values(schemes_json);

		for (var i = 0; i < (schemes ? schemes.length : 0); i++) {
			if (schemes[i].uuid === schemeuuid)
				return schemes[i];
		}
	}



	async onClickItem(item) {
		console.log('CreditBookListView.onClickItem pressed!');

		this.parent.current_notification = item;
	
		this.parent.setAction('authform');
	}


	renderItem(item){
		let mvcmypwa = this.app.getMvcMyPWAObject();

		let uuid = item.uuid;

		let tx_hash = mvcmypwa.fitString(item.hash, 21);
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
				: <tr className="NoList">No credit book in the list</tr>
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
CreditBookListView.propTypes = {
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


export {CreditBookListView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditBookListView);