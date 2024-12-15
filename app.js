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

      const gasLimit = 21000; // 固定 Gas 上限
      const maxFeePerGas = web3.utils.toWei('0.000000373', 'ether'); // 最高基本费用 (373 Wei)
      const maxPriorityFeePerGas = web3.utils.toWei('1.5', 'gwei');  // 优先费用 (1.5 Gwei)

      for (const privateKey of privateKeys) {
        try {
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          const balanceWei = await web3.eth.getBalance(account.address);

          console.log(`Account: ${account.address}, Balance: ${balanceWei} Wei`);

          // 计算总 Gas 费用
          const gasCost = web3.utils.toBN(maxFeePerGas).mul(web3.utils.toBN(gasLimit));

          console.log(`Max Fee: ${maxFeePerGas}, Gas Cost: ${gasCost} Wei`);

          // 检查余额是否足够支付 Gas 费用
          if (web3.utils.toBN(balanceWei).lte(gasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for gas fees. Skipping...<br>`;
            continue;
          }

          // 计算发送金额 (余额 - Gas 费用)
          const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost);

          if (valueToSend.lte(web3.utils.toBN(0))) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} cannot cover transaction fees. Skipping...<br>`;
            continue;
          }

          console.log(`Value to Send: ${valueToSend} Wei`);

          // 构建 EIP-1559 交易对象
          const txObject = {
            from: account.address,
            to: toAddresses[0],
            value: valueToSend,
            gasLimit: gasLimit,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            type: '0x2' // EIP-1559 类型交易
          };

          // 签名并发送交易
          const signedTx = await account.signTransaction(txObject);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddresses[0]}:<br>
            Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
            Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

          // 延迟 3-5 秒，避免速率限制
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));

        } catch (error) {
          outputDiv.innerHTML += `❌ Error with account ${account.address}: ${error.message}<br>`;
          console.error(`Error with account:`, error);
        }
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';
    } catch (error) {
      outputDiv.innerHTML += `❌ Error occurred: ${error.message}<br>`;
      console.error('Global error:', error);
    }
  });
});
