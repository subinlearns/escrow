const hre = require("hardhat");

async function main() {
  const SimpleEscrow = await hre.ethers.getContractFactory("SimpleEscrow");
  const escrow = await SimpleEscrow.deploy();

  await escrow.waitForDeployment();

  console.log(`SimpleEscrow deployed to: ${await escrow.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
