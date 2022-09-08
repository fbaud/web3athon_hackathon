import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import {Header} from '@primusmoney/react_pwa/react-js-ui';
//import {Header} from '../nodemodules/@primusmoney/react_pwa/react-js-ui';

import CreditAccountView from '../components/creditaccount-view.js';


class CreditAccountScreen extends React.Component {
	
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
	
	// post render commit phase
	componentDidMount(prevProps) {
		console.log('CreditAccountScreen.componentDidMount called');

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		if (app_nav_target && (app_nav_target.route == 'creditaccount') && (app_nav_target.reached == false)) {

			// let CreditAccountView mark as reached
	   }

	   this.setState({loaded: true});		
	}
	
	renderScreen() {
		let {loaded, lineinfo} = this.state;

		return (
			<div className="Container">
				{(loaded === true ?
				<CreditAccountView app = {this.app} /> :
				<div>{lineinfo}</div>
				)}
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
CreditAccountScreen.propTypes = {
	app: PropTypes.object.isRequired
};

//redux
const mapStateToProps = (state) => {
	return {
	};
} 

const mapDispatchToProps = (dispatch) => {
	return {
	};
}


export {CreditAccountScreen};
export default connect(mapStateToProps, mapDispatchToProps)(CreditAccountScreen);