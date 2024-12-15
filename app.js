const sendForm = document.getElementById('send-form');
const sendButton = document.getElementById('send-button');
const outputDiv = document.getElementById('output');

// 创建全局 Web3 实例
const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org'));

sendButton.addEventListener('click', async () => {
  const privateKeys = document.getElementById('private-key').value.split('\n')
    .map(key => key.trim())
    .filter(key => key !== '');

  const toAddresses = sendForm.elements['to-addresses'].value.split('\n')
    .map(address => address.trim())
    .filter(address => address !== '');

  if (privateKeys.length === 0) {
    outputDiv.textContent = 'Please enter at least one private key';
    return;
  }

  if (toAddresses.length === 0) {
    outputDiv.textContent = 'Please enter at least one recipient address';
    return;
  }

  outputDiv.textContent = '';

  let numTransactions = 0;
  let numErrors = 0;

  for (const privateKey of privateKeys) {
    try {
      const transactions = await sendTransactions(privateKey, toAddresses);
      numTransactions += transactions.length;
      transactions.forEach(({ transactionHash, from, to, value }, index) => {
        outputDiv.innerHTML += `Transaction #${numTransactions - transactions.length + index + 1} sent from ${from} with hash: <a href="https://holesky.etherscan.io/tx/${transactionHash}" rel="noopener" target="_blank">${transactionHash}</a><br>`;
        outputDiv.innerHTML += `Sent ${value} ETH to ${to}<br><br>`;
      });
    } catch (error) {
      numErrors++;
      outputDiv.textContent += `Error sending transactions from ${error.from}: ${error.message}\n`;
    }
  }

  if (numErrors > 0) {
    outputDiv.textContent += `Failed to send ${numErrors} transaction${numErrors === 1 ? '' : 's'}\n`;
  }
});

async function sendTransactions(privateKey, toAddresses) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const balance = await web3.eth.getBalance(account.address);

  const currentGasPrice = await web3.eth.getGasPrice();
  const priorityFee = web3.utils.toWei('1.5', 'gwei');
  const gasPrice = web3.utils.toBN(currentGasPrice).add(web3.utils.toBN(priorityFee));

  // 计算总的gas费用
  const totalGasCost = await calculateGasCost(account.address, toAddresses, gasPrice);
  const availableBalance = web3.utils.toBN(balance).sub(totalGasCost);

  if (availableBalance.lte(0)) {
    throw new Error('Insufficient balance to pay for gas');
  }

  const valuePerTransaction = availableBalance.div(web3.utils.toBN(toAddresses.length)); // 平均分配余额

  const transactions = [];

  for (const toAddress of toAddresses) {
    try {
      const receipt = await sendSingleTransaction(account, toAddress, valuePerTransaction, gasPrice);
      transactions.push({
        transactionHash: receipt.transactionHash,
        from: account.address,
        to: toAddress,
        value: web3.utils.fromWei(valuePerTransaction, 'ether') + ' ETH'
      });
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw { from: account.address, message: error.message };
    }
  }

  return transactions;
}

async function calculateGasCost(from, toAddresses, gasPrice) {
  const gasCostPromises = toAddresses.map(async to => {
    const txObject = {
      from: from,
      to: to,
      value: '0x0',  // 不涉及实际资金的传输，只计算gas
      gasPrice: gasPrice
    };
    const gas = await web3.eth.estimateGas(txObject);
    return gasPrice.mul(web3.utils.toBN(gas));
  });

  const gasCosts = await Promise.all(gasCostPromises);
  return gasCosts.reduce((total, cost) => total.add(cost), web3.utils.toBN(0));
}

async function sendSingleTransaction(account, toAddress, value, gasPrice) {
  const txObject = {
    from: account.address,
    to: toAddress,
    value: web3.utils.toHex(value),
    gasPrice: gasPrice
  };

  const gas = await web3.eth.estimateGas(txObject);

  const transaction = {
    ...txObject,
    gas: gas
  };

  const signedTx = await account.signTransaction(transaction);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log('Transaction successful:', receipt.transactionHash);
  return receipt;
}
