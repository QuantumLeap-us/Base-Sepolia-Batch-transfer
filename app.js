document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const outputDiv = document.getElementById('output');
  const gasSpeedSelector = document.getElementById('gas-speed');

  const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org'));

  sendButton.addEventListener('click', async () => {
    try {
      outputDiv.innerHTML = 'Starting transactions...<br>';

      const privateKeys = document.getElementById('private-key').value.split('\n')
        .map(key => key.trim()).filter(key => key !== '');

      const toAddresses = document.getElementById('to-addresses').value.split('\n')
        .map(addr => addr.trim()).filter(addr => web3.utils.isAddress(addr));

      if (privateKeys.length === 0 || toAddresses.length === 0) {
        outputDiv.innerHTML += '❌ Please enter valid private keys and recipient addresses.<br>';
        return;
      }

      const gasSpeedGwei = parseFloat(gasSpeedSelector.value);
      const gasPrice = web3.utils.toWei(gasSpeedGwei.toString(), 'gwei'); // 转换为 Wei

      for (const privateKey of privateKeys) {
        const toAddress = toAddresses[0]; // 发送到第一个接收地址
        try {
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          const balanceWei = await web3.eth.getBalance(account.address);

          // 估算 gas 费用
          const gasLimit = 21000; // 普通转账的 gas 限制
          const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

          // 确保余额足够支付 gas 费用
          if (web3.utils.toBN(balanceWei).lte(gasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for gas fees. Skipping...<br>`;
            continue;
          }

          // 动态计算发送金额 = 余额 - gas 费用 - 1 wei 余量
          let valueToSend = web3.utils.toBN(balanceWei).sub(gasCost).sub(web3.utils.toBN(1));

          if (valueToSend.lte(web3.utils.toBN(0))) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient funds after gas deduction. Skipping...<br>`;
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

          outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddress}:<br>
            Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
            Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

          // 延迟 3-5 秒，避免速率限制
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));

        } catch (error) {
          outputDiv.innerHTML += `❌ Error with account ${privateKey.slice(0, 6)}...: ${error.message}<br>`;
        }
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';
    } catch (error) {
      console.error(error);
      outputDiv.innerHTML += `❌ Error occurred: ${error.message}<br>`;
    }
  });
});
