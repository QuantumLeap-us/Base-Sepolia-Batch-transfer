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

      const gasLimit = 21000; // 固定的 Gas 上限
      const baseFee = web3.utils.toWei('0.373', 'gwei'); // 最高基本费用：0.373 Gwei
      const priorityFee = web3.utils.toWei('1.5', 'gwei'); // 优先费用：1.5 Gwei

      for (const privateKey of privateKeys) {
        try {
          console.log(`Processing private key: ${privateKey.slice(0, 6)}...`); // 私钥前缀调试输出

          // 私钥解析为账户
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          console.log(`Account loaded: ${account.address}`);

          const balanceWei = await web3.eth.getBalance(account.address);
          console.log(`Account balance: ${balanceWei} Wei`);

          const gasCost = web3.utils.toBN(gasLimit).mul(web3.utils.toBN(baseFee).add(web3.utils.toBN(priorityFee)));

          console.log(`Gas Cost: ${gasCost} Wei`);

          if (web3.utils.toBN(balanceWei).lte(gasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for gas fees. Skipping...<br>`;
            continue;
          }

          const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost);

          if (valueToSend.lte(web3.utils.toBN(0))) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} cannot cover transaction fees. Skipping...<br>`;
            continue;
          }

          console.log(`Value to Send: ${valueToSend} Wei`);

          const txObject = {
            from: account.address,
            to: toAddresses[0],
            value: valueToSend,
            gasLimit: gasLimit,
            maxFeePerGas: baseFee,
            maxPriorityFeePerGas: priorityFee,
            type: '0x2',
          };

          console.log('Transaction Object:', txObject);

          const signedTx = await account.signTransaction(txObject);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddresses[0]}:<br>
            Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
            Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));
        } catch (error) {
          outputDiv.innerHTML += `❌ Error with account: ${error.message}<br>`;
          console.error(`Error processing account:`, error);
        }
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';
    } catch (error) {
      outputDiv.innerHTML += `❌ Global Error: ${error.message}<br>`;
      console.error('Global error:', error);
    }
  });
});
