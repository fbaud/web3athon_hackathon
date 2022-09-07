import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Table } from 'react-bootstrap';


import PropTypes from 'prop-types';

import '../css/poc.css';



class CreditAccountListView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		
		this.uuid = this.app.guid();

		this.checking = false;

		this.state = {
			title: 'Credit Accounts',
			instructions: 'Click on the credit account you want to open.',
			items: []
		};		
	}

	async _getAccountList(creditbookuuid) {
		var mvcmycreditbook = this.getMvcMyCreditBookObject();

		let rootsessionuuid = this.props.rootsessionuuid;
		let walletuuid = this.props.currentwalletuuid;
	
		if (creditbookuuid) {
			let creditbook = await mvcmycreditbook.readCreditBook(rootsessionuuid, walletuuid, creditbookuuid).catch(err => {});

			if (creditbook) {
				this.creditbookuuid = creditbook.uuid;

				let title = creditbook.title;
				let creditbookuuid = creditbook.uuid;

				// corresponding card
				let carduuid = creditbook.carduuid;

				let accounts = await mvcmycreditbook.fetchCreditAccounts(rootsessionuuid, walletuuid, carduuid, creditbookuuid);

				return accounts;
			}
		}
	}
	
	componentDidUpdate(prevProps) {
		console.log('CreditAccountListView.componentDidUpdate called');

		if (this.props.creditbookuuid != prevProps.creditbookuuid) {
			var creditbookuuid = this.props.creditbookuuid;

			this._getAccountList(creditbookuuid)
			.then(accounts => {
				this.setState({items: accounts});
			})
			.catch(err =>
			{
				console.log('exception in CreditAccountListView.componentDidUpdate: '+ err);
			});
		}

		
	}

	componentDidMount() {
		console.log('CreditAccountListView.componentDidMount called');

		this.checkNavigationState().catch(err => {console.log('error in CreditAccountListView.checkNavigationState: ' + err);});
		
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

			var creditbookuuid = this.props.creditbookuuid;

			if (creditbookuuid) {
				let accounts = await this._getAccountList(creditbookuuid);

				this.setState({items: accounts});
			}
		}
		catch(e) {
			console.log('exception in CreditAccountListView.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		

	}

	// end of life
	componentWillUnmount() {
		console.log('CreditAccountListView.componentWillUnmount called');

		// unregister to window events

	}


	// user action
	async onClickItem(item) {
		console.log('CreditAccountListView.onClickItem pressed!');

		let creditbookuuid = item.creditbookuuid;
		let client_addr = item.address;

		let params = {action: 'view', creditbookuuid, client_addr};

		this.app.gotoRoute('creditaccount', params);
	}

	// rendering
	renderItem(item){
		let mvcmypwa = this.app.getMvcMyPWAObject();

		let uuid = item.uuid;

		let name = mvcmypwa.fitString(item.name, 21);
		let address = mvcmypwa.fitString(item.address, 21);

		return (
			<tr key={uuid} onClick={() => this.onClickItem(item)}>
				<td>{name}</td>
				<td>{address}</td>
			</tr>
		);
	}
	
	renderList() {
		let {items} = this.state;

		return (
			<Table responsive>
				<thead className="ListHeader">
					<tr>
					<th>Name</th>
					<th>Address</th>
					</tr>
				</thead>
				<tbody className="ListItem" >
				{(items && items.length ?
				items.map((item, index) => {return (this.renderItem(item));})
				: <tr className="NoList"><td>No credit account in the list</td></tr>
				)}
				</tbody>
			</Table>
		);	
	}

	render() {
		return (
			<div className="Component">
				<div className="Instructions">{this.state.title}</div>
				<div className="Explanations">{this.state.instructions}</div>
				{this.renderList()}
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
CreditAccountListView.propTypes = {
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


export {CreditAccountListView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditAccountListView);