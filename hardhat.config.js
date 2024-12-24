require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.4.25",
      },
      {
        version: "0.8.27",
        settings: {},
      },
    ],
  }
};
