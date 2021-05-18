const fs = require("fs");
const nearAPI = require("near-api-js");
const getConfig = require("../../src/config");
const { nodeUrl, networkId, CONTRACT_NAME, contractMethods } = getConfig(true);
const {
  keyStores: { InMemoryKeyStore },
  Near,
  Account,
  Contract,
  KeyPair,
  utils: {
    format: { parseNearAmount },
  },
} = nearAPI;

const credentials = JSON.parse(
  fs.readFileSync(
    process.env.HOME + "/.near-credentials/testnet/" + CONTRACT_NAME + ".json"
  )
);
const keyStore = new InMemoryKeyStore();
keyStore.setKey(
  networkId,
  CONTRACT_NAME,
  KeyPair.fromString(credentials.private_key)
);
const near = new Near({
  networkId,
  nodeUrl,
  deps: { keyStore },
});
const { connection } = near;
const contractAccount = new Account(connection, CONTRACT_NAME);
contractAccount.addAccessKey = (publicKey) =>
  contractAccount.addKey(
    publicKey,
    CONTRACT_NAME,
    contractMethods.changeMethods,
    parseNearAmount("0.1")
  );
const contract = new Contract(contractAccount, CONTRACT_NAME, contractMethods);

module.exports = {
  near,
  keyStore,
  connection,
  contract,
  CONTRACT_NAME,
  contractAccount,
};
