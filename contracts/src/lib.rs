use borsh::{ BorshDeserialize, BorshSerialize };
use near_sdk::{
    env, near_bindgen, AccountId, Balance, PublicKey, Promise,
    collections::{ UnorderedMap },
    json_types::{ U128, Base58PublicKey },
};
use serde::Serialize;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

const SECOND: u64 = 1_000_000_000;
const FULL_PERIOD: u8 = 12;

#[near_bindgen]

#[derive(Debug, Serialize, BorshDeserialize, BorshSerialize)]
pub struct Deposit {
    pub memo: String,
    pub amount: U128,
    pub paid: u8,
    pub created: u64,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Subscription {
    pub owner_id: AccountId,
    pub deposits: UnorderedMap<AccountId, Vec<Deposit>>,
}

impl Default for Subscription {
    fn default() -> Self {
        panic!("Should be initialized before usage")
    }
}

#[near_bindgen]
impl Subscription {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(env::is_valid_account_id(owner_id.as_bytes()), "Invalid owner account");
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner_id,
            deposits: UnorderedMap::new(b"deposits".to_vec()),
        }
    }

    #[payable]
    pub fn subscribe(&mut self, memo: String) {
        assert!(memo.len() < 64, "memo too long");
        let amount = env::attached_deposit();
        let account_id = env::signer_account_id();
        let mut deposits = self.deposits.get(&account_id).unwrap_or(vec![]);
        deposits.push(Deposit{
            memo,
            amount: amount.into(),
            paid: 0,
            created: env::block_timestamp(),
        });
        self.deposits.insert(&account_id, &deposits);
    }

    pub fn withdraw(&mut self, deposit_index: usize) {
        let account_id = env::signer_account_id();
        self.ping(deposit_index);
        let deposits = self.deposits.get(&account_id).unwrap_or(vec![]);
        let deposit = deposits.get(deposit_index).expect("no deposit");

        assert!(deposit.paid < FULL_PERIOD, "subscription fulfilled");
        let portions: u128 = u128::from(deposit.amount) / FULL_PERIOD as u128;
        let unpaid: u128 = FULL_PERIOD as u128 - deposit.paid as u128;
        Promise::new(account_id).transfer(portions * unpaid);
    }

    pub fn ping(&mut self, deposit_index: usize) {
        let account_id = env::signer_account_id();
        let mut deposits = self.deposits.get(&account_id).unwrap_or(vec![]);
        let deposit = deposits.get_mut(deposit_index).expect("no deposit");
        let ts = env::block_timestamp();
        deposit.paid = ((ts - deposit.created) / SECOND as u64) as u8;
        self.deposits.insert(&account_id, &deposits);
    }

    /// view methods

    pub fn get_subs(&self, account_id: AccountId) -> Vec<Deposit> {
        self.deposits.get(&account_id).unwrap_or(vec![])
    }
}

// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::convert::TryFrom;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};
    
    fn ntoy(near_amount: u128) -> U128 {
        U128(near_amount * 10u128.pow(24))
    }

    fn get_context() -> VMContext {
        VMContext {
            predecessor_account_id: "alice.testnet".to_string(),
            current_account_id: "alice.testnet".to_string(),
            signer_account_id: "bob.testnet".to_string(),
            signer_account_pk: vec![0],
            input: vec![],
            block_index: 0,
            block_timestamp: 0,
            account_balance: 0,
            account_locked_balance: 0,
            attached_deposit: 0,
            prepaid_gas: 10u64.pow(18),
            random_seed: vec![0, 1, 2],
            is_view: false,
            output_data_receivers: vec![],
            epoch_height: 19,
            storage_usage: 1000
        }
    }

    #[test]
    fn make_deposit() {
        let mut context = get_context();
        context.attached_deposit = ntoy(1).into();
        testing_env!(context.clone());

        let mut contract = Subscription::new(context.current_account_id.clone());
        contract.subscribe("take my money".to_string());

        context.block_timestamp = 1_000_000_000;
        testing_env!(context.clone());

        let deposits = contract.ping(0);
        let deposits = contract.get_subs(context.signer_account_id.clone());

        assert_eq!(deposits.get(0).unwrap().paid, 1);
    }

}