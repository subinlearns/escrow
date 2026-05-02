// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleEscrow
/// @notice A minimal ETH escrow contract for hackathon demos.
/// @dev Flow: buyer creates and funds an escrow, seller delivers off-chain,
/// buyer releases payment, or seller asks to cancel and buyer approves refund.
contract SimpleEscrow {
    enum Status {
        Funded,
        Released,
        CancelRequested,
        Refunded
    }

    struct Deal {
        address payable buyer;
        address payable seller;
        uint256 amount;
        string description;
        Status status;
        uint256 createdAt;
        uint256 completedAt;
    }

    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;

    event DealCreated(
        uint256 indexed dealId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        string description
    );
    event PaymentReleased(uint256 indexed dealId, address indexed seller, uint256 amount);
    event CancellationRequested(uint256 indexed dealId);
    event PaymentRefunded(uint256 indexed dealId, address indexed buyer, uint256 amount);

    error InvalidSeller();
    error InvalidAmount();
    error DealNotFound();
    error NotBuyer();
    error NotSeller();
    error InvalidStatus();
    error TransferFailed();

    modifier onlyBuyer(uint256 dealId) {
        if (msg.sender != deals[dealId].buyer) revert NotBuyer();
        _;
    }

    modifier onlySeller(uint256 dealId) {
        if (msg.sender != deals[dealId].seller) revert NotSeller();
        _;
    }

    modifier dealExists(uint256 dealId) {
        if (deals[dealId].buyer == address(0)) revert DealNotFound();
        _;
    }

    function createDeal(address payable seller, string calldata description)
        external
        payable
        returns (uint256 dealId)
    {
        if (seller == address(0) || seller == msg.sender) revert InvalidSeller();
        if (msg.value == 0) revert InvalidAmount();

        dealId = nextDealId++;
        deals[dealId] = Deal({
            buyer: payable(msg.sender),
            seller: seller,
            amount: msg.value,
            description: description,
            status: Status.Funded,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit DealCreated(dealId, msg.sender, seller, msg.value, description);
    }

    function releasePayment(uint256 dealId) external dealExists(dealId) onlyBuyer(dealId) {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Funded) revert InvalidStatus();

        deal.status = Status.Released;
        deal.completedAt = block.timestamp;

        (bool success,) = deal.seller.call{value: deal.amount}("");
        if (!success) revert TransferFailed();

        emit PaymentReleased(dealId, deal.seller, deal.amount);
    }

    function requestCancellation(uint256 dealId) external dealExists(dealId) onlySeller(dealId) {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.Funded) revert InvalidStatus();

        deal.status = Status.CancelRequested;
        emit CancellationRequested(dealId);
    }

    function approveRefund(uint256 dealId) external dealExists(dealId) onlyBuyer(dealId) {
        Deal storage deal = deals[dealId];
        if (deal.status != Status.CancelRequested) revert InvalidStatus();

        deal.status = Status.Refunded;
        deal.completedAt = block.timestamp;

        (bool success,) = deal.buyer.call{value: deal.amount}("");
        if (!success) revert TransferFailed();

        emit PaymentRefunded(dealId, deal.buyer, deal.amount);
    }

    function getDeal(uint256 dealId) external view dealExists(dealId) returns (Deal memory) {
        return deals[dealId];
    }
}
