const { createUser } = require("../utils/boomFi");
const createUserProfile = async (req, res) => {
  try {
    const { email, customer_ident } = req.body;
    const user = await createUser(email, customer_ident);
    res.status(200).json({ message: "user successfully created", body: user });
  } catch (err) {
    res.status(400).json({ message: "Error Creating user", body: err });
  }
};

const createVariantPaylink = async(req, res) => {
    
}

module.exports = {
  createUserProfile,
};
