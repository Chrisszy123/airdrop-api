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
    let walletsBelowLimit;
    let walletBalancesToLimit;
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
          const givenDate = new Date(sub.start_at);
          // Current date
          const currentDate = new Date();
          // 30 days in milliseconds
          const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
          // Object to store total airdrop amounts for each wallet address
          const walletTotals = {};
          // query our mongodb for previous airdrop data
          const airdrops = await Airdrop.find({});
          airdrops.forEach((airdrop) => {
            const { walletAddress, dateOfLastAirdrop, amountOfLastAirdrop } =
              airdrop;
            // Check if the airdrop happened in the last 30 days
            const timeDifference = currentDate - dateOfLastAirdrop;
            if (timeDifference <= thirtyDaysInMillis) {
              // Convert the amount to a number
              const amount = parseFloat(amountOfLastAirdrop);
              // Add the amount to the corresponding wallet's total
              if (walletTotals[walletAddress]) {
                walletTotals[walletAddress] += amount;
              } else {
                walletTotals[walletAddress] = amount;
              }
            }
          });
          // filter object and return array of wallet address below limit
          walletsBelowLimit = Object.entries(walletTotals)
            .filter(([walletAddress, total]) => total < 2)
            .map(([walletAddress]) => walletAddress);
          // get an array of the balance for each wallet.
          const balancesInWei = Object.entries(walletTotals)
            .filter(([walletAddress, total]) => total < 2)
            .map(([_, total]) => (2 - total).toFixed(2));
          walletBalancesToLimit = balancesInWei.map((amount) =>
            web3.utils.toWei(amount, "ether")
          );
        }
      }
    }
    const data = disperseContract.methods
      .disperseToken(tokenAddress, walletsBelowLimit, walletBalancesToLimit)
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
    const newAirdrop = new Airdrop({
      walletAddress: sub.customer.wallet_address,
      dateOfLastAirdrop: Date.now(),
      amountOfLastAirdrop: amountToTransfer,
    });
    await newAirdrop.save();
  } catch (error) {
    console.error("Error processing transfers:", error);
  }
}
module.exports = {
  processTransfers,
};
