const axios = require("axios");

const getUserSubscription = async (customer_id) => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/subscriptions`,
    params: { customer_id },
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Getting Subscription", err);
  }
};
const getPayLink = async (reference) => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/paylinks`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    const result = response.data.data.items;
    const paylink = result.find((item) => item.plan.reference === reference);
    const paylinkId = paylink.id;
    return paylinkId;
  } catch (err) {
    console.log("ERROR Getting Subscription", err);
  }
};
const createUser = async (email, customer_ident) => {
  const options = {
    method: "POST",
    url: `${process.env.BOOMFI_URL}/customers`,
    body: JSON.stringify({ email, customer_ident }),
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Creating User", err);
  }
};
const getSubscriptions = async () => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/subscriptions`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Getting Subscriptions", err);
  }
};
const getUserByAddress = async () => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/customers`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response;
  } catch (err) {
    console.log("ERROR Getting User by Address");
  }
};
const getPlans = async () => {
  const options = {
    method: "GET",
    url: `${process.env.BOOMFI_URL}/plan`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Getting plan", err);
  }
};
const cancelUserSubcription = async (subscriptionID) => {
  const options = {
    method: "DELETE",
    url: `${process.env.BOOMFI_URL}/subscriptions/${subscriptionID}`,
    headers: {
      accept: "application/json",
      "X-API-KEY": process.env.BOOMFI_API_KEY,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.log("ERROR Deleting Subcription", err);
  }
};
module.exports = {
  getUserSubscription,
  getSubscriptions,
  getUserByAddress,
  getPlans,
  cancelUserSubcription,
  createUser,
  getPayLink
};
