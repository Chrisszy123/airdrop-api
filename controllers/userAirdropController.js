const { Web3 } = require("web3");
const axios = require("axios");
const { erc20ABI } = require("../assets/erc20ABI");
const { getWalletBalance } = require("../utils/getBalance");
const Airdrop = require("../models/airdropModel");
const {
  getUserByAddress,
  getUserSubscription,
  cancelUserSubcription,
  getSubscriptions,
} = require("../utils/boomFi");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");
// Initialize Web3

const processUserAirdrop = async (req, res) => {
  const { chain } = req.body;
  let providerUrl;
  if (chain === "polygon-amoy") {
    providerUrl = process.env.PROVIDER_URL;
  } else if (chain === "base") {
    providerUrl = process.env.BASE_PROVIDER_URL;
  } else if (chain === "polygon-mainnet") {
    providerUrl = process.env.MAINNET_PROVIDER_URL;
  } else {
    providerUrl = process.env.DEFAULT_PROVIDER_URL;
  }
  // use provider based on the chain
  const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
  const tokenAddress = process.env.MUMBAI_MASQ_CONTRACT;

  const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
  const disperseContract = new web3.eth.Contract(
    DisperContract.abi,
    process.env.DISPERSE_TOKEN_ADDRESS
  );
  const privateKey = process.env.PRIVATE_KEY;

  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const ownerAddress = account.address;

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
    .filter((item) => item.customer_ident === walletAddress)
    .map((item) => item.id);

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
        (item) => item.item[0].plan.recurring_interval === "Month"
      );
      const hasYearly = userSubcription.some(
        (item) => item.item[0].plan.recurring_interval === "Year"
      );

      // If we have both a monthly and a yearly active plan, cancel the monthly one
      if (hasMonthly && hasYearly) {
        userSubcription.forEach(async (item) => {
          if (item.item[0].plan.recurring_interval === "Month") {
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
    try {
      const balance = await getWalletBalance(
        web3,
        tokenContract,
        walletAddress
      );
      const balanceWei = await web3.eth.getBalance(walletAddress);
      // Convert wei to ether
      const balanceEth = web3.utils.fromWei(balanceWei, "ether");
      // If balance is less than 0.5 MASQ, calculate the airdrop amount
      if (userSubcription.length > 0) {
        if (parseFloat(balance) < 0.5) {
          if (recentAirdropsForWallet.length === 0) {
            // check if the airdrop for the user in the last 30 days is less than 1
            if (recentAirdropsForWallet[0].amountOfLastAirdrop < 1) {
              const amountToAirdrop = (
                1 -
                parseFloat(
                  balance + recentAirdropsForWallet[0].amountOfLastAirdrop
                )
              ).toString();
              userwallet.push(walletAddress);
              userAmount.push(web3.utils.toWei(amountToAirdrop, "ether"));
              // tranfer native MATIC
              if (parseFloat(balanceEth) < 0.5) {
                const data = disperseContract.methods
                  .disperseEther(userwallet, userAmount)
                  .encodeABI();

                const tx = {
                  from: ownerAddress,
                  to: process.env.DISPERSE_TOKEN_ADDRESS,
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
                console.log(
                  `ETH Transfer successful. Transaction receipt:`,
                  receipt
                );
              }
              if (userAmount.length > 0) {
                const data = disperseContract.methods
                  .disperseToken(tokenAddress, userwallet, userAmount)
                  .encodeABI();

                const tx = {
                  from: ownerAddress,
                  to: process.env.DISPERSE_TOKEN_ADDRESS,
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
              // const receipt = await transferTokens(walletAddress, amountToAirdrop);
              // add user airdrop to mongodb
              const newAirdrop = new Airdrop({
                walletAddress: walletAddress,
                dateOfLastAirdrop: Date.now(),
                amountOfLastAirdrop: amountToAirdrop,
              });
              await newAirdrop.save(); // Save the airdrop data in the database
              return res.status(200).json({
                message: `Airdropped ${amountToAirdrop} MASQ to ${walletAddress}`,
                receipt,
              });
            } else {
              res.status(400).json({
                error: "User has exceeded maximum allowed amount for 30days",
              });
            }
          } else {
            res
              .status(400)
              .json({ error: "User has been airdropped in the last 30days" });
          }
        } else {
          return res.status(200).json({
            message: `No airdrop necessary. Current balance: ${balance} MASQ`,
          });
        }
      } else {
        res.status(200).json({ error: "User is not an Active Subscriber" });
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
