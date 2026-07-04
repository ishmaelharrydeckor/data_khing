"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePricingAction } from "@/app/actions/pricing";

interface BundleProps {
  id: string;
  label: string;
  network: string;
  minPricePesewas: number; // Floor price (what this store pays upstream)
  customerPricePesewas: number;
  subAgentPricePesewas: number;
}

export function PricingEditorForm({
  storeId,
  bundles,
}: {
  storeId: string;
  bundles: BundleProps[];
}) {
  const [pricings, setPricings] = useState<BundleProps[]>(bundles);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handlePriceChange = (id: string, field: "customer" | "subAgent", val: string) => {
    const pesewas = Math.round(parseFloat(val || "0") * 100);
    setPricings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          customerPricePesewas: field === "customer" ? pesewas : b.customerPricePesewas,
          subAgentPricePesewas: field === "subAgent" ? pesewas : b.subAgentPricePesewas,
        };
      })
    );
  };

  const handleSave = async (bundle: BundleProps) => {
    setSuccess("");
    setError("");
    setLoadingId(bundle.id);

    try {
      const res = await savePricingAction({
        storeId,
        bundleId: bundle.id,
        priceForCustomersPesewas: bundle.customerPricePesewas,
        priceForSubAgentsPesewas: bundle.subAgentPricePesewas,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to update pricing.");
      }

      setSuccess(`Pricing for ${bundle.label} saved successfully.`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 text-center font-semibold">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {pricings.map((bundle) => {
          const loading = loadingId === bundle.id;
          return (
            <div
              key={bundle.id}
              className="rounded-xl border border-slate-900 bg-slate-900/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h4 className="font-bold text-slate-100">{bundle.label}</h4>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{bundle.network}</p>
                <div className="text-[11px] text-indigo-400 font-semibold mt-2">
                  Your Wholesale Cost: GH₵{(bundle.minPricePesewas / 100).toFixed(2)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Customer Price Input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Customer Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={(bundle.minPricePesewas / 100).toFixed(2)}
                    value={(bundle.customerPricePesewas / 100).toFixed(2)}
                    onChange={(e) => handlePriceChange(bundle.id, "customer", e.target.value)}
                    className="w-28 rounded border border-slate-800 bg-slate-950 p-2 text-sm text-slate-100 focus:outline-none"
                  />
                </div>

                {/* Agent Price Input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Agent Price (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={(bundle.minPricePesewas / 100).toFixed(2)}
                    value={(bundle.subAgentPricePesewas / 100).toFixed(2)}
                    onChange={(e) => handlePriceChange(bundle.id, "subAgent", e.target.value)}
                    className="w-28 rounded border border-slate-800 bg-slate-950 p-2 text-sm text-slate-100 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleSave(bundle)}
                  disabled={loading}
                  className="rounded bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-all self-end disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
