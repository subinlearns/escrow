const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.ESCROW_ADDRESS;
  const dealId = process.env.DEAL_ID;

  if (!contractAddress) throw new Error("Missing ESCROW_ADDRESS");
  if (!dealId) throw new Error("Missing DEAL_ID");

  const escrow = await hre.ethers.getContractAt("SimpleEscrow", contractAddress);
  const tx = await escrow.releasePayment(dealId);
  await tx.wait();

  console.log(`Released payment for deal #${dealId}`);
  console.log(`Transaction: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
