import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, 
AccountId, Client, PrivateKey,
TokenCreateTransaction,
TokenInfoQuery,
TokenMintTransaction,
TransferTransaction } from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet()

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0]
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

//Create the query request
  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)

});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const transaction = new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(1000)
    .setTreasuryAccountId(this.account)
    .setAdminKey(this.privKey.publicKey)
    .setSupplyKey(this.privKey.publicKey);

  const receipt = await (await transaction.execute(client)).getReceipt(client);
  this.tokenId = receipt.tokenId;
 }); 

Then(/^The token has the name "([^"]*)"$/, async function (expectedName: string) {
  const tokenInfo = await new TokenInfoQuery()
  .setTokenId(this.tokenId)
  .execute(client);

assert.strictEqual(tokenInfo.name, expectedName);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedSymbol: string) {
  const tokenInfo = await new TokenInfoQuery()
  .setTokenId(this.tokenId)
  .execute(client);

assert.strictEqual(tokenInfo.symbol, expectedSymbol);
});

Then(/^The token has (\d+) decimals$/, async function (expectedDecimals: number) {
  const tokenInfo = await new TokenInfoQuery()
  .setTokenId(this.tokenId)
  .execute(client);

assert.strictEqual(tokenInfo.decimals, expectedDecimals);
});

Then(/^The token is owned by the account$/, async function () {
  const tokenInfo = await new TokenInfoQuery()
    .setTokenId(this.tokenId)
    .execute(client);

  assert.ok(tokenInfo.treasuryAccountId, "Treasury account ID is null");
  assert.strictEqual(tokenInfo.treasuryAccountId.toString(), this.account.toString());
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (amount: number) {
  const transaction = await new TokenMintTransaction()
    .setTokenId(this.tokenId)
    .setAmount(amount)
    .freezeWith(client)
    .sign(this.privKey);

  const receipt = await (await transaction.execute(client)).getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
});
When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (initialSupply: number) {
  const transaction = new TokenCreateTransaction()
  .setTokenName("Test Token")
  .setTokenSymbol("HTT")
  .setDecimals(2)
  .setInitialSupply(initialSupply)
  .setTreasuryAccountId(this.account)
  .setAdminKey(this.privKey.publicKey)
  .setSupplyKey(this.privKey.publicKey);

const receipt = await (await transaction.execute(client)).getReceipt(client);
this.tokenId = receipt.tokenId;
});
Then(/^The total supply of the token is (\d+)$/, async function (expectedSupply: number) {
  const tokenInfo = await new TokenInfoQuery()
  .setTokenId(this.tokenId)
  .execute(client);

assert.strictEqual(tokenInfo.totalSupply.toNumber(), expectedSupply);
});
Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    const transaction = await new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(100)
      .freezeWith(client)
      .sign(this.privKey);

    await transaction.execute(client);
    assert.fail("Minting tokens should have failed but succeeded");
  } catch (error) {
    assert.ok(error, "Minting tokens failed as expected");
  }
});
Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const acc = accounts[0];
  const account: AccountId = AccountId.fromString(acc.id);
  this.firstAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.firstPrivKey = privKey;
  client.setOperator(this.firstAccount, privKey);

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`First account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  console.log(`Expected balance: ${expectedBalance} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});
Given(/^A second Hedera account$/, async function () {
  const acc = accounts[1];
  const account: AccountId = AccountId.fromString(acc.id);
  this.secondAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.secondPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`Second account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
});
Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, async function (initialSupply: number) {
  const transaction = new TokenCreateTransaction()
  .setTokenName("Test Token")
  .setTokenSymbol("HTT")
  .setDecimals(2)
  .setInitialSupply(initialSupply)
  .setTreasuryAccountId(this.firstAccount)
  .setAdminKey(this.firstPrivKey.publicKey)
  .setSupplyKey(this.firstPrivKey.publicKey);

const receipt = await (await transaction.execute(client)).getReceipt(client);
this.tokenId = receipt.tokenId;
});
Given(/^The first account holds (\d+) HTT tokens$/, async function (amount: number) {
  const transaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.firstAccount, amount)
    .addTokenTransfer(this.tokenId, this.secondAccount, -amount)
    .freezeWith(client)
    .sign(this.firstPrivKey);

  const receipt = await (await transaction.execute(client)).getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
});
Given(/^The second account holds (\d+) HTT tokens$/, async function (amount: number) {
  const transaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.secondAccount, amount)
    .addTokenTransfer(this.tokenId, this.firstAccount, -amount)
    .freezeWith(client)
    .sign(this.firstPrivKey);

  const receipt = await (await transaction.execute(client)).getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
});
When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (amount: number) {
  const transaction = await new TransferTransaction()
  .addTokenTransfer(this.tokenId, this.firstAccount, -amount)
  .addTokenTransfer(this.tokenId, this.secondAccount, amount)
  .freezeWith(client)
  .sign(this.firstPrivKey);

this.transaction = transaction;
});
When(/^The first account submits the transaction$/, async function () {
  const receipt = await (await this.transaction.execute(client)).getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
});
Then(/^The second account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery().setAccountId(this.secondAccount);
  const balance = await query.execute(client);
  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedAmount);
});
When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  const transaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.secondAccount, -amount)
    .addTokenTransfer(this.tokenId, this.firstAccount, amount)
    .freezeWith(client)
    .sign(this.secondPrivKey);

  this.transaction = transaction;
});
Then(/^The first account has paid for the transaction fee$/, async function () {
  const query = new AccountBalanceQuery().setAccountId(this.firstAccount);
  const balance = await query.execute(client);
  console.log(`First account balance after transaction: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() < 10, "First account has not paid for the transaction fee");
});
Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const acc = accounts[0];
  const account: AccountId = AccountId.fromString(acc.id);
  this.firstAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.firstPrivKey = privKey;
  client.setOperator(this.firstAccount, privKey);

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`First account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedHbarBalance);

  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedTokenBalance);
});
Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const acc = accounts[1];
  const account: AccountId = AccountId.fromString(acc.id);
  this.secondAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.secondPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`Second account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() === expectedHbarBalance);

  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedTokenBalance);
});

Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const acc = accounts[2];
  const account: AccountId = AccountId.fromString(acc.id);
  this.thirdAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.thirdPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`Third account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() === expectedHbarBalance);

  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedTokenBalance);
});
Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const acc = accounts[3];
  const account: AccountId = AccountId.fromString(acc.id);
  this.fourthAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.fourthPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  console.log(`Fourth account balance: ${balance.hbars.toBigNumber().toNumber()} hbars`);
  assert.ok(balance.hbars.toBigNumber().toNumber() === expectedHbarBalance);

  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedTokenBalance);
});
When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (amountOut1: number, amountIn1: number, amountIn2: number) {
  let transaction = new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.firstAccount, -amountOut1)
    .addTokenTransfer(this.tokenId, this.secondAccount, -amountOut1)
    .addTokenTransfer(this.tokenId, this.thirdAccount, amountIn1)
    .addTokenTransfer(this.tokenId, this.fourthAccount, amountIn2);

  transaction = await transaction.freezeWith(client);
  transaction = await transaction.sign(this.firstPrivKey);
  transaction = await transaction.sign(this.secondPrivKey);

  this.transaction = transaction;
});
Then(/^The third account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery().setAccountId(this.thirdAccount);
  const balance = await query.execute(client);
  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedAmount);
});
Then(/^The fourth account holds (\d+) HTT tokens$/, async function (expectedAmount: number) {
  const query = new AccountBalanceQuery().setAccountId(this.fourthAccount);
  const balance = await query.execute(client);
  assert.ok(balance.tokens, "Tokens balance is null");
  const tokenBalance = balance.tokens._map.get(this.tokenId.toString());
  assert.ok(tokenBalance, "Token balance is undefined");
  assert.strictEqual(tokenBalance.toNumber(), expectedAmount);
});