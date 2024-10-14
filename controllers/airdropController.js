const { Web3 } = require("web3");
const { erc20ABI } = require("../assets/erc20ABI");
const { getWalletBalance } = require("../utils/getBalance");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");
const { getSubscriptions } = require("../utils/boomFi");
const Airdrop = require("../models/airdropModel");
// Initialize Web3
const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.PROVIDER_URL)
);

const tokenAddress = process.env.MUMBAI_MASQ_CONTRACT;

const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
const disperseContract = new web3.eth.Contract(
  DisperContract.abi,
  process.env.DISPERSE_TOKEN_ADDRESS
);
const privateKey = process.env.PRIVATE_KEY;

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const ownerAddress = account.address;
async function processTransfers(req, res) {
  try {
    // Fetch subscription data from external API
    const response = await getSubscriptions();
    const subscriptions = response?.data?.items;
    const walletAddresses = [];
    const amounts = [];

    // Iterate through active subscriptions
    for (const sub of subscriptions) {
      if (sub.status === "Active") {
        const balance = await getWalletBalance(
          web3,
          tokenContract,
          sub.customer.wallet_address
        );
        // If balance is less than 0.5 MASQ, transfer enough to make the balance 1 MASQ
        if (parseFloat(balance) < 0.5) {
          const amountToTransfer = 1 - parseFloat(balance);
          // save to Mongodb
          const newAirdrop = new Airdrop({
            walletAddress: sub.customer.wallet_address,
            dateOfLastAirdrop: Date.now(),
            amountOfLastAirdrop: amountToTransfer,
          });
          await newAirdrop.save();
          walletAddresses.push(sub.customer.wallet_address);
          amounts.push(amountToTransfer);
        }
      }
    }
    // start implementing conditionals
    const airdrops = await Airdrop.find({});
    console.log("TESTS", airdrops)

    if (airdrops) {
      const data = disperseContract.methods
        .disperseToken(tokenAddress, walletAddresses, amounts)
        .encodeABI();
      const tx = {
        from: ownerAddress,
        to: tokenAddress,
        gas: 200000,
        data: data,
      };
      const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
      const receipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      console.log(`Transfer successful. Transaction receipt:`, receipt);
      res.send("SUCCESS");
    }

    console.log("wallet", walletAddresses, amounts);
  } catch (error) {
    console.error("Error processing transfers:", error);
  }
}
module.exports = {
  processTransfers,
};
