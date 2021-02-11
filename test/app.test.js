const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const { KeyPair, Account, utils: { format: { parseNearAmount, formatNearAmount } } } = nearAPI;
const {
	connection, initContract, getAccount, getContract,
	contractAccount, contractName, contractMethods, createAccessKeyAccount
} = testUtils;
const { GAS } = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000;

describe('deploy contract ' + contractName, () => {
	let alice, contract;

	const memo = "hello world!";
	let created;

	beforeAll(async () => {
		alice = await getAccount();
		await initContract(alice.accountId);
	});

	test('contract hash', async () => {
		let state = (await new Account(connection, contractName)).state();
		expect(state.code_hash).not.toEqual('11111111111111111111111111111111');
	});

	test('check create', async () => {
		contract = await getContract(alice);

		await contract.subscribe({
			memo,
		}, GAS, parseNearAmount('12'));
		created = Date.now();

		const deposits = await contract.get_subs({ account_id: alice.accountId });
		expect(deposits[0].memo).toEqual(memo);
		expect(deposits[0].paid).toEqual(0);
	});

	test('check ping', async () => {
		contract = await getContract(alice);

		await contract.ping({
			deposit_index: 0,
		}, GAS);

		const paid = Math.floor((Date.now() - created) / 1000);
		const deposits = await contract.get_subs({ account_id: alice.accountId });
		console.log(deposits);
		expect(deposits[0].memo).toEqual(memo);
		expect(deposits[0].paid).toEqual(paid);

	});

	test('withdraw', async () => {
		contract = await getContract(alice);

		await contract.withdraw({
			deposit_index: 0,
		}, GAS);

		const account = new Account(connection, alice.accountId);
		const amount = (await account.state()).amount;
		expect(parseInt(formatNearAmount(amount, 2), 10)).toBeGreaterThan(12);
	});

	// test('check create and make payment', async () => {

	// 	await contract.make_payment({
	// 		deposit_index: 0,
	// 	}, GAS);

	// 	const deposits = await contract.get_deposits({ account_id: alice.accountId });
	// 	expect(deposits[0].paid).toEqual(true);
	// });

	// test('check cannot withdraw', async () => {

	// 	try {
	//         await contract.withdraw({
	//             deposit_index: 0,
	//         }, GAS);
	//         expect(false)
	//     } catch(e) {
	//         console.warn(e)
	//         expect(true)
	//     }
	// });

	// test('check create and withdraw', async () => {
	// 	contract = await getContract(alice);

	// 	await contract.deposit({
	// 		memo,
	// 	}, GAS, parseNearAmount('1'));

	//     await contract.withdraw({
	//         deposit_index: 1,
	//     }, GAS);

	// 	const deposits = await contract.get_deposits({ account_id: alice.accountId });
	// 	expect(deposits.length).toEqual(1);
	// 	expect(deposits[0].paid).toEqual(true);
	// });

});