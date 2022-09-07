import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

//import {Header} from '@primusmoney/react_pwa/react-js-ui';
import {Header} from '../nodemodules/@primusmoney/react_pwa/react-js-ui';

import CreditCardListView from '../components/creditcard-list-view.js';

class CreditCardListScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.state = {
			loaded: false,
			lineinfo: 'loading...'
		};		
	}
	
	componentDidMount(prevProps) {
		console.log('CreditCardListScreen.componentDidMount called');
		
		this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	
	}

	async checkNavigationState() {
		this.checking = true;

		try {
			let mvcmycreditbook = this.getMvcMyCreditBookObject();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;
	
			let app_nav_state = this.app.getNavigationState();
			let app_nav_target = app_nav_state.target;

			let creditbook_list = await mvcmycreditbook.readCreditBooks(rootsessionuuid, walletuuid);

			console.log('');
	
		}
		catch(e) {
			console.log('exception in CreditCardListScreen.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		this.setState({loaded: true});
	}
	
	// end of life
	componentWillUnmount() {
		console.log('CreditCardListScreen.componentWillUnmount called');
		let app = this.app;
		let mvcmycreditbook = this.getMvcMyCreditBookObject();
		
	}
	
	renderScreen() {
		let {lineinfo} = this.state;

		return (
			<div className="Container">
				<div className="Instructions">List of credit cards</div>
				<CreditCardListView {...this.props} app = {this.app} parent={this} />
			</div>
		);		
	}
	
	render() {
		return (
			<div className="Screen">
				<Header app = {this.app}/>
				{this.renderScreen()}
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
CreditCardListScreen.propTypes = {
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


export {CreditCardListScreen};
export default connect(mapStateToProps, mapDispatchToProps)(CreditCardListScreen);