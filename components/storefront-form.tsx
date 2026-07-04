"use client";

import { useState } from "react";
import { createOrderAction } from "@/app/actions/orders";

interface BundleProps {
  id: string;
  label: string;
  network: string;
  dataAmountGB: number;
  pricePesewas: number;
}

export function StorefrontForm({
  storeId,
  bundles,
  primaryColor,
}: {
  storeId: string;
  bundles: BundleProps[];
  primaryColor: string;
}) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("YELLO");
  const [selectedBundleId, setSelectedBundleId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const networks = [
    { code: "YELLO", name: "MTN" },
    { code: "TELECEL", name: "Telecel" },
    { code: "AT_PREMIUM", name: "AirtelTigo" },
  ];

  const filteredBundles = bundles.filter((b) => b.network === selectedNetwork);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedBundleId) {
      setError("Please select a bundle.");
      return;
    }

    if (!phone || phone.length < 9) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await createOrderAction({
        storeId,
        bundleId: selectedBundleId,
        recipientPhone: phone,
        email: email || "customer@store.com",
      });

      if (!res.success || !res.authorizationUrl) {
        throw new Error(res.error || "Failed to initialize payment");
      }

      // Redirect to Paystack payment checkout page
      window.location.href = res.authorizationUrl;
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Network Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            1. Select Network
          </label>
          <div className="grid grid-cols-3 gap-3">
            {networks.map((net) => {
              const active = selectedNetwork === net.code;
              return (
                <button
                  key={net.code}
                  type="button"
                  onClick={() => {
                    setSelectedNetwork(net.code);
                    setSelectedBundleId("");
                  }}
                  className={`p-3 rounded-lg border text-center font-semibold transition-all text-sm ${
                    active
                      ? "bg-slate-800 border-indigo-500 text-indigo-400"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                  style={active ? { borderColor: primaryColor, color: primaryColor } : {}}
                >
                  {net.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bundle Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            2. Choose Bundle
          </label>
          {filteredBundles.length === 0 ? (
            <p className="text-slate-500 text-sm">No bundles available for this network.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredBundles.map((bundle) => {
                const active = selectedBundleId === bundle.id;
                return (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => setSelectedBundleId(bundle.id)}
                    className={`w-full p-4 rounded-lg border text-left flex justify-between items-center transition-all ${
                      active
                        ? "bg-slate-850 border-indigo-500/50 text-white"
                        : "border-slate-800 bg-slate-950 text-slate-355 hover:border-slate-750"
                    }`}
                    style={active ? { borderColor: primaryColor } : {}}
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{bundle.label}</div>
                      <div className="text-xs text-slate-500">{bundle.dataAmountGB} GB</div>
                    </div>
                    <div className="font-bold text-slate-200" style={active ? { color: primaryColor } : {}}>
                      GH₵{(bundle.pricePesewas / 100).toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User details */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              3. Recipient Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0241234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              4. Email Address (for receipt)
            </label>
            <input
              type="email"
              required
              placeholder="customer@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedBundleId}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 p-4 text-center font-bold text-white shadow-lg transition-all focus:outline-none disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? "Processing Payment..." : "Purchase Data Bundle"}
        </button>
      </form>
    </div>
  );
}
