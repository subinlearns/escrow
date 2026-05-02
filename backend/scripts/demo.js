const hre = require("hardhat");

async function main() {
  const [buyer, seller] = await hre.ethers.getSigners();
  const amount = hre.ethers.parseEther("0.01");

  const SimpleEscrow = await hre.ethers.getContractFactory("SimpleEscrow");
  const escrow = await SimpleEscrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`Escrow deployed to: ${address}`);
  console.log(`Buyer: ${buyer.address}`);
  console.log(`Seller: ${seller.address}`);

  const createTx = await escrow
    .connect(buyer)
    .createDeal(seller.address, "Hackathon demo escrow", { value: amount });
  await createTx.wait();
  console.log(`Created deal #1 with ${hre.ethers.formatEther(amount)} ETH`);

  const releaseTx = await escrow.connect(buyer).releasePayment(1);
  await releaseTx.wait();
  console.log("Buyer released payment to seller");

  const deal = await escrow.getDeal(1);
  console.log(`Final deal status: ${deal.status} (1 means Released)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
