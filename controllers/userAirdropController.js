const {Web3} = require('web3');
const axios = require('axios');
const {erc20ABI} = require("../assets/erc20ABI");
const { getWalletBalance } = require('../utils/getBalance');
// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.PROVIDER_URL));
const tokenAddress = process.env.MUMBAI_MASQ_CONTRACT;

const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);
const processAirdrop = async (req, res) => {
  //
  const { walletAddress } = req.body;
  // Validate input
  if (!web3.utils.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const balance = await getWalletBalance(web3, tokenContract, walletAddress);
    // If balance is less than 0.5 MASQ, calculate the airdrop amount
    if (parseFloat(balance) < 0.5) {
      const amountToAirdrop = (1 - parseFloat(balance)).toString();
      const receipt = await transferTokens(walletAddress, amountToAirdrop);
      return res
        .status(200)
        .json({
          message: `Airdropped ${amountToAirdrop} MASQ to ${walletAddress}`,
          receipt,
        });
    } else {
      return res
        .status(200)
        .json({
          message: `No airdrop necessary. Current balance: ${balance} MASQ`,
        });
    }
  } catch (error) {
    console.error("Error during airdrop:", error);
    return res.status(500).json({ error: "Error during airdrop process" });
  }
};

module.exports = {
  processAirdrop,
};
