import CreditBookListScreen from '../screens/creditbook-list-screen.js';
import CreditBookScreen from '../screens/creditbook-home.js';

import CreditAccountScreen from '../screens/creditaccount-home.js';

import GrantCreditScreen from '../screens/grant-credit-screen.js';
import BillScreen from '../screens/bill-screen.js';

import CreditCardListScreen from '../screens/creditcard-list-screen.js';
import CreditCardScreen from '../screens/creditcard-home.js';

import RequestCreditScreen from '../screens/request-credit-screen.js';
import PayScreen from '../screens/pay-screen.js';

class Routes {

	static getRoutes(app) {
		return [
			{
				name: 'creditbooks',
				path: '/creditbooks',
				screen: CreditBookListScreen
			},
			{
				name: 'creditbook',
				path: '/creditbook',
				screen: CreditBookScreen
			},
			{
				name: 'creditaccount',
				path: '/creditaccount',
				screen: CreditAccountScreen
			},
			{
				name: 'creditbookgrant',
				path: '/creditbook_grant',
				screen: GrantCreditScreen
			},
			{
				name: 'creditbookbill',
				path: '/creditbook_bill',
				screen: BillScreen
			},
			{
				name: 'creditcards',
				path: '/creditcards',
				screen: CreditCardListScreen
			},
			{
				name: 'creditcard',
				path: '/creditcard',
				screen: CreditCardScreen
			},
			{
				name: 'creditbookrequest',
				path: '/creditbook_request',
				screen: RequestCreditScreen
			},
			{
				name: 'creditbookpay',
				path: '/creditbook_pay',
				screen: PayScreen
			}
		];
	}
}

export default Routes;