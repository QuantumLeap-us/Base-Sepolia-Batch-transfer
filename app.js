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

        const gasLimit = 21000; // Gas 限制
        const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));
        const valueToSend = web3.utils.toBN(balanceWei).sub(gasCost);

        if (valueToSend.lte(web3.utils.toBN(0))) {
          outputDiv.innerHTML += `⚠️ Insufficient funds in account ${account.address} to cover gas fees.<br>`;
          continue;
        }

        const toAddress = toAddresses[0]; // 发送到第一个地址
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
