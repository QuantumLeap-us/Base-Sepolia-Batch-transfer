document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const outputDiv = document.getElementById('output');

  console.log('Web3 initialized:', Web3); // 检查 Web3 是否加载成功

  const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org'));

  sendButton.addEventListener('click', async () => {
    try {
      console.log('Send button clicked');
      outputDiv.innerHTML = 'Starting transactions...<br>';

      const privateKeys = document.getElementById('private-key').value.split('\n')
        .map(key => key.trim()).filter(key => key !== '');

      const toAddresses = document.getElementById('to-addresses').value.split('\n')
        .map(addr => addr.trim()).filter(addr => web3.utils.isAddress(addr));

      console.log('Private keys loaded:', privateKeys);
      console.log('Recipient addresses loaded:', toAddresses);

      if (privateKeys.length === 0 || toAddresses.length === 0) {
        outputDiv.innerHTML += '❌ Please enter valid private keys and recipient addresses.<br>';
        console.log('Input validation failed');
        return;
      }

      for (const privateKey of privateKeys) {
        try {
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          const balanceWei = await web3.eth.getBalance(account.address);
          console.log(`Account ${account.address} balance: ${balanceWei}`);

          // 动态获取实时 Gas 价格
          const gasPrice = await web3.eth.getGasPrice();
          console.log(`Real-time Gas Price: ${gasPrice}`);

          const gasLimit = 21000; // 转账的标准 Gas 限制
          const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

          if (web3.utils.toBN(balanceWei).lte(gasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for gas fees. Skipping...<br>`;
            console.log(`Account ${account.address} skipped due to low balance`);
            continue;
          }

          // 计算发送金额：余额 - gas 费用 - 1 Wei
          const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost).sub(web3.utils.toBN(1));
          console.log(`Calculated value to send: ${valueToSend}`);

          if (valueToSend.lte(web3.utils.toBN(0))) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} cannot cover transaction fees. Skipping...<br>`;
            continue;
          }

          const txObject = {
            from: account.address,
            to: toAddresses[0], // 发送到第一个目标地址
            value: valueToSend,
            gas: gasLimit,
            gasPrice: gasPrice
          };

          console.log('Transaction object:', txObject);

          const signedTx = await account.signTransaction(txObject);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          console.log('Transaction receipt:', receipt);

          outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddresses[0]}:<br>
            Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
            Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;
        } catch (error) {
          outputDiv.innerHTML += `❌ Error with account ${privateKey.slice(0, 6)}...: ${error.message}<br>`;
          console.error(`Error with account ${privateKey.slice(0, 6)}:`, error);
        }
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';
    } catch (error) {
      console.error('Global error:', error);
      outputDiv.innerHTML += `❌ Error occurred: ${error.message}<br>`;
    }
  });
});
