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
      let walletsBelowLimit = [];
      let walletBalancesToLimit = [];
      
      // Query the MongoDB for previous airdrop data
      const airdrops = await Airdrop.find({});
      
      // If airdrops array is empty, process all wallets below 1 MASQ
      if (airdrops.length === 0) {
        // Iterate through active subscriptions
        for (const sub of subscriptions) {
          if (sub.status === "Active") {
            const balance = await getWalletBalance(
              web3,
              tokenContract,
              sub.customer.wallet_address
            );
            
            // If balance is less than 1 MASQ, add to walletsBelowLimit
            if (parseFloat(balance) < 1) {
              // Calculate the amount needed to top up to 1 MASQ
              const amountToTopUp = (1 - parseFloat(balance)).toFixed(2);
              
              walletsBelowLimit.push(sub.customer.wallet_address);
              walletBalancesToLimit.push(web3.utils.toWei(amountToTopUp, "ether"));
              
              // Add each wallet to the Airdrop collection
              const newAirdrop = new Airdrop({
                walletAddress: sub.customer.wallet_address,
                dateOfLastAirdrop: Date.now(),
                amountOfLastAirdrop: amountToTopUp,
              });
              await newAirdrop.save(); // Save the airdrop data in the database
            }
          }
        }
      } else {
        // Normal processing if airdrops data exists
        for (const sub of subscriptions) {
          if (sub.status === "Active") {
            const balance = await getWalletBalance(
              web3,
              tokenContract,
              sub.customer.wallet_address
            );
            
            if (parseFloat(balance) < 0.5) {
              // Current date
              const currentDate = new Date();
              const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
              
              const walletTotals = {};
              
              airdrops.forEach((airdrop) => {
                const { walletAddress, dateOfLastAirdrop, amountOfLastAirdrop } = airdrop;
                const timeDifference = currentDate - dateOfLastAirdrop;
                
                if (timeDifference <= thirtyDaysInMillis) {
                  const amount = parseFloat(amountOfLastAirdrop);
                  walletTotals[walletAddress] = (walletTotals[walletAddress] || 0) + amount;
                }
              });
              
              walletsBelowLimit = Object.entries(walletTotals)
                .filter(([_, total]) => total < 2)
                .map(([walletAddress]) => walletAddress);
                
              walletBalancesToLimit = Object.entries(walletTotals)
                .filter(([_, total]) => total < 2)
                .map(([_, total]) => (2 - total).toFixed(2));
                
              walletBalancesToLimit = walletBalancesToLimit.map((amount) =>
                web3.utils.toWei(amount, "ether")
              );
            }
          }
        }
      }
      
      // Execute the disperseToken transaction if wallets need funds
      if (walletsBelowLimit.length > 0) {
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
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`Transfer successful. Transaction receipt:`, receipt);
      }
      res.send("SUCCESS");
    } catch (error) {
      console.error("Error processing transfers:", error);
      res.status(500).send("Error processing transfers.");
    }
  }
module.exports = {
  processTransfers,
};
