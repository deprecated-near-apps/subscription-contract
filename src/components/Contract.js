import React, { useEffect, useState } from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount, updateWallet } from '../state/near';
import {
	createAccessKeyAccount,
	getContract,
} from '../utils/near-utils';

const {
	KeyPair,
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Contract = ({ near, update, account, dispatch }) => {
	if (!account) return null;

	const [memo, setMemo] = useState('');
	const [deposits, setDeposits] = useState([]);
	const [amount, setAmount] = useState('');

	useEffect(() => {
		loadDeposits();
	}, []);

	const loadDeposits = async () => {
		const contract = getContract(account);
		setDeposits(await contract.get_subs({ account_id: account.accountId }));
	};

	const handleDeposit = async () => {
		const contract = getContract(account);
		await contract.subscribe({
			memo
		}, GAS, parseNearAmount(amount));
		loadDeposits();
	};

	const handlePing = async (deposit_index) => {
		const contract = getContract(account);
		await contract.ping({
			deposit_index
		}, GAS);
		loadDeposits();
	};

	const handleWithdraw = async (deposit_index) => {
		const contract = getContract(account);
		try {
			await contract.withdraw({
				deposit_index
			}, GAS);
		} catch(e) {
			alert('payment already confirmed');
		}
		loadDeposits();
		dispatch(updateWallet());
	};

	return <>
		<h3>Subscribe</h3>
		<input placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
		<input placeholder="Amount (N)" value={amount} onChange={(e) => setAmount(e.target.value)} />
		<br />
		<button onClick={() => handleDeposit()}>Handle Deposit</button>

		{
			deposits.map(({ memo, paid, amount }, i) => <>
				<p>
					{memo} - {formatNearAmount(amount, 2)} - {paid} / 12
					<br />
					<button onClick={() => handlePing(i)}>Ping Sub</button>
					<button onClick={() => handleWithdraw(i)}>Handle Withdraw</button>
				</p>
			</>)
		}

	</>;
};

