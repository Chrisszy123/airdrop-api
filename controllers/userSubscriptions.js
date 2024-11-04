const { getUserSubscription, getUserByAddress } = require("../utils/boomFi");

async function getSubscription(req, res) {
  const { walletAddress } = req.query;
  try {
    const response = await getUserByAddress(walletAddress);
    const customer_id = response?.data?.data?.items[0]?.id;

    const userSubcription = await getUserSubscription(customer_id);
    res.status(200).send(userSubcription);
  } catch (err) {
    console.log("Error:", err)
    res.status(500).send("Error Getting Subcription")
  }
}
module.exports = {
  getSubscription,
};
