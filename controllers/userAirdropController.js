const { Web3 } = require("web3");
const axios = require("axios");
const { getWalletBalance } = require("../utils/getBalance");
const Airdrop = require("../models/airdropModel");
const {
  getUserByAddress,
  getUserSubscription,
  cancelUserSubcription,
  getSubscriptions,
} = require("../utils/boomFi");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");
const { handleProvider, handleAddress } = require("../utils/handleChain");
const { handleWeb3 } = require("../utils/web3");
// Initialize Web3

const processUserAirdrop = async (req, res) => {
  const { chain } = req.body;
  // use provider based on the chain
  const {
    web3,
    tokenAddress,
    tokenContract,
    disperseContract,
    ownerAddress,
    privateKey,
  } = handleWeb3(chain);
  const disperseAddress = handleAddress(chain);

  let userwallet = [];
  let userAmount = [];
  //
  const { walletAddress } = req.body;
  const currentDate = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(currentDate.getDate() - 30);
  // Replace with the desired wallet address

  const recentAirdropsForWallet = await Airdrop.find({
    walletAddress: walletAddress, // Filter by the specific wallet address
    dateOfLastAirdrop: { $gte: thirtyDaysAgo }, // Filter for the last 30 days
  }).sort({ dateOfLastAirdrop: -1 });
  //
  const response = await getUserByAddress();
  const idsForWallet = response.data?.data?.items
    .filter(
      (item) =>
        item.customer_ident.toString().toLowerCase() ===
        walletAddress.toString().toLowerCase()
    )
    .map((item) => item.id);
  // Check that user with wallet address exists
  if (idsForWallet.length > 0) {
    const result = await getSubscriptions();
    const userSubcription = result.data?.items.filter(
      (item) =>
        idsForWallet.includes(item.customer_id) &&
        item.status === "Active" &&
        item.is_overdue === false
    );

    if (userSubcription.length > 0) {
      const hasMonthly = userSubcription.some(
        (item) => item.items[0].plan.recurring_interval === "Month"
      );
      const hasYearly = userSubcription.some(
        (item) => item.items[0].plan.recurring_interval === "Year"
      );

      // If we have both a monthly and a yearly active plan, cancel the monthly one
      if (hasMonthly && hasYearly) {
        userSubcription.forEach(async (item) => {
          if (item.items[0].plan.recurring_interval === "Month") {
            // cancel subscription
            await cancelUserSubcription(item?.id);
          }
        });
      }
    }
    // Validate input
    if (!web3.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    //
    try {
      const { tmasqBalance: balance, ethBalance: balanceEth } =
        await getWalletBalance(walletAddress, chain);
      if (userSubcription.length > 0) {
        if (parseFloat(balance) < 0.5) {
          // check for a new User
          if (recentAirdropsForWallet.length === 0) {
            const amountToAirdrop = (1 - parseFloat(balance)).toString();
            userwallet.push(walletAddress);
            userAmount.push(web3.utils.toWei(amountToAirdrop, "ether"));
            // tranfer native MATIC
            if (parseFloat(balanceEth) < 0.1) {
              const valueInWei = web3.utils.toWei("0.1", "ether");
              const data = disperseContract.methods
                .disperseEther(userwallet, [valueInWei])
                .encodeABI();

              const tx = {
                from: ownerAddress,
                to: disperseAddress,
                gas: 100000,
                value: web3.utils.toWei("0.1", "ether"),
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
              console.log(`ETH Transfer successful. Transaction receipt:`);
            }
            if (userAmount.length > 0) {
              const total = userAmount.reduce(
                (acc, val) => acc + Number(val),
                0
              );
              const transaction = tokenContract.methods.approve(
                disperseAddress,
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
              const signed = await web3.eth.accounts.signTransaction(
                txn,
                privateKey
              );

              // Send the signed transaction
              const txnSuccess = await web3.eth.sendSignedTransaction(
                signed.rawTransaction
              );

              if (txnSuccess.transactionHash) {
                const data = disperseContract.methods
                  .disperseToken(tokenAddress, userwallet, userAmount)
                  .encodeABI();

                const tx = {
                  from: ownerAddress,
                  to: disperseAddress,
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
                console.log(
                  `Transfer successful. Transaction receipt:`,
                  receipt
                );
              }
            }
            // add user airdrop to mongodb
            const newAirdrop = new Airdrop({
              walletAddress: walletAddress,
              dateOfLastAirdrop: Date.now(),
              amountOfLastAirdrop: amountToAirdrop,
            });
            await newAirdrop.save(); // Save the airdrop data in the database
            return res.status(200).json({
              message: `Airdropped ${amountToAirdrop} MASQ to ${walletAddress}`,
            });
          } else {
            // handle transfer for old users
            return res
              .status(200)
              .json({ error: "User has been airdropped in the last 30days" });
          }
        } else {
          return res.status(200).json({
            message: `No airdrop necessary. Current balance: ${balance} MASQ`,
          });
        }
      } else {
        return res.status(200).json({ error: "User is not an Active Subscriber" });
      }
    } catch (error) {
      console.error("Error during airdrop:", error);
      return res.status(500).json({ error: "Error during airdrop process" });
    }
  } else {
    return res.status(400).json({ error: "customer_ident does not exist" });
  }
};

module.exports = {
  processUserAirdrop,
};
