const { ethers } = require('hardhat');

async function main() {
  const disperse = await ethers.deployContract('Disperse');

  await disperse.waitForDeployment();

  console.log('Disperse Contract Deployed at ' + disperse.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});