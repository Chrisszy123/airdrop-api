const { Web3 } = require("web3");
const { erc20ABI } = require("../assets/erc20ABI");
const { getWalletBalance } = require("../utils/getBalance");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");
const { getSubscriptions } = require("../utils/boomFi");
const Airdrop = require("../models/airdropModel");
const { handleProvider } = require("../utils/handleChain");
// Initialize Web3
const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.BASE_SEPOLIA_PROVIDER_URL)
);

const tokenAddress = process.env.MASQ_BASE_SEPOLIA_CONTRACT;

const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
const disperseContract = new web3.eth.Contract(
  DisperContract.abi,
  process.env.DISPERSE_BASE_SEPOLIA_ADDRESS
);
const privateKey = process.env.PRIVATE_KEY;

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const ownerAddress = account.address;
async function processBaseTransfers(req, res) {
  try {
    // Fetch subscription data from BOOMFI external API
    const response = await getSubscriptions();
    const subscriptions = response?.data?.items;
    let walletsBelowLimit = [];
    let walletBalancesToLimit = [];

    // Query the MongoDB for previous airdrop data
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    const uniqueRecentAirdrops = await Airdrop.aggregate([
      {
        // Match documents where dateOfLastAirdrop is within the last 30 days
        $match: {
          dateOfLastAirdrop: { $gte: thirtyDaysAgo },
        },
      },
      {
        // Group by walletAddress and select the most recent dateOfLastAirdrop for each wallet
        $group: {
          _id: "$walletAddress", // Group by walletAddress
          latestAirdrop: { $first: "$$ROOT" }, // Get the full document for the latest airdrop
          dateOfLastAirdrop: { $max: "$dateOfLastAirdrop" }, // Keep the most recent date
        },
      },
      {
        // Sort the results by the most recent dateOfLastAirdrop
        $sort: { dateOfLastAirdrop: -1 },
      },
    ]);

    // If airdrops array is empty, process all wallets below 1 MASQ
    if (uniqueRecentAirdrops.length === 0) {
      // Iterate through active subscriptions
      for (const sub of subscriptions) {
        if (
          sub.status === "Active" &&
          sub.is_overdue === false &&
          sub.properties.chain_id === 8453
        ) {
          const balance = await getWalletBalance(
            sub.customer.wallet_address,
            sub.properties.chain_id
          );

          // If balance is less than 1 MASQ, add to walletsBelowLimit
          if (parseFloat(balance) < 1) {
            // Calculate the amount needed to top up to 1 MASQ
            const amountToTopUp = (1 - parseFloat(balance)).toFixed(2);

            walletsBelowLimit.push(sub.customer.wallet_address);
            walletBalancesToLimit.push(
              web3.utils.toWei(amountToTopUp, "ether")
            );
          }
        }
      }
    } else {
      // Normal processing if airdrops data exists
      for (const sub of subscriptions) {
        if (
          sub.status === "Active" &&
          sub.is_overdue === false &&
          sub.properties.chain_id === 8453
        ) {
          const {tmasqBalance: balance} = await getWalletBalance(
            sub.customer.wallet_address,
            sub.properties.chain_id
          );
          if (parseFloat(balance) < 0.5) {
            // Current date
            const currentDate = new Date();
            const daysInMillis = 24 * 60 * 60 * 1000;

            const walletTotals = {};
            // from the array of mongo db, I want to get an object of wallet addresses and the amount to be topped off

            uniqueRecentAirdrops.forEach((airdrop) => {
              const { walletAddress, dateOfLastAirdrop, amountOfLastAirdrop } =
                airdrop.latestAirdrop;
              const timeDifference = currentDate - dateOfLastAirdrop;
              const isThirtyDays = timeDifference / daysInMillis;

              if (isThirtyDays >= 30) {
                const amount = parseFloat(amountOfLastAirdrop);
                walletTotals[walletAddress] =
                  (walletTotals[walletAddress] || 0) + amount;
              }
            });
            
            walletsBelowLimit = Object.entries(walletTotals)
              .filter(([_, total]) => total < 1)
              .map(([walletAddress]) => walletAddress);

            walletBalancesToLimit = Object.entries(walletTotals)
              .filter(([_, total]) => total < 1)
              .map(([_, total]) => (1 - total).toFixed(2));

            walletBalancesToLimit = walletBalancesToLimit.map((amount) =>
              web3.utils.toWei(amount, "ether")
            );
          }
        }
      }
    }
    const lowBalanceWallets = [];
    for (const wallet of walletsBelowLimit) {
      const balanceWei = await web3.eth.getBalance(wallet); // Get balance in wei
      const balanceEth = web3.utils.fromWei(balanceWei, "ether"); // Convert to ether
      if (parseFloat(balanceEth) < 0.1) {
        lowBalanceWallets.push(wallet);
      }
    }
    
    if (lowBalanceWallets.length > 0) {
      const userAmount = lowBalanceWallets.map(() => web3.utils.toWei(0.1, "ether"));
      const value = lowBalanceWallets.length * 0.1; // send a flat 0.1 eth to all eligible wallets
      const valueInWei = web3.utils.toWei(value, "ether")
      const data = disperseContract.methods
        .disperseEther(lowBalanceWallets, userAmount)
        .encodeABI();
      const tx = {
        from: ownerAddress,
        to: process.env.DISPERSE_BASE_SEPOLIA_ADDRESS,
        gas: 100000,
        value: valueInWei,
        maxPriorityFeePerGas: web3.utils.toWei("30", "gwei"),
        maxFeePerGas: web3.utils.toWei("100", "gwei"),
        data: data,
      };
      const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
      const receipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      console.log(`ETH Transfer successful. Transaction receipt:`, receipt);
    }
    
    // Execute the disperseToken transaction if wallets need funds
    if (walletsBelowLimit.length > 0) {
      const total = walletBalancesToLimit.reduce(
        (acc, val) => acc + Number(val),
        0
      );
      
      // Data for the transaction
      const transaction = tokenContract.methods.approve(
        process.env.DISPERSE_TOKEN_ADDRESS,
        total.toString()
      );
      // Estimate gas for the transaction
      const gasLimit = await web3.eth.estimateGas({
        to: tokenAddress,
        data: transaction.encodeABI(),
        from: ownerAddress,
      });
      
      
      // Create the transaction object
      const txn = {
        from: ownerAddress,
        to: tokenAddress,
        gas: gasLimit,
        maxPriorityFeePerGas: web3.utils.toWei("30", "gwei"),
        maxFeePerGas: web3.utils.toWei("100", "gwei"),
        data: transaction.encodeABI(), // Encoded ABI of transferFrom method
      };
      // Sign the transaction with the private key
      const signed = await web3.eth.accounts.signTransaction(txn, privateKey);

      // Send the signed transaction
      const txnSuccess = await web3.eth.sendSignedTransaction(
        signed.rawTransaction
      );
      if (txnSuccess.transactionHash) {
        const data = disperseContract.methods
          .disperseToken(tokenAddress, walletsBelowLimit, walletBalancesToLimit)
          .encodeABI();

        const tx = {
          from: ownerAddress,
          to: process.env.DISPERSE_BASE_SEPOLIA_ADDRESS,
          gas: 100000,
          maxPriorityFeePerGas: web3.utils.toWei("30", "gwei"),
          maxFeePerGas: web3.utils.toWei("100", "gwei"),
          data: data,
        };

        const signedTx = await web3.eth.accounts.signTransaction(
          tx,
          privateKey
        );
        const receipt = await web3.eth.sendSignedTransaction(
          signedTx.rawTransaction
        );
        console.log(`Transfer successful. Transaction receipt:`);
      }
    } else {
      return res.status(400).json({ error: "No DATA FOR AIRDROP" });
    }
    //
    const result = walletsBelowLimit.map((walletAddress, index) => ({
      walletAddress,
      amount: web3.utils.fromWei(walletBalancesToLimit[index], "ether"),
    }));

    result.map(async (wallet, index) => {
      // Add each wallet to the Airdrop Mongodb collection
      const newAirdrop = new Airdrop({
        walletAddress: wallet.walletAddress,
        dateOfLastAirdrop: Date.now(),
        amountOfLastAirdrop: wallet.amount,
      });
      await newAirdrop.save(); // Save the airdrop data in the database
    });
    res.status(200).json({ message: "AIRDROP DATA SAVED TO DATABASE" });
  } catch (error) {
    console.error("Error processing transfers:", error);
    res.status(500).send("Error processing transfers.");
  }
}
module.exports = {
  processBaseTransfers,
};
