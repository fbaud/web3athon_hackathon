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

			// look for credit books
			let creditbooks = await mvcmycreditbook.readCreditBooks(rootsessionuuid, walletuuid).catch(err => {});

			let items = [];

			for (var i = 0; i < creditbooks.length; i++) {
				let creditbook = creditbooks[i];
				let bookcurrency = 	await mvcmypwa.getCurrencyFromUUID(rootsessionuuid, creditbooks[i].currencyuuid).catch(err => {});

				let item = {uuid: creditbooks[i].uuid, address: creditbooks[i].address, title: creditbooks[i].title, currency: bookcurrency};

				item.formattedtime = mvcmypwa.formatDate(creditbooks[i].savetime/1000, 'YYYY-mm-dd HH:MM:SS');

				items.push(item);
			}

			this.setState({items});
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


	// user action
	async onClickItem(item) {
		console.log('CreditBookListView.onClickItem pressed!');

		let creditbookuuid = item.uuid;

		let params = {action: 'view', creditbookuuid};

		this.app.gotoRoute('creditbook', params);
	}

	// rendering
	renderItem(item){
		let mvcmypwa = this.app.getMvcMyPWAObject();

		let uuid = item.uuid;

		let title = mvcmypwa.fitString(item.title, 21);
		let currency = item.currency;
		let time = item.formattedtime;
		let currency_symbol = (currency ?  currency.symbol : '?');


		return (
			<tr key={uuid} onClick={() => this.onClickItem(item)}>
				<td>{time}</td>
				<td>{currency_symbol}</td>
				<td>{title}</td>
			</tr>
		);
	}
	
	renderList() {
		let {items} = this.state;

		return (
			<Table responsive>
				<thead className="ListHeader">
					<tr>
					<th>Time</th>
					<th>Ccy</th>
					<th>Title</th>
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