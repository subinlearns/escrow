export const simpleEscrowAbi = [
  {
    inputs: [
      { internalType: "address payable", name: "seller", type: "address" },
      { internalType: "string", name: "description", type: "string" },
    ],
    name: "createDeal",
    outputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "releasePayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "requestCancellation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "approveRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "dealId", type: "uint256" }],
    name: "getDeal",
    outputs: [
      {
        components: [
          { internalType: "address payable", name: "buyer", type: "address" },
          { internalType: "address payable", name: "seller", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "enum SimpleEscrow.Status", name: "status", type: "uint8" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "completedAt", type: "uint256" },
        ],
        internalType: "struct SimpleEscrow.Deal",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextDealId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "dealId", type: "uint256" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: true, internalType: "address", name: "seller", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "string", name: "description", type: "string" },
    ],
    name: "DealCreated",
    type: "event",
  },
];
