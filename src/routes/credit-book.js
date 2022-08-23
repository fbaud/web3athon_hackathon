import CreditBookScreen from '../screens/creditbook-screen.js';

import GrantCreditScreen from '../screens/grant-credit-screen.js';
import BillScreen from '../screens/bill-screen.js';

import RequestCreditScreen from '../screens/request-credit-screen.js';
import PayScreen from '../screens/pay-screen.js';

class Routes {

	static getRoutes(app) {
		return [
			{
				name: 'creditbook',
				path: '/creditBook',
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