"use client";

import { useState } from "react";
import { submitResellerApplicationAction } from "@/app/actions/reseller";

export function ResellerApplicationForm({
  parentStoreId,
  primaryColor,
}: {
  parentStoreId: string;
  primaryColor: string;
}) {
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!storeName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await submitResellerApplicationAction({
        storeName: storeName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        parentStoreId,
      });

      if (!res.success || !res.authorizationUrl) {
        throw new Error(res.error || "Failed to initialize application payment");
      }

      // Redirect to Paystack to complete application fee payment
      window.location.href = res.authorizationUrl;
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-450 uppercase tracking-wider block mb-1">
            Desired Store / Brand Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Joy Data Hub"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            This name will be displayed as the main brand title on your custom storefront.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider block mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="e.g. agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider block mb-1">
            Phone Number
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 0551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-455 uppercase tracking-wider block mb-1">
            Choose Password
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg p-3 text-center font-bold text-white shadow-lg transition-all focus:outline-none disabled:opacity-50 mt-2 cursor-pointer hover:opacity-90 min-h-[44px]"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? "Processing Fee..." : "Submit & Pay Fee (GH₵50)"}
        </button>
      </form>
    </div>
  );
}
