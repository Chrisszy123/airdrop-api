const { getUserByAddress, getSubscriptions } = require("../utils/boomFi");

async function getSubscription(req, res) {
  const { walletAddress } = req.query;
  try {
    const response = await getUserByAddress();
    const idsForWallet = response.data?.data?.items
      .filter((item) => item.customer_ident === walletAddress)
      .map((item) => item.id);
    const result = await getSubscriptions();
    const userSubcription = result.data?.items.filter(
      (item) =>
        idsForWallet.includes(item.customer_id) &&
        item.status === "Active" &&
        item.is_overdue === false
    );
    res.status(200).send(userSubcription);
  } catch (err) {
    console.log("Error:", err);
    res.status(500).send("Error Getting Subcription");
  }
}
module.exports = {
  getSubscription,
};
