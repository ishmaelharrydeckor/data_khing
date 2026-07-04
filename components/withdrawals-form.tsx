"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestWithdrawalAction, processWithdrawalAction } from "@/app/actions/withdrawals";

export function WithdrawalsForm({
  storeId,
  availableBalanceGHS,
  isAdmin,
  pendingAdminWithdrawals,
}: {
  storeId: string;
  availableBalanceGHS: number;
  isAdmin: boolean;
  pendingAdminWithdrawals?: Array<{
    id: string;
    storeName: string;
    amountPesewas: number;
    payoutMethod: string;
    requestedAt: Date | string;
  }>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"MANUAL_MOMO" | "MANUAL_BANK">("MANUAL_MOMO");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (amountVal > availableBalanceGHS) {
      setError("Insufficient available balance.");
      return;
    }

    setLoading(true);

    try {
      const res = await requestWithdrawalAction({
        storeId,
        amountPesewas: Math.round(amountVal * 100),
        payoutMethod: method,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to submit request.");
      }

      setSuccess("Withdrawal request submitted successfully!");
      setAmount("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = (id: string, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this withdrawal?`)) return;
    startTransition(async () => {
      const res = await processWithdrawalAction(id, action);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to process withdrawal");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Payout request form */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-6 shadow-md">
        <h3 className="text-md font-bold text-white mb-4">Request Withdrawal</h3>
        {success && (
          <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 text-center font-semibold">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Amount (GHS)
            </label>
            <input
              type="number"
              step="0.01"
              required
              max={availableBalanceGHS}
              placeholder="e.g. 50.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Payout Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="MANUAL_MOMO">Mobile Money (MoMo)</option>
              <option value="MANUAL_BANK">Bank Transfer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full rounded-lg bg-indigo-650 hover:bg-indigo-600 p-3 font-semibold text-white transition-all disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Request Payout"}
          </button>
        </form>
      </div>

      {/* Admin approvals pane */}
      {isAdmin && pendingAdminWithdrawals && (
        <div className="lg:col-span-2 rounded-xl border border-indigo-950 bg-indigo-950/10 p-6 shadow-md space-y-4">
          <h3 className="text-md font-bold text-white uppercase tracking-wider text-indigo-400">
            Platform Pending Payout Requests
          </h3>
          {pendingAdminWithdrawals.length === 0 ? (
            <p className="text-sm text-slate-500">No platform withdrawals pending approval.</p>
          ) : (
            <div className="space-y-3">
              {pendingAdminWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="rounded-lg border border-slate-900 bg-slate-950 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-slate-200">{w.storeName}</div>
                    <div className="text-xs text-slate-500">
                      Method: {w.payoutMethod} | Date: {new Date(w.requestedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-bold text-white text-md">
                      GH₵{(w.amountPesewas / 100).toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminAction(w.id, "APPROVE")}
                        disabled={isPending}
                        className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-50"
                      >
                        Paid
                      </button>
                      <button
                        onClick={() => handleAdminAction(w.id, "REJECT")}
                        disabled={isPending}
                        className="rounded bg-red-650 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
