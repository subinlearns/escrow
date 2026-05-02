const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleEscrow", function () {
  async function deployFixture() {
    const [buyer, seller, stranger] = await ethers.getSigners();
    const SimpleEscrow = await ethers.getContractFactory("SimpleEscrow");
    const escrow = await SimpleEscrow.deploy();

    return { escrow, buyer, seller, stranger };
  }

  it("creates a funded deal", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const amount = ethers.parseEther("1");

    await expect(
      escrow.connect(buyer).createDeal(seller.address, "Build landing page", { value: amount })
    )
      .to.emit(escrow, "DealCreated")
      .withArgs(1, buyer.address, seller.address, amount, "Build landing page");

    const deal = await escrow.getDeal(1);
    expect(deal.buyer).to.equal(buyer.address);
    expect(deal.seller).to.equal(seller.address);
    expect(deal.amount).to.equal(amount);
    expect(deal.status).to.equal(0);
  });

  it("lets the buyer release payment to the seller", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const amount = ethers.parseEther("1");

    await escrow.connect(buyer).createDeal(seller.address, "Logo design", { value: amount });

    await expect(() => escrow.connect(buyer).releasePayment(1)).to.changeEtherBalances(
      [escrow, seller],
      [-amount, amount]
    );

    const deal = await escrow.getDeal(1);
    expect(deal.status).to.equal(1);
  });

  it("supports seller-requested cancellation and buyer-approved refund", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const amount = ethers.parseEther("0.25");

    await escrow.connect(buyer).createDeal(seller.address, "Prototype review", { value: amount });

    await expect(escrow.connect(seller).requestCancellation(1))
      .to.emit(escrow, "CancellationRequested")
      .withArgs(1);

    await expect(() => escrow.connect(buyer).approveRefund(1)).to.changeEtherBalances(
      [escrow, buyer],
      [-amount, amount]
    );

    const deal = await escrow.getDeal(1);
    expect(deal.status).to.equal(3);
  });

  it("blocks strangers from releasing funds", async function () {
    const { escrow, buyer, seller, stranger } = await deployFixture();

    await escrow
      .connect(buyer)
      .createDeal(seller.address, "Private task", { value: ethers.parseEther("0.5") });

    await expect(escrow.connect(stranger).releasePayment(1)).to.be.revertedWithCustomError(
      escrow,
      "NotBuyer"
    );
  });
});
