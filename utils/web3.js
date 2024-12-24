const { Web3 } = require("web3");
const { handleProvider } = require("./handleChain");
const { erc20ABI } = require("../assets/erc20ABI");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");

const handleWeb3 = (chain) => {
    const providerUrl = handleProvider(chain)
    const web3 = new Web3(new Web3.providers.HttpProvider("https://base-sepolia.g.alchemy.com/v2/d66UL0lPrltmweEqVsv3opBSVI3wkL8I"));
    const tokenAddress = "0x898E1cE720084A902Bc37dD822eD6D6a5F027E10";
  
    const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
    const disperseContract = new web3.eth.Contract(
      DisperContract.abi,
      process.env.DISPERSE_BASE_SEPOLIA_ADDRESS
    );
    const privateKey = process.env.PRIVATE_KEY;
  
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const ownerAddress = account.address;
    return {web3, tokenAddress,tokenContract,disperseContract,ownerAddress,privateKey}
}

module.exports ={
    handleWeb3
}