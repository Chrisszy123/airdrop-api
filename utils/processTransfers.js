
const privateKey = process.env.PRIVATE_KEY;
async function transferTokens(web3, tokenContract, ownerAddress, tokenAddress, walletAddress, amount) {
    const amountInWei = web3.utils.toWei(amount.toString(), 'ether'); // Convert amount to wei
    // Create the transaction data
    const data = tokenContract.methods.transfer(walletAddress, amountInWei).encodeABI();
    const tx = {
        from: ownerAddress,
        to: tokenAddress,
        gas: 200000,
        data: data
    };

    // Sign and send the transaction
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`Transfer to ${walletAddress} successful. Transaction receipt:`, receipt);
}

module.exports = {
    transferTokens
}