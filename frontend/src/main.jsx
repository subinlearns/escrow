import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  CircleDollarSign,
  Copy,
  Loader2,
  RefreshCw,
  Shield,
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
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [balance, setBalance] = useState("");
  const [dealId, setDealId] = useState("1");
  const [deal, setDeal] = useState(null);
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

  return (
    <main className="min-h-screen bg-ink text-zinc-100">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_left,rgba(217,4,41,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:auto,28px_28px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-900 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-ember-700 bg-ember-600/15">
              <Shield className="h-6 w-6 text-ember-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-white">Redline Escrow</h1>
              <p className="text-sm text-zinc-400">Contract-held ETH settlement</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-md border border-zinc-850 bg-zinc-950/80 p-5 shadow-redline">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Create Deal</h2>
                <p className="text-sm text-zinc-500">Buyer deposits ETH into the escrow contract.</p>
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

          <div className="rounded-md border border-zinc-850 bg-zinc-950/80 p-5">
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

            {deal ? (
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
            ) : (
              <div className="mt-5 grid min-h-60 place-items-center rounded-md border border-dashed border-zinc-800 bg-black/50 text-sm text-zinc-500">
                No deal loaded
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Contract" value={contractAddress ? shortAddress(contractAddress) : "Missing"} />
          <Stat label="Network" value={chainId ? `Chain ${chainId}` : "Disconnected"} />
          <Stat label="Wallet" value={account ? "Ready" : "Locked"} />
        </section>

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
