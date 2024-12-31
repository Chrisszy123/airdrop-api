const handleProvider = (chain) => {
  let providerUrl;
  if (chain === "polygon-amoy") {
    providerUrl = process.env.PROVIDER_URL;
  } else if (chain === "base-sepolia") {
    providerUrl = process.env.BASE_SEPOLIA_PROVIDER_URL;
  } else if (chain === "polygon-mainnet") {
    providerUrl = process.env.MAINNET_PROVIDER_URL;
  } else {
    providerUrl = process.env.BASE_SEPOLIA_PROVIDER_URL;
  }
  return providerUrl;
};
const handleAddress = (chain) => {
  let address;
  if (chain === "polygon-amoy") {
    address = process.env.DISPERSE_TOKEN_ADDRESS;
  } else if (chain === "base-sepolia") {
    address = process.env.DISPERSE_BASE_SEPOLIA_ADDRESS;
  } else {
    address = process.env.DISPERSE_BASE_SEPOLIA_ADDRESS;
  }
  return address;
};
const handleERCAddress = (chain) => {
  let address;
  if (chain === "polygon-amoy") {
    address = process.env.MUMBAI_MASQ_CONTRACT;
  } else if (chain === "base-sepolia") {
    address = process.env.MASQ_BASE_SEPOLIA_CONTRACT;
  } else {
    address = process.env.MASQ_BASE_SEPOLIA_CONTRACT;
  }
  return address;
};

module.exports = {
  handleProvider,
  handleAddress,
  handleERCAddress
};
