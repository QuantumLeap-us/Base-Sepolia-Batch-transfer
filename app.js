document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const outputDiv = document.getElementById('output');

  const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org')); // Base Sepolia RPC URL

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

      const gasLimit = 21000; // 标准转账 Gas 限制

      for (const privateKey of privateKeys) {
        try {
          // 定义 account 并解析私钥
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          const balanceWei = await web3.eth.getBalance(account.address);

          console.log(`Account: ${account.address}, Balance: ${balanceWei} Wei`);

          // 动态获取实时 Gas 价格
          const gasPrice = await web3.eth.getGasPrice();
          const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

          console.log(`Gas Price: ${gasPrice} Wei, Gas Cost: ${gasCost} Wei`);

          // 验证余额是否足够支付 Gas
          if (web3.utils.toBN(balanceWei).lte(gasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for gas fees. Skipping...<br>`;
            continue;
          }

          // 计算发送金额
          const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost).sub(web3.utils.toBN(1));

          if (valueToSend.lte(web3.utils.toBN(0))) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} cannot cover transaction fees. Skipping...<br>`;
            console.log(`Skipping account ${account.address} due to insufficient funds after gas deduction.`);
            continue;
          }

          console.log(`Value to Send: ${valueToSend} Wei`);

          // 构建交易对象
          const txObject = {
            from: account.address,
            to: toAddresses[0], // 默认发送到第一个目标地址
            value: valueToSend,
            gas: gasLimit,
            gasPrice: gasPrice
          };

          console.log('Transaction Object:', txObject);

          // 签名并发送交易
          const signedTx = await account.signTransaction(txObject);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          console.log('Transaction Receipt:', receipt);

          outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddresses[0]}:<br>
            Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
            Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

          // 延迟 3-5 秒，避免速率限制
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));

        } catch (error) {
          // 捕获单个账户处理中的错误
          outputDiv.innerHTML += `❌ Error with account ${privateKey.slice(0, 6)}...: ${error.message}<br>`;
          console.error(`Error with account:`, error);
        }
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';
    } catch (error) {
      // 捕获全局错误
      console.error('Global error:', error);
      outputDiv.innerHTML += `❌ Error occurred: ${error.message}<br>`;
    }
  });
});
