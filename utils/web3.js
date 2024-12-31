const { Web3 } = require("web3");
const { handleProvider, handleERCAddress, handleAddress } = require("./handleChain");
const { erc20ABI } = require("../assets/erc20ABI");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");

const handleWeb3 = (chain) => {
    const providerUrl = handleProvider(chain)
    const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
    const tokenAddress = handleERCAddress(chain);
    const disperseAddress = handleAddress(chain)
  
    const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
    const disperseContract = new web3.eth.Contract(
      DisperContract.abi,
      disperseAddress
    );
    const privateKey = process.env.PRIVATE_KEY;
  
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const ownerAddress = account.address;
    return {web3, tokenAddress,tokenContract,disperseContract,ownerAddress,privateKey}
}

module.exports ={
    handleWeb3
}