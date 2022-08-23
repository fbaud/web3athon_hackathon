import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import { Button, FormGroup, FormControl, FormLabel } from 'react-bootstrap';

//import {Header} from '@primusmoney/react_pwa';
import {Header} from '../nodemodules/@primusmoney/react_pwa';



class CreditBookScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;

		this.getMvcMyPWA = this.app.getMvcMyPWA;

		this.state = {
			loaded: false,
			lineinfo: 'loading...'
		};		
	}
	
	componentDidMount(prevProps) {
		console.log('CreditBookScreen.componentDidMount called');
		
		this.checkNavigationState().catch(err => {console.log('error in checkNavigationState: ' + err);});
	
	}

	async checkNavigationState() {
		this.checking = true;

		try {
			let mvcmypwa = this.getMvcMyPWA();

			let rootsessionuuid = this.props.rootsessionuuid;
			let walletuuid = this.props.currentwalletuuid;
	
			let app_nav_state = this.app.getNavigationState();
			let app_nav_target = app_nav_state.target;

			let creditbook_list = await mvcmypwa.readCreditBooks(rootsessionuuid, walletuuid);

			console.log('');
	
		}
		catch(e) {
			console.log('exception in CreditBookScreen.checkNavigationState: '+ e);
		}
		finally {
			this.checking = false;
		}
		this.setState({loaded: true});
	}
	
	// end of life
	componentWillUnmount() {
		console.log('CreditBookScreen.componentWillUnmount called');
		let app = this.app;
		let mvcmyquote = this.getMvcMyQuoteObject();
		
	}
	
	renderScreen() {
		let {lineinfo} = this.state;

		return (
			<div className="Container">
				<div className="Instructions">Credit Book.</div>
				<div className="Form">
					<FormGroup controlId="url">
					<FormLabel>Url</FormLabel>
					<FormControl
						autoFocus
						type="text"
						value={lineinfo}
						onChange={e => this.setState({url: e.target.value})}
					/>
					</FormGroup>
				</div>
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


export {CreditBookScreen};
export default connect(mapStateToProps, mapDispatchToProps)(CreditBookScreen);