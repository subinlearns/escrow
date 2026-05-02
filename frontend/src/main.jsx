import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Link2,
  LockKeyhole,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { simpleEscrowAbi } from "./contracts/simpleEscrowAbi";
import "./styles.css";

const contractAddress = import.meta.env.VITE_ESCROW_ADDRESS || "";
const statusLabels = ["Funded", "Released", "Cancel Requested", "Refunded"];
const statusStyles = [
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  "border-sky-500/30 bg-sky-500/10 text-sky-200",
  "border-amber-500/30 bg-amber-500/10 text-amber-200",
  "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
];
const navItems = [
  { id: "landing", label: "Service" },
  { id: "buyer", label: "Buyer Dashboard" },
  { id: "admin", label: "Admin" },
];

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sameAddress(a, b) {
  return a && b && a.toLowerCase() === b.toLowerCase();
}

function formatDate(timestamp) {
  const value = Number(timestamp);
  if (!value) return "Open";
  return new Date(value * 1000).toLocaleString();
}

function getErrorMessage(error) {
  return (
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "Transaction failed"
  );
}

function PrimaryButton({ children, icon: Icon, loading, className = "", ...props }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ember-600 px-4 text-sm font-semibold text-white shadow-redline transition hover:bg-ember-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function SecondaryButton({ children, icon: Icon, loading, className = "", ...props }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-100 transition hover:border-ember-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-zinc-300">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [view, setView] = useState("landing");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [balance, setBalance] = useState("");
  const [dealId, setDealId] = useState("1");
  const [deal, setDeal] = useState(null);
  const [adminDeals, setAdminDeals] = useState([]);
  const [adminLoadedAt, setAdminLoadedAt] = useState("");
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [description, setDescription] = useState("Website escrow");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const hasWallet = typeof window !== "undefined" && Boolean(window.ethereum);

  const provider = useMemo(() => {
    if (!hasWallet) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [hasWallet]);

  const signerContract = async () => {
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, simpleEscrowAbi, signer);
  };

  const readContract = () => {
    return new ethers.Contract(contractAddress, simpleEscrowAbi, provider);
  };

  async function refreshWallet() {
    if (!provider) return;
    const accounts = await provider.send("eth_accounts", []);
    const network = await provider.getNetwork();
    setChainId(network.chainId.toString());

    if (accounts[0]) {
      setAccount(accounts[0]);
      const walletBalance = await provider.getBalance(accounts[0]);
      setBalance(Number(ethers.formatEther(walletBalance)).toFixed(4));
    } else {
      setAccount("");
      setBalance("");
    }
  }

  async function connectWallet() {
    setError("");
    if (!provider) {
      setError("MetaMask is not available in this browser.");
      return;
    }
    await provider.send("eth_requestAccounts", []);
    await refreshWallet();
  }

  async function disconnectWallet() {
    setError("");
    setNotice("");

    try {
      if (window.ethereum?.request) {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch {
      // Some wallets do not support permission revocation; clearing app state still works.
    }

    setAccount("");
    setBalance("");
    setChainId("");
    setDeal(null);
    setNotice("Wallet disconnected. Connect again and choose another account.");
  }

  async function loadDeal(id = dealId) {
    setError("");
    setNotice("");
    if (!contractAddress) {
      setError("Set VITE_ESCROW_ADDRESS in frontend/.env.");
      return;
    }
    if (!provider) {
      setError("Connect a wallet provider first.");
      return;
    }
    if (!id || Number(id) <= 0) {
      setError("Enter a valid deal ID.");
      return;
    }

    try {
      setBusy("load");
      const contract = readContract();
      const data = await contract.getDeal(id);
      setDeal({
        id,
        buyer: data.buyer,
        seller: data.seller,
        amount: data.amount,
        description: data.description,
        status: Number(data.status),
        createdAt: data.createdAt,
        completedAt: data.completedAt,
      });
    } catch (err) {
      setDeal(null);
      setError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function loadAdminDeals() {
    setError("");
    setNotice("");
    if (!contractAddress) {
      setError("Set VITE_ESCROW_ADDRESS in frontend/.env.");
      return;
    }
    if (!provider) {
      setError("Connect a wallet provider first.");
      return;
    }

    try {
      setBusy("admin");
      const contract = readContract();
      const nextDealId = Number(await contract.nextDealId());
      const ids = Array.from({ length: Math.max(nextDealId - 1, 0) }, (_, index) => index + 1);
      const rows = await Promise.all(
        ids.map(async (id) => {
          const data = await contract.getDeal(id);
          return normalizeDeal(id.toString(), data);
        }),
      );
      setAdminDeals(rows.reverse());
      setAdminLoadedAt(new Date().toLocaleTimeString());
      setNotice(`Loaded ${rows.length} deal${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function createDeal(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      setBusy("create");
      const contract = await signerContract();
      const tx = await contract.createDeal(seller, description, {
        value: ethers.parseEther(amount),
      });
      setNotice(`Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      const created = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((eventLog) => eventLog?.name === "DealCreated");

      const newDealId = created ? created.args.dealId.toString() : dealId;
      setDealId(newDealId);
      setNotice(`Deal #${newDealId} created.`);
      await loadDeal(newDealId);
      await refreshWallet();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function runDealAction(action, label) {
    setError("");
    setNotice("");

    try {
      setBusy(action);
      const contract = await signerContract();
      const tx = await contract[action](deal.id);
      setNotice(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      setNotice(label);
      await loadDeal(deal.id);
      await refreshWallet();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function copyAddress(value) {
    await navigator.clipboard.writeText(value);
    setNotice("Address copied.");
  }

  useEffect(() => {
    refreshWallet();
    if (!window.ethereum) return undefined;

    const handleAccounts = () => refreshWallet();
    const handleChain = () => refreshWallet();
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    };
  }, [provider]);

  const isBuyer = sameAddress(account, deal?.buyer);
  const isSeller = sameAddress(account, deal?.seller);
  const funded = deal?.status === 0;
  const cancelRequested = deal?.status === 2;
  const adminStats = getAdminStats(adminDeals);

  if (view === "landing") {
    return (
      <main className="escrowly-page">
        <LandingPage onStart={() => setView("buyer")} onAdmin={() => setView("admin")} />
        {(notice || error) && (
          <div
            className={`fixed bottom-4 left-4 right-4 z-10 rounded-md border px-4 py-3 text-sm shadow-redline md:left-auto md:w-[460px] ${
              error
                ? "border-ember-700 bg-ember-950 text-ember-100"
                : "border-emerald-800 bg-emerald-950 text-emerald-100"
            }`}
          >
            {error || notice}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,4,41,0.26),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(239,35,60,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[length:auto,auto,30px_30px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-ember-700 bg-ember-600/15">
              <Shield className="h-6 w-6 text-ember-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-white">Escrowly</h1>
              <p className="text-sm text-zinc-400">Contract-held settlement for digital deals</p>
            </div>
          </div>

          <nav className="flex w-full gap-2 overflow-x-auto rounded-md border border-zinc-900 bg-black/50 p-1 lg:w-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`h-10 shrink-0 rounded-md px-4 text-sm font-semibold transition ${
                  view === item.id ? "bg-ember-600 text-white shadow-redline" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            {account ? (
              <div className="flex h-11 items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium">{shortAddress(account)}</span>
                <span className="text-zinc-500">{balance} ETH</span>
              </div>
            ) : null}
            {account ? (
              <SecondaryButton icon={X} onClick={disconnectWallet}>
                Disconnect
              </SecondaryButton>
            ) : (
              <PrimaryButton icon={Wallet} onClick={connectWallet}>
                Connect Wallet
              </PrimaryButton>
            )}
          </div>
        </header>

        {view === "buyer" ? (
          <BuyerDashboard
            account={account}
            balance={balance}
            busy={busy}
            cancelRequested={cancelRequested}
            chainId={chainId}
            contractAddress={contractAddress}
            copyAddress={copyAddress}
            createDeal={createDeal}
            deal={deal}
            dealId={dealId}
            description={description}
            funded={funded}
            isBuyer={isBuyer}
            isSeller={isSeller}
            loadDeal={loadDeal}
            amount={amount}
            runDealAction={runDealAction}
            seller={seller}
            setAmount={setAmount}
            setDealId={setDealId}
            setDescription={setDescription}
            setSeller={setSeller}
          />
        ) : null}

        {view === "admin" ? (
          <AdminDashboard
            adminDeals={adminDeals}
            adminLoadedAt={adminLoadedAt}
            adminStats={adminStats}
            busy={busy}
            contractAddress={contractAddress}
            loadAdminDeals={loadAdminDeals}
            setDealId={setDealId}
            setView={setView}
          />
        ) : null}

        {(notice || error) && (
          <div
            className={`fixed bottom-4 left-4 right-4 z-10 rounded-md border px-4 py-3 text-sm shadow-redline md:left-auto md:w-[460px] ${
              error
                ? "border-ember-700 bg-ember-950 text-ember-100"
                : "border-emerald-800 bg-emerald-950 text-emerald-100"
            }`}
          >
            {error || notice}
          </div>
        )}
      </div>
    </main>
  );
}

function normalizeDeal(id, data) {
  return {
    id,
    buyer: data.buyer,
    seller: data.seller,
    amount: data.amount,
    description: data.description,
    status: Number(data.status),
    createdAt: data.createdAt,
    completedAt: data.completedAt,
  };
}

function getAdminStats(deals) {
  return deals.reduce(
    (stats, deal) => {
      stats.total += 1;
      stats.volume += Number(ethers.formatEther(deal.amount));
      if (deal.status === 0) stats.funded += 1;
      if (deal.status === 1) stats.released += 1;
      if (deal.status === 2) stats.cancelRequested += 1;
      if (deal.status === 3) stats.refunded += 1;
      return stats;
    },
    { total: 0, volume: 0, funded: 0, released: 0, cancelRequested: 0, refunded: 0 },
  );
}

function LandingPage({ onStart, onAdmin }) {
  const steps = [
    ["01", "Deposit", "Client deposits funds into the smart contract. Funds are locked on-chain and visible to all parties."],
    ["02", "Execute", "Service provider completes the agreed work while the escrow keeps payment secured."],
    ["03", "Verify", "Client reviews the delivery and signs the approval from the connected wallet."],
    ["04", "Release", "The smart contract releases funds to the seller and records the settlement permanently."],
  ];
  const features = [
    [LockKeyhole, "Secure", "Payments", "Funds are locked inside a smart contract. No party can move them until the deal rules are met."],
    [Scale, "Dispute", "Resolution", "Cancellation and refund flows give each party a transparent path when a deal needs review."],
    [Link2, "Decentralized", "Trustless", "The blockchain enforces settlement rules without relying on a central payment holder."],
    [Search, "Full", "Transparency", "Every deal, status change, wallet, and fund movement can be inspected from the dashboard."],
  ];
  const useCases = [
    ["// 01", "Freelance Markets", "Protect developers, designers, writers, and remote professionals delivering digital work."],
    ["// 02", "Gig Economy", "Give clients and workers a direct payment flow with contract-backed release controls."],
    ["// 03", "Online Services", "Secure consulting, SaaS setup, creative services, and other digital transactions."],
    ["// 04", "P2P Sales", "Let strangers transact with more confidence through visible escrowed funds."],
  ];

  return (
    <>
      <LandingNav onStart={onStart} onAdmin={onAdmin} />

      <section className="es-hero">
        <div className="es-hero-grid" />
        <div className="es-hero-glow" />
        <div className="es-hero-tag">// Decentralized Escrow Protocol</div>
        <h1 className="es-hero-title es-glitch-text" data-text="ESCROWLY">
          ESCROW<span>LY</span>
        </h1>
        <p className="es-hero-desc">
          A blockchain-powered escrow service that holds funds in smart contracts until work is verified. No central authority. No broken promises. Just transparent, automated trust.
        </p>
        <div className="es-hero-actions">
          <button className="es-btn-primary" onClick={onStart}>
            Get Started
          </button>
          <a className="es-btn-secondary" href="#how">
            See how it works
          </a>
        </div>
        <div className="es-hero-stats">
          <LandingStat number="100%" label="On-Chain" />
          <LandingStat number="0" label="Middlemen" />
          <LandingStat number="∞" label="Trustless" />
        </div>
      </section>

      <section className="es-section" id="how">
        <div className="es-section-tag">// Protocol Flow</div>
        <h2 className="es-section-title">
          How It
          <span>Works</span>
        </h2>
        <div className="es-steps-grid">
          {steps.map(([number, title, body]) => (
            <div className="es-step" key={number}>
              <div className="es-step-num">{number}</div>
              <h3 className="es-step-title">{title}</h3>
              <p className="es-step-desc">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="es-features-section" id="features">
        <div className="es-section-tag">// Core Capabilities</div>
        <h2 className="es-section-title">
          Key
          <span>Features</span>
        </h2>
        <div className="es-features-grid">
          {features.map(([Icon, accent, title, body]) => (
            <div className="es-feature-card" key={title}>
              <div className="es-feature-icon">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="es-feature-title">
                <span>{accent}</span> {title}
              </h3>
              <p className="es-feature-desc">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="es-usecases-section" id="usecases">
        <div className="es-section-tag">// Applications</div>
        <h2 className="es-section-title">
          Use
          <span>Cases</span>
        </h2>
        <div className="es-usecases-grid">
          {useCases.map(([number, title, body]) => (
            <div className="es-usecase-card" key={title}>
              <div className="es-usecase-num">{number}</div>
              <h3 className="es-usecase-title">{title}</h3>
              <p className="es-usecase-desc">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="es-contract-section" id="contract">
        <div>
          <div className="es-section-tag">// Smart Contract</div>
          <h2 className="es-section-title">
            Powered By
            <span>Code</span>
          </h2>
          <div className="es-red-divider" />
          <p className="es-contract-copy">
            Smart contracts are self-executing programs deployed on-chain. They enforce the escrow rules, hold payment, and expose every deal state transparently.
          </p>
          <div className="es-contract-meta">
            <MetaItem label="Network" value="Ethereum" />
            <MetaItem label="Status" value="Verified" />
            <MetaItem label="Gas" value="Optimized" />
          </div>
        </div>
        <ContractTerminal />
      </section>

      <section className="es-cta-section" id="cta">
        <div className="es-section-tag es-centered">// Join the Protocol</div>
        <h2 className="es-section-title">
          Build With
          <span>Trust</span>
        </h2>
        <p className="es-cta-sub">
          Eliminate payment risk from your deals. Start using Escrowly today: secure, decentralized, and built for digital work.
        </p>
        <div className="es-cta-buttons">
          <button className="es-btn-primary" onClick={onStart}>
            Launch App
          </button>
          <button className="es-btn-outline" onClick={onAdmin}>
            Admin Ledger
          </button>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}

function LandingNav({ onStart, onAdmin }) {
  return (
    <nav className="es-nav">
      <a className="es-logo" href="#">
        <LogoMark />
        <span>ESCROW</span>
        <strong>LY</strong>
      </a>
      <div className="es-nav-links">
        <a href="#how">How It Works</a>
        <a href="#features">Features</a>
        <a href="#usecases">Use Cases</a>
        <a href="#contract">Smart Contract</a>
      </div>
      <div className="es-nav-actions">
        <button className="es-nav-link-button" onClick={onAdmin}>
          Admin
        </button>
        <button className="es-nav-cta" onClick={onStart}>
          Launch App
        </button>
      </div>
    </nav>
  );
}

function LogoMark() {
  return (
    <svg className="es-logo-icon" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,2 98,27 98,88 50,113 2,88 2,27" fill="#2a0000" stroke="#CC0000" strokeWidth="4" />
      <polygon points="50,10 90,32 90,83 50,105 10,83 10,32" fill="#1a0000" />
      <text x="50" y="74" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="52" fill="#CC0000" letterSpacing="2">
        E
      </text>
    </svg>
  );
}

function LandingStat({ number, label }) {
  return (
    <div className="es-landing-stat">
      <div className="es-stat-number">{number}</div>
      <div className="es-stat-label">{label}</div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <div className="es-meta-label">{label}</div>
      <div className="es-meta-value">{value}</div>
    </div>
  );
}

function ContractTerminal() {
  return (
    <div className="es-contract-terminal">
      <div className="es-terminal-header">
        <div className="es-terminal-dot" />
        <div className="es-terminal-dot" />
        <div className="es-terminal-dot" />
        <div className="es-terminal-title">SimpleEscrow.sol</div>
      </div>
      <div className="es-terminal-body">
        <div><span className="t-comment">// SPDX-License-Identifier: MIT</span></div>
        <div><span className="t-keyword">pragma</span> <span className="t-type">solidity</span> ^0.8.19;</div>
        <div>&nbsp;</div>
        <div><span className="t-keyword">contract</span> <span className="t-type">SimpleEscrow</span> {"{"}</div>
        <div>&nbsp;&nbsp;<span className="t-type">struct</span> <span className="t-var">Deal</span> {"{"}</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-type">address</span> buyer;</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-type">address</span> seller;</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-type">uint256</span> amount;</div>
        <div>&nbsp;&nbsp;{"}"}</div>
        <div>&nbsp;</div>
        <div>&nbsp;&nbsp;<span className="t-keyword">event</span> <span className="t-method">DealCreated</span>(<span className="t-type">uint256</span> dealId);</div>
        <div>&nbsp;&nbsp;<span className="t-keyword">event</span> <span className="t-method">FundsReleased</span>(<span className="t-type">address</span> seller);</div>
        <div>&nbsp;</div>
        <div>&nbsp;&nbsp;<span className="t-keyword">function</span> <span className="t-method">createDeal</span>() <span className="t-var">external payable</span>;</div>
        <div>&nbsp;&nbsp;<span className="t-keyword">function</span> <span className="t-method">releasePayment</span>(<span className="t-type">uint256</span> id) <span className="t-var">external</span>;</div>
        <div>{"}"}</div>
        <div>&nbsp;</div>
        <div><span className="t-comment">// Contract ready for escrow settlement</span><span className="es-typing-cursor" /></div>
      </div>
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className="es-footer">
      <a className="es-logo" href="#">
        <LogoMark />
        <span>ESCROW</span>
        <strong>LY</strong>
      </a>
      <div className="es-footer-links">
        <a href="#features">Features</a>
        <a href="#contract">Contract</a>
        <a href="#cta">Launch</a>
      </div>
      <div>© 2026 Escrowly. All rights reserved.</div>
    </footer>
  );
}

function BuyerDashboard(props) {
  const {
    account,
    balance,
    busy,
    cancelRequested,
    chainId,
    contractAddress,
    copyAddress,
    createDeal,
    deal,
    dealId,
    description,
    funded,
    isBuyer,
    isSeller,
    loadDeal,
    amount,
    runDealAction,
    seller,
    setAmount,
    setDealId,
    setDescription,
    setSeller,
  } = props;

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-md border border-zinc-800 bg-zinc-950/80 p-5 shadow-redline">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Create Deal</h2>
              <p className="text-sm text-zinc-500">Buyer deposits funds into the escrow contract.</p>
            </div>
            <CircleDollarSign className="h-6 w-6 text-ember-500" />
          </div>

          <form className="grid gap-4" onSubmit={createDeal}>
            <Field label="Seller Address">
              <input
                className="h-11 rounded-md border border-zinc-800 bg-black px-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-ember-600"
                placeholder="0x..."
                value={seller}
                onChange={(event) => setSeller(event.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[0.5fr_1fr]">
              <Field label="Amount">
                <div className="flex h-11 overflow-hidden rounded-md border border-zinc-800 bg-black focus-within:border-ember-600">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                  <span className="grid place-items-center border-l border-zinc-800 px-3 text-xs font-bold text-zinc-500">
                    ETH
                  </span>
                </div>
              </Field>

              <Field label="Description">
                <input
                  className="h-11 rounded-md border border-zinc-800 bg-black px-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-ember-600"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                />
              </Field>
            </div>

            <PrimaryButton icon={ArrowRight} loading={busy === "create"} disabled={!account || !contractAddress}>
              Create Escrow
            </PrimaryButton>
          </form>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950/80 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Deal Desk</h2>
              <p className="text-sm text-zinc-500">Load a deal and settle it from the connected wallet.</p>
            </div>
            <BadgeCheck className="h-6 w-6 text-ember-500" />
          </div>

          <div className="flex gap-3">
            <input
              className="h-11 min-w-0 flex-1 rounded-md border border-zinc-800 bg-black px-3 text-sm outline-none transition focus:border-ember-600"
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
            />
            <SecondaryButton icon={RefreshCw} loading={busy === "load"} onClick={() => loadDeal()}>
              Load
            </SecondaryButton>
          </div>

          <DealDetail
            busy={busy}
            cancelRequested={cancelRequested}
            copyAddress={copyAddress}
            deal={deal}
            funded={funded}
            isBuyer={isBuyer}
            isSeller={isSeller}
            runDealAction={runDealAction}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Contract" value={contractAddress ? shortAddress(contractAddress) : "Missing"} />
        <Stat label="Network" value={chainId ? `Chain ${chainId}` : "Disconnected"} />
        <Stat label="Wallet" value={account ? `${balance} ETH` : "Locked"} />
      </section>
    </>
  );
}

function DealDetail({ busy, cancelRequested, copyAddress, deal, funded, isBuyer, isSeller, runDealAction }) {
  if (!deal) {
    return (
      <div className="mt-5 grid min-h-60 place-items-center rounded-md border border-dashed border-zinc-800 bg-black/50 text-sm text-zinc-500">
        No deal loaded
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className={`w-fit rounded-md border px-3 py-1 text-xs font-bold ${statusStyles[deal.status]}`}>
        {statusLabels[deal.status]}
      </div>

      <div className="grid gap-3 text-sm">
        <DealRow label="Buyer" value={deal.buyer} onCopy={() => copyAddress(deal.buyer)} />
        <DealRow label="Seller" value={deal.seller} onCopy={() => copyAddress(deal.seller)} />
        <DealRow label="Amount" value={`${ethers.formatEther(deal.amount)} ETH`} />
        <DealRow label="Created" value={formatDate(deal.createdAt)} />
        <DealRow label="Completed" value={formatDate(deal.completedAt)} />
      </div>

      <div className="rounded-md border border-zinc-800 bg-black p-3 text-sm text-zinc-300">
        {deal.description}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PrimaryButton
          icon={Check}
          loading={busy === "releasePayment"}
          disabled={!isBuyer || !funded}
          onClick={() => runDealAction("releasePayment", `Deal #${deal.id} released.`)}
        >
          Release
        </PrimaryButton>
        <SecondaryButton
          icon={Ban}
          loading={busy === "requestCancellation"}
          disabled={!isSeller || !funded}
          onClick={() => runDealAction("requestCancellation", `Cancellation requested for deal #${deal.id}.`)}
        >
          Cancel
        </SecondaryButton>
        <SecondaryButton
          icon={X}
          loading={busy === "approveRefund"}
          disabled={!isBuyer || !cancelRequested}
          onClick={() => runDealAction("approveRefund", `Deal #${deal.id} refunded.`)}
        >
          Refund
        </SecondaryButton>
      </div>
    </div>
  );
}

function AdminDashboard({ adminDeals, adminLoadedAt, adminStats, busy, contractAddress, loadAdminDeals, setDealId, setView }) {
  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-950/80 p-5 shadow-redline lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Monitor all contract deals, settlement status, parties, and total locked value.
          </p>
        </div>
        <SecondaryButton icon={RefreshCw} loading={busy === "admin"} disabled={!contractAddress} onClick={loadAdminDeals}>
          Refresh Deals
        </SecondaryButton>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="All Deals" value={adminStats.total.toString()} />
        <Stat label="Volume" value={`${adminStats.volume.toFixed(4)} ETH`} />
        <Stat label="Funded" value={adminStats.funded.toString()} />
        <Stat label="Released" value={adminStats.released.toString()} />
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80">
        <div className="flex flex-col gap-2 border-b border-zinc-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-ember-500" />
            <h3 className="font-semibold text-white">Deal Ledger</h3>
          </div>
          <p className="text-sm text-zinc-500">{adminLoadedAt ? `Updated ${adminLoadedAt}` : "Not loaded yet"}</p>
        </div>

        {adminDeals.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-black text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {adminDeals.map((row) => (
                  <tr key={row.id} className="transition hover:bg-black/45">
                    <td className="px-4 py-3 font-bold text-white">#{row.id}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusStyles[row.status]}`}>
                        {statusLabels[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-100">{ethers.formatEther(row.amount)} ETH</td>
                    <td className="px-4 py-3 text-zinc-400">{shortAddress(row.buyer)}</td>
                    <td className="px-4 py-3 text-zinc-400">{shortAddress(row.seller)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-zinc-300">{row.description}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-800 bg-black px-3 font-semibold text-zinc-100 transition hover:border-ember-700"
                        onClick={() => {
                          setDealId(row.id);
                          setView("buyer");
                        }}
                      >
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center gap-3 p-6 text-center">
            <Users className="h-9 w-9 text-zinc-700" />
            <p className="text-sm text-zinc-500">Refresh the ledger to load contract deals.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturePill({ icon: Icon, label }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-md border border-zinc-800 bg-black/70 px-3">
      <Icon className="h-5 w-5 text-ember-500" />
      <span className="text-sm font-semibold text-zinc-200">{label}</span>
    </div>
  );
}

function DealRow({ label, value, onCopy }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-900 bg-black px-3">
      <span className="text-zinc-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{value}</span>
        {onCopy ? (
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
            onClick={onCopy}
            title="Copy address"
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-zinc-900 bg-zinc-950/70 p-4">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-lg font-bold">{value}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
