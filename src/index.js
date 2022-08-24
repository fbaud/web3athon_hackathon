import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';

//import ReactPWA from '@primusmoney/react_pwa';
import ReactPWA from './nodemodules/@primusmoney/react_pwa';

//import {App} from '@primusmoney/react_pwa';
import {App} from './nodemodules/@primusmoney/react_pwa';
//const App = ReactPWA.getAppClass();

console.log('loading index.js');

// app config
var EXEC_ENV = 'dev';
var PWA_APP_VERSION = '0.40.22.2022.08.22';


App.EXEC_ENV = EXEC_ENV;

async function beforeAppLoad() {
	// we fill the xtra route modules for pocs
	const AppStore = App.getAppStore();
	AppStore.route_modules = {};

	// auth-card POC
	AppStore.route_modules['creditbook'] = await import('./routes/credit-book.js');

	return true;
}

async function afterAppLoad() {

	// load mvc-mycreditbook module
	require('./model/module-load.js');

	var app = App.getAppObject();
	app.current_version += ' - creditbook: ' + PWA_APP_VERSION;

	// get creditbook api
	var react_pwa = ReactPWA.getObject();
	var clientglobal = react_pwa.getGlobalObject();
	var mvcmycreditbook = clientglobal.getModuleObject('mvc-mycreditbook');

	app.getMvcMyCreditBookObject = () => { return mvcmycreditbook};
}

try {
	var react_pwa = ReactPWA.getObject();

	if (EXEC_ENV === 'prod')  {
		// suppress logs early, before doing it in App.onLoaded()
		// to avoid all the logs of react_pwa.init
		if (window.simplestore)	window.simplestore.noconsoleoverload = false;

		// could use react_pwa.muteConsoleLog() for version >= 0.30.11
	}

 	console.log('starting initialization of react pwa in index.js');
	react_pwa.init()
	.then( (res) => {
		return beforeAppLoad();
	})
	.then((res) => {
		if (res) {
			console.log('initialization of react pwa finished in index.js');

			var clientglobal = react_pwa.getGlobalObject();

			if (EXEC_ENV === 'dev') {
				clientglobal.setExecutionEnvironment('dev');
				console.log('Execution environment turned to dev in index.js');
			}

			
			var appcore = App.getAppObject();

			return appcore.onLoaded();
		}
		else {
			throw new Error('react pwa did not initialize correctly');
		}
	})
	.then((res) => {
		console.log('app core is now loaded in index.js');

		return afterAppLoad();
	})
	.catch((err) => {
		console.log('error initializing react pwa : ' + err);
	});

}
catch(e) {
	console.log('exception in index.js: ' + e);
	console.log(e.stack);
}
 
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
