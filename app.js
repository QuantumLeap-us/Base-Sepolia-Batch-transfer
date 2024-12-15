const sendForm = document.getElementById('send-form');
const sendButton = document.getElementById('send-button');
const outputDiv = document.getElementById('output');
const gasSpeedSelector = document.getElementById('gas-speed');

// 创建 Web3 实例
const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org'));

sendButton.addEventListener('click', async () => {
  const privateKeys = document.getElementById('private-key').value.split('\n')
    .map(key => key.trim()).filter(key => key !== '');
  const toAddress = sendForm.elements['to-addresses'].value.trim();
  const gasSpeedGwei = parseFloat(gasSpeedSelector.value); // 用户选择的 Gas 费用

  if (privateKeys.length === 0 || !web3.utils.isAddress(toAddress)) {
    outputDiv.textContent = 'Please enter valid private keys and a valid recipient address.';
    return;
  }

  outputDiv.innerHTML = `Starting transactions...<br><br>`;

  let successCount = 0;
  let failedCount = 0;

  for (const privateKey of privateKeys) {
    try {
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      const balanceWei = await web3.eth.getBalance(account.address);

      // 如果余额为 0，跳过该钱包
      if (web3.utils.toBN(balanceWei).lte(web3.utils.toBN(0))) {
        outputDiv.innerHTML += `Account ${account.address} has no balance. Skipping...<br>`;
        continue;
      }

      // 设置用户选择的 gas 价格
      const gasPrice = web3.utils.toWei(gasSpeedGwei.toString(), 'gwei');
      const gasLimit = 21000; // 普通转账的 gas limit
      const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));
      const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost);

      // 如果余额不足支付 gas 费用，跳过
      if (valueToSend.lte(web3.utils.toBN(0))) {
        outputDiv.innerHTML += `Account ${account.address} has insufficient balance to cover gas fees. Skipping...<br>`;
        continue;
      }

      // 构建交易对象
      const txObject = {
        from: account.address,
        to: toAddress,
        value: valueToSend,
        gas: gasLimit,
        gasPrice: gasPrice
      };

      // 签名并发送交易
      const signedTx = await account.signTransaction(txObject);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      successCount++;
      outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddress}:<br>
        Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
        Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

      // 延迟 3-5 秒，避免过快
      const delay = Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      failedCount++;
      outputDiv.innerHTML += `❌ Error with account: ${error.message}<br>`;
    }
  }

  // 输出结果
  outputDiv.innerHTML += `<br>🎉 Completed: ${successCount} successful transactions, ${failedCount} failed.`;
});
