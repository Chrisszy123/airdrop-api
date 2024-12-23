const handleProvider = (chain) => {
  let providerUrl;
  if (chain === "polygon-amoy") {
    providerUrl = process.env.PROVIDER_URL;
  } else if (chain === "base-mainnet") {
    providerUrl = process.env.BASE_PROVIDER_URL;
  } else if (chain === "polygon-mainnet") {
    providerUrl = process.env.MAINNET_PROVIDER_URL;
  } else {
    providerUrl = process.env.BASE_PROVIDER_URL;
  }
  return providerUrl;
};

module.exports = {
  handleProvider,
};
