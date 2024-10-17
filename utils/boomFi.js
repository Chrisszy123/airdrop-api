const axios = require("axios");

const getUserSubscription = async (customer_id) => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/subscriptions`,
    params: { customer_id },
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_PRIVATE_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Getting Subscription", err);
  }
};
const getSubscriptions = async () => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/subscriptions`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_PRIVATE_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Getting Subscriptions", err);
  }
};
const getUserByAddress = async (walletAddress) => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/customers`,
    params: { search: walletAddress },
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_PRIVATE_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response;
  } catch (err) {
    console.log("ERROR Getting User by Address");
  }
};
 const getPlans = async() => {
  const options = {
      method: 'GET',
      url: `${process.env.BOOMFI_URL}/plan`,
      headers: {accept: 'application/json', 'X-API-KEY': process.env.BOOMFI_PRIVATE_KEY}
    };
    try{
      const response = await axios.request(options)
      return response.data
    }catch(err){
      console.log("ERROR Getting plan", err)
    }
}
module.exports = {
  getUserSubscription,
  getSubscriptions,
  getUserByAddress,
  getPlans
};
