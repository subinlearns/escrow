const hre = require("hardhat");

function explainContractError(error, escrow) {
  const data = error.data || error.error?.data;

  if (!data) {
    return error.shortMessage || error.message;
  }

  try {
    const parsed = escrow.interface.parseError(data);
    return `${parsed.name}${parsed.args.length ? `(${parsed.args.join(", ")})` : ""}`;
  } catch {
    return error.shortMessage || error.message;
  }
}

async function main() {
  const contractAddress = process.env.ESCROW_ADDRESS;
  const seller = process.env.SELLER_ADDRESS;
  const amountEth = process.env.AMOUNT_ETH || "0.01";
  const description = process.env.DESCRIPTION || "Escrow deal";

  if (!contractAddress) throw new Error("Missing ESCROW_ADDRESS");
  if (!seller) throw new Error("Missing SELLER_ADDRESS");
  if (!hre.ethers.isAddress(contractAddress)) throw new Error("ESCROW_ADDRESS is not valid");
  if (!hre.ethers.isAddress(seller)) throw new Error("SELLER_ADDRESS is not valid");

  const [buyer] = await hre.ethers.getSigners();
  const amount = hre.ethers.parseEther(amountEth);
  const normalizedSeller = hre.ethers.getAddress(seller);
  const normalizedBuyer = hre.ethers.getAddress(buyer.address);
  const code = await hre.ethers.provider.getCode(contractAddress);

  if (amount === 0n) throw new Error("AMOUNT_ETH must be greater than zero");
  if (normalizedSeller === normalizedBuyer) {
    throw new Error("SELLER_ADDRESS cannot be the same wallet as the buyer PRIVATE_KEY");
  }
  if (code === "0x") {
    throw new Error("No contract is deployed at ESCROW_ADDRESS on this network");
  }

  const escrow = await hre.ethers.getContractAt("SimpleEscrow", contractAddress);

  console.log(`Buyer: ${normalizedBuyer}`);
  console.log(`Seller: ${normalizedSeller}`);
  console.log(`Amount: ${amountEth} ETH`);
  console.log(`Escrow contract: ${contractAddress}`);

  try {
    await escrow.createDeal.staticCall(normalizedSeller, description, { value: amount });
  } catch (error) {
    throw new Error(`createDeal would revert: ${explainContractError(error, escrow)}`);
  }

  const tx = await escrow.createDeal(normalizedSeller, description, { value: amount });
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "DealCreated");

  console.log(`Deal created in tx: ${tx.hash}`);
  if (event) {
    console.log(`Deal ID: ${event.args.dealId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
