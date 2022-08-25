import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import { Button, FormGroup, FormControl, FormLabel } from 'react-bootstrap';

//import {Header} from '@primusmoney/react_pwa';
import {Header} from '../nodemodules/@primusmoney/react_pwa';

import CreditBookCreateForm from '../components/creditbook-create-form.js';
import CreditBookView from '../components/creditbook-view.js';


class CreditBookScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;
		
		this.getMvcMyPWAObject = this.app.getMvcMyPWAObject;
		this.getMvcMyCreditBookObject = this.app.getMvcMyCreditBookObject;

		this.state = {
			action: 'create',
			loaded: false,
			lineinfo: 'loading...'
		};		
	}
	
	// post render commit phase
	componentDidMount() {
		console.log('CreditBookHomeScreen.componentDidMount called');
		let mvcmypwa = this.app.getMvcMyPWAObject();
		
		mvcmypwa.registerEventListener('on_refreshPage', this.uuid, this.onRefreshPage.bind(this));
		
		this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	}

	async checkNavigationState() {

		let rootsessionuuid = this.props.rootsessionuuid;



		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;


		if (app_nav_target && (app_nav_target.route == 'creditbook') && (app_nav_target.reached == false)) {
			var params = app_nav_target.params;

			if (params) {
				let lineinfo = '';
				let action = (params.action ? params.action : 'create');
	

				this.setState({action, lineinfo});
			}

			// CreditBookView or CreditBookCreateForm will take care of marking target reached
		}

		this.setState({loaded: true});
	}

	async onRefreshPage() {
		console.log('CreditBookHomeScreen.onRefreshPage called');

		return this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	}
	
	// end of life
	componentWillUnmount() {
		console.log('CreditBookHomeScreen.componentWillUnmount called');
		let app = this.app;
		let mvcmypwa = this.getMvcMyPWAObject();
		
		mvcmypwa.unregisterEventListener('on_refreshPage', this.uuid);
	}
	

	renderScreen() {
		let {loaded, action, lineinfo} = this.state;

		return (
			<div className="Container">
				{(loaded === true ?
				(action === 'view' ?
				<CreditBookView app = {this.app} /> :
				<CreditBookCreateForm app = {this.app} />) :
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
CreditBookScreen.propTypes = {
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


export {CreditBookScreen};
export default connect(mapStateToProps, mapDispatchToProps)(CreditBookScreen);