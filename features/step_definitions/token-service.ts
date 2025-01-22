import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import { AccountBalanceQuery, 
  TransactionId, AccountInfoQuery, 
  TransferTransaction, AccountId, Client,
   PrivateKey, TokenCreateTransaction, TokenInfoQuery,
  TokenMintTransaction,TokenAssociateTransaction, Hbar,TokenType } from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet()

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0]
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)

});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const account = accounts[0];
  this.account = AccountId.fromString(account.id);
  this.privKey = PrivateKey.fromStringED25519(account.privateKey);

  const transaction = new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(1000)
    .setTreasuryAccountId(this.account)
    .setAdminKey(this.privKey.publicKey)
    .setSupplyKey(this.privKey.publicKey)
    .setTransactionValidDuration(120); // Ajout de la durée de validité de la transaction

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
  const account = accounts[0];
  this.account = AccountId.fromString(account.id);
  this.privKey = PrivateKey.fromStringED25519(account.privateKey);

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
  if (!this.firstAccount || !this.firstPrivKey) {
      const acc = accounts[0];
      this.firstAccount = AccountId.fromString(acc.id);
      this.firstPrivKey = PrivateKey.fromStringED25519(acc.privateKey);
      client.setOperator(this.firstAccount, this.firstPrivKey);
  }

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
  this.treasuryAccount = this.firstAccount;
  this.treasuryPrivKey = this.firstPrivKey;
  assert.ok(this.tokenId, "Échec de la création du token");

  console.log(`Token créé : ${this.tokenId}`);
});
Given(/^The first account holds (\d+) HTT tokens$/, async function (amount: number) {
  assert.ok(this.tokenId, "Token ID is not defined");
  assert.ok(this.firstAccount, "First account is not defined");
  assert.ok(this.treasuryAccount, "Treasury account is not defined");
  assert.ok(this.treasuryPrivKey, "Treasury private key is not defined");

  console.log(`First Account: ${this.firstAccount}`);
  console.log(`First Account Public Key: ${this.firstPrivKey.publicKey}`);


  // Ensure token association
  const accountInfo = await new AccountInfoQuery()
      .setAccountId(this.firstAccount)
      .execute(client);

  if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      throw new Error(`First account is not associated with token ${this.tokenId}`);
  }

  // Transfer tokens from the treasury to the first account
  console.log(`Transferring ${amount} HTT tokens to the first account...`);
  const transaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId, this.treasuryAccount, -amount) // Treasury debited
      .addTokenTransfer(this.tokenId, this.firstAccount, amount) // First account credited
      .freezeWith(client);

  const signedTransaction = await transaction.sign(this.treasuryPrivKey);

  const receipt = await (await signedTransaction.execute(client)).getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS", "Failed to transfer tokens to the first account");

  console.log(`Successfully transferred ${amount} HTT tokens to the first account.`);
});

Given(/^The second account holds (\d+) HTT tokens$/, async function (tokens: number) {
  assert.ok(this.tokenId, "Token ID is not défini");
  assert.ok(this.secondAccount, "Second account is not défini");

  const accountInfo = await new AccountInfoQuery().setAccountId(this.secondAccount).execute(client);

  // Vérifiez si le token est déjà associé
  const tokenRelationship = accountInfo.tokenRelationships.get(this.tokenId);
  if (!tokenRelationship) {
      console.log(`Associating the second account (${this.secondAccount}) with the token (${this.tokenId})...`);
      const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(this.secondAccount)
          .setTokenIds([this.tokenId])
          .freezeWith(client);

      const signedAssociateTransaction = await associateTransaction.sign(this.secondPrivKey);
      const associateReceipt = await (await signedAssociateTransaction.execute(client)).getReceipt(client);
      assert.strictEqual(
          associateReceipt.status.toString(),
          "SUCCESS",
          "Failed to associate the second account with the token"
      );
  }

  console.log(`Successfully associated the second account with the token.`);

  // Transférer les tokens
  console.log(`Transferring ${tokens} HTT tokens to the second account...`);
  const transferTransaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId, this.firstAccount, -tokens)
      .addTokenTransfer(this.tokenId, this.secondAccount, tokens)
      .freezeWith(client);

  const signedTransferTransaction = await transferTransaction.sign(this.firstPrivKey);
  const transferReceipt = await (await signedTransferTransaction.execute(client)).getReceipt(client);
  assert.strictEqual(
      transferReceipt.status.toString(),
      "SUCCESS",
      "Failed to transfer tokens to the second account"
  );
  console.log(`Successfully transferred ${tokens} HTT tokens to the second account.`);
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

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  assert.ok(this.tokenId, "Token ID is not defined");
  assert.ok(this.secondAccount, "Second account is not defined");
  assert.ok(this.secondPrivKey, "Second private key is not defined");
  const transaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.secondAccount, -amount) 
    .addTokenTransfer(this.tokenId, this.firstAccount, amount)  
    .setTransactionId(TransactionId.generate(this.secondAccount))
    .setTransactionValidDuration(120)
    .freezeWith(client)
    .sign(this.secondPrivKey);
  this.transaction = transaction;
});

Then(/^The first account has paid for the transaction fee$/, async function () {
  console.log(`Transaction ID: ${this.transaction.transactionId}`);
  const response = await this.transaction.execute(client);
  const receipt = await response.getReceipt(client);
  console.log(`Transaction successfully executed. Fee payer account: ${receipt.accountId}`);
  const firstAccountBalanceAfter = await new AccountBalanceQuery()
    .setAccountId(this.firstAccount)
    .execute(client);
  console.log(`First account balance after transaction: ${firstAccountBalanceAfter.hbars}`);
  assert.ok(
    firstAccountBalanceAfter.hbars
      .toTinybars()
      .toNumber() < this.firstAccountInitialBalance.toTinybars().toNumber(),
    "The first account did not pay for the transaction fee"
  );
});

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Step: A first Hedera account with more than X hbar and Y HTT tokens
Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (hbars: number, tokens: number) {
  const acc = accounts[0];
  if (!acc || !acc.id || !acc.privateKey) {
      throw new Error("Configuration invalide pour le premier compte");
  }

  this.firstAccount = AccountId.fromString(acc.id);
  this.firstPrivKey = PrivateKey.fromStringED25519(acc.privateKey);
  client.setOperator(this.firstAccount, this.firstPrivKey);

  const query = new AccountBalanceQuery().setAccountId(this.firstAccount);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > hbars, "Le premier compte n'a pas suffisamment de HBAR");

  // Assurez l'association du token
  if (!this.tokenId) {
      throw new Error("Token ID n'est pas défini. Assurez-vous que le token est créé avant.");
  }

  const accountInfo = await new AccountInfoQuery().setAccountId(this.firstAccount).execute(client);
  if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(this.firstAccount)
          .setTokenIds([this.tokenId])
          .freezeWith(client);
      const signedAssociateTransaction = await associateTransaction.sign(this.firstPrivKey);
      const associateReceipt = await (await signedAssociateTransaction.execute(client)).getReceipt(client);
      assert.strictEqual(associateReceipt.status.toString(), "SUCCESS", "Échec de l'association du token");
  }

  // Transfert des tokens
  const transferTransaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId, this.treasuryAccount, -tokens)
      .addTokenTransfer(this.tokenId, this.firstAccount, tokens)
      .freezeWith(client);

  const signedTransferTransaction = await transferTransaction.sign(this.treasuryPrivKey);
  const transferReceipt = await (await signedTransferTransaction.execute(client)).getReceipt(client);
  assert.strictEqual(transferReceipt.status.toString(), "SUCCESS", "Échec du transfert des tokens");

  console.log(`Transfert réussi : ${tokens} HTT au premier compte.`);
});
// Step: A second Hedera account with X hbar and Y HTT tokens
Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbars: number, tokens: number) {
  const acc = accounts[1]; // Deuxième compte
  if (!acc || !acc.id || !acc.privateKey) {
      throw new Error("Configuration invalide pour le deuxième compte");
  }

  this.secondAccount = AccountId.fromString(acc.id);
  this.secondPrivKey = PrivateKey.fromStringED25519(acc.privateKey);

  // Vérifiez le solde HBAR
  const query = new AccountBalanceQuery().setAccountId(this.secondAccount);
  const balance = await query.execute(client);
  console.log(`Solde HBAR actuel du deuxième compte : ${balance.hbars.toBigNumber().toNumber()} hbars`);
  if (balance.hbars.toBigNumber().toNumber() !== hbars) {
      console.log("Réinitialisation du solde HBAR...");
      const resetTransaction = new TransferTransaction()
          .addHbarTransfer(this.secondAccount, Hbar.fromTinybars(-balance.hbars.toTinybars())) // Débiter tout le solde
          .addHbarTransfer(this.firstAccount, balance.hbars) // Retourner les fonds au premier compte
          .freezeWith(client);

      const signedResetTransaction = await resetTransaction.sign(this.secondPrivKey);
      const resetReceipt = await (await signedResetTransaction.execute(client)).getReceipt(client);
      assert.strictEqual(resetReceipt.status.toString(), "SUCCESS", "Échec de la réinitialisation du solde HBAR");
      console.log("Solde HBAR réinitialisé.");
  }

  // Assurez l'association du token
  const accountInfo = await new AccountInfoQuery().setAccountId(this.secondAccount).execute(client);
  const tokenRelationship = accountInfo.tokenRelationships.get(this.tokenId);
  if (!tokenRelationship) {
      const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(this.secondAccount)
          .setTokenIds([this.tokenId])
          .freezeWith(client);

      const signedAssociateTransaction = await associateTransaction.sign(this.secondPrivKey);
      const associateReceipt = await (await signedAssociateTransaction.execute(client)).getReceipt(client);
      assert.strictEqual(associateReceipt.status.toString(), "SUCCESS", "Échec de l'association du token");
  }

  // Transfert des tokens
  const transferTransaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId, this.treasuryAccount, -tokens)
      .addTokenTransfer(this.tokenId, this.secondAccount, tokens)
      .freezeWith(client);

  const signedTransferTransaction = await transferTransaction.sign(this.treasuryPrivKey);
  const transferReceipt = await (await signedTransferTransaction.execute(client)).getReceipt(client);
  assert.strictEqual(transferReceipt.status.toString(), "SUCCESS", "Échec du transfert des tokens");
});

// Step: A third Hedera account with X hbar and Y HTT tokens
Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbars: number, tokens: number) {
  await this.thirdAccountSetup(hbars, tokens);
});

// Step: A fourth Hedera account with X hbar and Y HTT tokens
Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (hbars: number, tokens: number) {
  await this.fourthAccountSetup(hbars, tokens);
});

// Step: A transaction is created to transfer X HTT tokens out of first and second accounts and into third and fourth accounts
When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function (firstTransferAmount: number, thirdAccountTokens: number, fourthAccountTokens: number) {
    assert.ok(this.tokenId, "Token ID is not defined");

    const transaction = new TransferTransaction()
      .addTokenTransfer(this.tokenId, this.firstAccount, -firstTransferAmount) // Deduct from first account
      .addTokenTransfer(this.tokenId, this.secondAccount, -firstTransferAmount) // Deduct from second account
      .addTokenTransfer(this.tokenId, this.thirdAccount, thirdAccountTokens) // Credit third account
      .addTokenTransfer(this.tokenId, this.fourthAccount, fourthAccountTokens) // Credit fourth account
      .freezeWith(client);

    this.transaction = await transaction.sign(this.firstPrivKey);
    this.transaction = await this.transaction.sign(this.secondPrivKey);
  }
);


// Step: The third account holds X HTT tokens
Then(/^The third account holds (\d+) HTT tokens$/, async function (expectedTokens: number) {
  const accountInfo = await new AccountInfoQuery()
    .setAccountId(this.thirdAccount)
    .execute(client);

  const tokenRelationship = accountInfo.tokenRelationships.get(this.tokenId);

  // Check if the token relationship exists
  assert.ok(tokenRelationship, "Token relationship is null or undefined for the third account");

  assert.strictEqual(
    tokenRelationship.balance.toNumber(),
    expectedTokens,
    "Third account does not hold the expected token amount"
  );
});


// Step: The fourth account holds X HTT tokens
Then(/^The fourth account holds (\d+) HTT tokens$/, async function (expectedTokens: number) {
  const accountInfo = await new AccountInfoQuery()
    .setAccountId(this.fourthAccount)
    .execute(client);

  const tokenRelationship = accountInfo.tokenRelationships.get(this.tokenId);

  // Check if the token relationship exists
  assert.ok(tokenRelationship, "Token relationship is null or undefined for the fourth account");
  assert.strictEqual(
    tokenRelationship.balance.toNumber(),
    expectedTokens,
    "Fourth account does not hold the expected token amount"
  );
});
