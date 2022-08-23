import CreditBookListScreen from '../screens/creditbook-list-screen.js';
import CreditBookScreen from '../screens/creditbook-home-screen.js';

import GrantCreditScreen from '../screens/grant-credit-screen.js';
import BillScreen from '../screens/bill-screen.js';

import CreditCardListScreen from '../screens/creditcard-list-screen.js';
import CreditCardScreen from '../screens/creditcard-home-screen.js';

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
				name: 'creditbook grant',
				path: '/creditbook_grant',
				screen: GrantCreditScreen
			},
			{
				name: 'creditbook bill',
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
				name: 'creditbook request',
				path: '/creditbook_request',
				screen: RequestCreditScreen
			},
			{
				name: 'creditbook pay',
				path: '/creditbook_pay',
				screen: PayScreen
			}
		];
	}
}

export default Routes;