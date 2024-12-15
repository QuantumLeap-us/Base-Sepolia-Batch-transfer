document.addEventListener('DOMContentLoaded', () => {
  const sendForm = document.getElementById('send-form');
  const sendButton = document.getElementById('send-button');
  const outputDiv = document.getElementById('output');
  const gasSpeedSelector = document.getElementById('gas-speed');

  const web3 = new Web3(new Web3.providers.HttpProvider('https://sepolia.base.org'));

  sendButton.addEventListener('click', async () => {
    try {
      outputDiv.innerHTML = 'Starting transactions...<br>';

      // 获取输入的私钥和目标地址
      const privateKeys = document.getElementById('private-key').value.split('\n')
        .map(key => key.trim()).filter(key => key !== '');

      const toAddresses = document.getElementById('to-addresses').value.split('\n')
        .map(addr => addr.trim()).filter(addr => web3.utils.isAddress(addr));

      if (privateKeys.length === 0 || toAddresses.length === 0) {
        outputDiv.innerHTML += '❌ Please enter valid private keys and recipient addresses.<br>';
        return;
      }

      const gasSpeedGwei = parseFloat(gasSpeedSelector.value);
      const gasPrice = web3.utils.toWei(gasSpeedGwei.toString(), 'gwei');

      // 遍历所有私钥并发送交易
      for (const privateKey of privateKeys) {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const balanceWei = await web3.eth.getBalance(account.address);

        if (web3.utils.toBN(balanceWei).lte(web3.utils.toBN(0))) {
          outputDiv.innerHTML += `⚠️ Account ${account.address} has no balance. Skipping...<br>`;
          continue;
        }

        const gasLimit = 21000; // 普通转账的 gas 限制
        const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

        // 确保转账金额 = 余额 - gas 费用
        let valueToSend = web3.utils.toBN(balanceWei).sub(gasCost);

        // 避免负值或错误计算
        if (valueToSend.lte(web3.utils.toBN(0))) {
        outputDiv.innerHTML += `⚠️ Insufficient funds in account ${account.address} to cover gas fees. Skipping...<br>`;
        continue;
       }

        // 为了安全，确保 valueToSend 精确减去 1 wei，防止四舍五入误差
       valueToSend = valueToSend.sub(web3.utils.toBN(1)); 

      // 构建交易对象
       const txObject = {
      from: account.address,
      to: toAddress,
      value: valueToSend,
      gas: gasLimit,
      gasPrice: gasPrice
     };


        const signedTx = await account.signTransaction(txObject);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        outputDiv.innerHTML += `✅ Sent from ${account.address} to ${toAddress}:<br>
          Tx Hash: <a href="https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}" target="_blank">${receipt.transactionHash}</a><br>
          Amount: ${web3.utils.fromWei(valueToSend, 'ether')} ETH<br><br>`;

        // 添加延迟 3-5 秒
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));
      }

      outputDiv.innerHTML += '🎉 All transactions completed.<br>';

    } catch (error) {
      console.error(error);
      outputDiv.innerHTML += `❌ Error occurred: ${error.message}<br>`;
    }
  });
});
