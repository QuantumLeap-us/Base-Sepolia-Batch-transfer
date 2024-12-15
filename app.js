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

      const gasLimit = 21000; // 固定的 L2 Gas 上限
      const maxFeePerGas = web3.utils.toWei('1.500000368', 'gwei'); // Max Fee = 1.500000368 Gwei
      const maxPriorityFeePerGas = web3.utils.toWei('1.5', 'gwei'); // Max Priority Fee = 1.5 Gwei

      const l1GasUsed = 1600; // L1 Gas 使用量
      const l1GasPrice = web3.utils.toWei('19.192880407', 'gwei'); // L1 Gas Price = 19.192880407 Gwei
      const l1Fee = web3.utils.toBN(l1GasPrice).mul(web3.utils.toBN(l1GasUsed)); // L1 费用计算

      for (const privateKey of privateKeys) {
        try {
          const account = web3.eth.accounts.privateKeyToAccount(privateKey);
          const balanceWei = await web3.eth.getBalance(account.address);

          console.log(`Account: ${account.address}, Balance: ${balanceWei} Wei`);

          // L2 Gas 费用计算
          const l2GasCost = web3.utils.toBN(gasLimit).mul(web3.utils.toBN(maxFeePerGas));
          const totalGasCost = l2GasCost.add(l1Fee); // 总费用 = L2 费用 + L1 费用

          console.log(`L2 Gas Cost: ${l2GasCost}, L1 Fee: ${l1Fee}, Total Gas Cost: ${totalGasCost}`);

          // 检查余额是否足够支付总费用
          if (web3.utils.toBN(balanceWei).lte(totalGasCost)) {
            outputDiv.innerHTML += `⚠️ Account ${account.address} has insufficient balance for fees. Skipping...<br>`;
            continue;
          }

          // 计算发送金额
          const valueToSend = web3.utils.toBN(balanceWei).sub(totalGasCost);

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
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
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
          outputDiv.innerHTML += `❌ Error with account ${account.address}: ${error.message}<br>`;
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
