import React, { Component } from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

import { Button, FormGroup, FormControl, FormLabel } from 'react-bootstrap';

//import {Header} from '@primusmoney/react_pwa';
import {Header} from '../nodemodules/@primusmoney/react_pwa';



class RequestCreditScreen extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.app = this.props.app;
		this.getMvcModuleObject = this.app.getMvcModuleObject;

		this.state = {
			url: ''
		};		
	}
	
	componentDidMount(prevProps) {
		console.log('RequestCreditScreen.componentDidMount called');

		let app_nav_state = this.app.getNavigationState();
		let app_nav_target = app_nav_state.target;

		if (app_nav_target && (app_nav_target.route == 'deeplink') && (app_nav_target.reached == false)) {
			// we want to login before completing previous route
			let params = app_nav_target.params;

			if (params && params.url) {
				this.setState({url: params.url});
			}

			app_nav_target.reached = true;
	   }
	   else {
			// direct call from browser
			let app_start_conditions = this.app.getVariable('start_conditions');
			let urlParams = app_start_conditions.urlParams;

			let _url;
			let _encodedurl = urlParams.get('linkurl');

			if (_encodedurl) {
				if (_encodedurl.startsWith('b64_'))
					_url = this.app.decodebase64(_encodedurl.substring(4));
				else if (_encodedurl.startsWith('hex_'))
					_url = this.app.decodehex(_encodedurl.substring(4));

				this.setState({url: _url});
			}

	   }
		
	}
	
	async onGotoLink() {
		console.log('RequestCreditScreen.onGotoLink pressed!');

		let {url} = this.state;
 
		await this.app.gotoUrl(url);
	}

	renderScreen() {
		let {url} = this.state;

		return (
			<div className="Container">
				<div className="Instructions">Request Credit.</div>
				<div className="Form">
					<FormGroup controlId="url">
					<FormLabel>Url</FormLabel>
					<FormControl
						autoFocus
						type="text"
						value={url}
						onChange={e => this.setState({url: e.target.value})}
					/>
					</FormGroup>
					<Button onClick={this.onGotoLink.bind(this)} type="submit">
						Go
					</Button>
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
RequestCreditScreen.propTypes = {
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


export {RequestCreditScreen};
export default connect(mapStateToProps, mapDispatchToProps)(RequestCreditScreen);