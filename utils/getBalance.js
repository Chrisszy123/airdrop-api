async function getWalletBalance(web3, tokenContract, walletAddress) {
    const balance = await tokenContract.methods.balanceOf(walletAddress).call();
    return web3.utils.fromWei(balance, 'ether'); // Converts from wei to token units
}

module.exports ={
    getWalletBalance
}