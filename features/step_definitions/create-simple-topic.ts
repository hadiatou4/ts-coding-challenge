import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  KeyList,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageQuery,
  TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";

// Pre-configured client for test network (testnet)
const client = Client.forTestnet();

// Set the operator with the account ID and private key
Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[0];
  const account: AccountId = AccountId.fromString(acc.id);
  this.account = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey = privKey;
  client.setOperator(this.account, privKey);

  // Create the query request
  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.privKey.publicKey);
  const receipt = await (await transaction.execute(client)).getReceipt(client);
  this.topicId = receipt.topicId;
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message);
  const response = await transaction.execute(client);
  await response.getReceipt(client);
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (message: string) {
  const query = new TopicMessageQuery().setTopicId(this.topicId);
  // Listening to the published messages for the topic
  query.subscribe(client, null, (receivedMessage) => {
    const receivedContent = Buffer.from(receivedMessage.contents).toString();
    // Comparing that the published message is equal to the expected message
    assert.strictEqual(receivedContent, message);
  });
});

Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[1];
  const account: AccountId = AccountId.fromString(acc.id);
  this.secondAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.secondPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold: number, total: number) {
  const firstKey = this.privKey.publicKey;
  const secondKey = this.secondPrivKey.publicKey;
  const keyList = new KeyList([firstKey, secondKey], threshold);
  this.thresholdKey = keyList;
});

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, async function (memo: string) {
  const transaction = new TopicCreateTransaction()
    .setSubmitKey(this.thresholdKey)
    .setTopicMemo(memo);

  const receipt = await (await transaction.execute(client)).getReceipt(client);
  this.topicId = receipt.topicId;
});

When(/^The message "([^"]*)" is published to the topic with threshold key$/, async function (message: string) {
  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message);

  const response = await transaction.execute(client);
  await response.getReceipt(client);
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console with threshold key$/, async function (message: string) {
  const query = new TopicMessageQuery().setTopicId(this.topicId);

  query.subscribe(client, null, (receivedMessage) => {
    const receivedContent = Buffer.from(receivedMessage.contents).toString();
    console.log(`Message reçu : ${receivedContent}`);
    assert.strictEqual(receivedContent, message);
  });

  await new Promise(resolve => setTimeout(resolve, 5000));
});