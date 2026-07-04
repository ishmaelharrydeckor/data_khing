"use client";

import { useState } from "react";
import { trackOrderAction } from "@/app/actions/orders";
import { CheckCircle2, AlertCircle, Loader2, Search } from "lucide-react";

export function TrackOrderForm({ storeId, primaryColor }: { storeId: string; primaryColor: string }) {
  const [searchType, setSearchType] = useState<"phone" | "reference" | "txid">("phone");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrders(null);
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setError("Please enter a search query.");
      return;
    }

    // Validation
    if (searchType === "phone" && !/^\+?[0-9]{9,15}$/.test(cleanQuery)) {
      setError("Invalid phone number. Ensure it contains only digits (9-15 characters).");
      return;
    }
    if (searchType === "reference" && cleanQuery.length < 8) {
      setError("Order reference must be at least 8 characters.");
      return;
    }
    if (searchType === "txid" && cleanQuery.length < 5) {
      setError("Transaction reference must be at least 5 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await trackOrderAction(storeId, searchType, cleanQuery);
      if (res.success && res.orders) {
        setOrders(res.orders);
        if (res.orders.length === 0) {
          setError("No matching orders found.");
        }
      } else {
        setError(res.error || "An error occurred during query.");
      }
    } catch (err) {
      setError("Failed to communicate with the server.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold">DELIVERED</span>;
      case "PROCESSING":
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[11px] font-bold">PROCESSING</span>;
      case "PENDING":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold">PENDING</span>;
      case "FAILED":
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[11px] font-bold">FAILED</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[11px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 w-full max-w-xl mx-auto">
      {/* Search Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {(["phone", "reference", "txid"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setSearchType(type);
              setQuery("");
              setError(null);
              setOrders(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all capitalize ${
              searchType === type ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {type === "phone" ? "Phone" : type === "reference" ? "Reference" : "Trans. ID"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchType === "phone"
                ? "Enter Recipient Phone (e.g. 054XXXXXXX)"
                : searchType === "reference"
                ? "Enter Order ID / Reference Key"
                : "Enter Paystack Trans. ID / Ref"
            }
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-850 bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-sm min-h-[44px]"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50 min-h-[44px]"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Querying...
            </>
          ) : (
            "Track Order"
          )}
        </button>
      </form>

      {/* Results Display */}
      {orders && orders.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <h3 className="text-sm font-extrabold text-white">Matching Orders ({orders.length})</h3>
          
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-400">Recipient Phone:</div>
                    <div className="text-sm font-bold text-white mt-0.5">{o.phone}</div>
                  </div>
                  {getStatusBadge(o.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Data Bundle</span>
                    <span className="text-xs text-slate-350 font-bold">{o.bundleName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Amount Paid</span>
                    <span className="text-xs text-slate-350 font-bold">GH₵ {(o.amount / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-500 space-y-0.5">
                  <div><strong className="text-slate-400">Order ID:</strong> {o.id}</div>
                  <div><strong className="text-slate-400">Payment Ref:</strong> {o.paystackRef}</div>
                  <div><strong className="text-slate-400">Date:</strong> {new Date(o.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Guide Legend */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 space-y-4">
        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Order Status Legend</h4>
        <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">PENDING</span>
            <p className="text-slate-400 leading-normal">Order received, waiting to be processed</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">PROCESSING</span>
            <p className="text-slate-400 leading-normal">Data bundle is being dispatched to the carrier</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">DELIVERED</span>
            <p className="text-slate-400 leading-normal">Data delivered successfully. Check your handset balance</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">FAILED</span>
            <p className="text-slate-400 leading-normal">Something went wrong. Re-fund will credit automatically</p>
          </div>
        </div>
        
        <div className="border-t border-slate-900 pt-3 text-[11px] text-slate-500 leading-relaxed text-center">
          * Most bundles are delivered within 10 minutes. Network congestions may occasionally delay delivery up to 1 hour.
        </div>
      </div>
    </div>
  );
}
