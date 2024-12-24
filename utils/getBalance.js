// async function getWalletBalance(web3, tokenContract, walletAddress) {
//     const balance = await tokenContract.methods.balanceOf(walletAddress).call();
//     return web3.utils.fromWei(balance, 'ether'); // Converts from wei to token units
// }

// module.exports ={
//     getWalletBalance
// }

const { handleProvider } = require("./handleChain");
const { erc20ABI } = require("../assets/erc20ABI");
const { Web3 } = require("web3");

async function getWalletBalance(walletAddress, chain) {
    try {
        const providerUrl = handleProvider(chain);

        if (!providerUrl) {
            throw new Error("Invalid chain or provider URL.");
        }
        const tokenAddress = "0x898E1cE720084A902Bc37dD822eD6D6a5F027E10";
        const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
      
        const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);

        // Fetch the balance of the wallet for the specific ERC-20 token
        const balance = await tokenContract.methods.balanceOf(walletAddress).call();
        const tmasqBalance = web3.utils.fromWei(balance, 'ether')
        const balanceWei = await web3.eth.getBalance(walletAddress)
        const ethBalance = web3.utils.fromWei(balanceWei, 'ether')

        return {tmasqBalance,ethBalance }; // Converts from wei to token units
    } catch (error) {
        console.error("Error in getWalletBalance:", error.message);
        throw error;
    }
}

module.exports = {
    getWalletBalance,
};