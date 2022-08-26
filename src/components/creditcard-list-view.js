import React, { Component } from 'react';
import { connect } from 'react-redux';

import { Table } from 'react-bootstrap';


import PropTypes from 'prop-types';

import '../css/poc.css';



class CreditCardListView extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;
		
		this.uuid = this.app.guid();

		this.checking = false;

		this.state = {
			title: 'Credit Cards',
			instructions: 'Click on the credit card you want to open.',
			items: []
		};		
	}


	// post render commit phase
	componentDidUpdate(prevProps) {
		console.log('CreditCardListView.componentDidUpdate called');
		
	}

	componentDidMount() {
		console.log('CreditCardListView.componentDidMount called');

		this.checkNavigationState().catch(err => {console.log('error in CreditCardListView.checkNavigationState: ' + err);});
		
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

			let cards = await mvcmycreditbook.readCreditCards(rootsessionuuid, walletuuid);

			this.setState({items: cards});
	}
		catch(e) {
			console.log('exception in CreditCardListView.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		

	}

	// end of life
	componentWillUnmount() {
		console.log('CreditCardListView.componentWillUnmount called');

		// unregister to window events

	}


	// user action
	async onClickItem(item) {
		console.log('CreditCardListView.onClickItem pressed!');

		let creditcarduuid = item.uuid;

		let params = {action: 'view', creditcarduuid};

		this.app.gotoRoute('creditcard', params);
	}

	// rendering
	renderItem(item){
		let mvcmypwa = this.app.getMvcMyPWAObject();

		let uuid = item.uuid;

		let name = mvcmypwa.fitString(item.uuid, 21);
		let address = mvcmypwa.fitString(item.credittoken, 21);

		return (
			<tr key={uuid} onClick={() => this.onClickItem(item)}>
				<td>{uuid}</td>
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
				: <tr className="NoList"><td>No credit card in the list</td></tr>
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
CreditCardListView.propTypes = {
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


export {CreditCardListView};
export default connect(mapStateToProps, mapDispatchToProps)(CreditCardListView);