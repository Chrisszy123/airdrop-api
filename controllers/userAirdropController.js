const { Web3 } = require("web3");
const axios = require("axios");
const { erc20ABI } = require("../assets/erc20ABI");
const { getWalletBalance } = require("../utils/getBalance");
const Airdrop = require("../models/airdropModel");
const { getUserByAddress, getUserSubscription } = require("../utils/boomFi");
const DisperContract = require("../artifacts/contracts/Disperse.sol/Disperse.json");
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
const processUserAirdrop = async (req, res) => {
  let userwallet = [];
  let userAmount = [];
  //
  const { walletAddress } = req.body;
  console.log("Wallet", walletAddress)
  const user = await getUserByAddress(walletAddress);
  const customer_id = user?.data?.data?.items[0]?.id;
  const userSubcription = await getUserSubscription(customer_id);
  // Validate input
  if (!web3.utils.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const balance = await getWalletBalance(web3, tokenContract, walletAddress);
    // If balance is less than 0.5 MASQ, calculate the airdrop amount
    const isActive = userSubcription?.data?.items?.some(
      (item) => item.status === "Active"
    );
    if (isActive) {
      if (parseFloat(balance) < 0.5) {
        const amountToAirdrop = (1 - parseFloat(balance)).toString();
        userwallet.push(walletAddress);
        userAmount.push(amountToAirdrop);

        if (userAmount.length > 0) {
          const data = disperseContract.methods
            .disperseToken(tokenAddress, userwallet, userAmount)
            .encodeABI();

          const tx = {
            from: ownerAddress,
            to: tokenAddress,
            gas: 200000,
            data: data,
          };

          const signedTx = await web3.eth.accounts.signTransaction(
            tx,
            privateKey
          );
          const receipt = await web3.eth.sendSignedTransaction(
            signedTx.rawTransaction
          );
          console.log(`Transfer successful. Transaction receipt:`, receipt);
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
        return res.status(200).json({
          message: `No airdrop necessary. Current balance: ${balance} MASQ`,
        });
      }
    }
  } catch (error) {
    console.error("Error during airdrop:", error);
    return res.status(500).json({ error: "Error during airdrop process" });
  }
};

module.exports = {
  processUserAirdrop,
};
