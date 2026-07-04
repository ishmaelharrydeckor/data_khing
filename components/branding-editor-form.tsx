"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBrandingAction } from "@/app/actions/branding";

interface BrandingProps {
  storeId: string;
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  contactPhone: string;
  footerText: string;
}

export function BrandingEditorForm({ branding }: { branding: BrandingProps }) {
  const [displayName, setDisplayName] = useState(branding.displayName || "");
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || "#4F46E5");
  const [supportEmail, setSupportEmail] = useState(branding.supportEmail || "");
  const [contactPhone, setContactPhone] = useState(branding.contactPhone || "");
  const [footerText, setFooterText] = useState(branding.footerText || "");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);

    try {
      const res = await saveBrandingAction({
        storeId: branding.storeId,
        displayName,
        logoUrl,
        primaryColor,
        supportEmail,
        contactPhone,
        footerText,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to update branding details");
      }

      setSuccess("Branding details updated successfully! Visit your storefront to verify.");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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

      <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-6 space-y-4">
        <h3 className="text-md font-bold text-white">Storefront Customizations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Display Name
            </label>
            <input
              type="text"
              placeholder="Joy Data Hub"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Primary Brand Color (Hex)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-11 w-11 rounded border border-slate-800 bg-slate-950 cursor-pointer"
              />
              <input
                type="text"
                placeholder="#4F46E5"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Logo URL
          </label>
          <input
            type="text"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Support Email
            </label>
            <input
              type="email"
              placeholder="support@joydata.com"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              placeholder="0241234567"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Footer Copyright Text
          </label>
          <input
            type="text"
            placeholder="© 2026 Joy Data Hub. All rights reserved."
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-105 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-650 hover:bg-indigo-600 p-3.5 font-bold text-white transition-all disabled:opacity-50"
        >
          {loading ? "Saving Changes..." : "Save Branding"}
        </button>
      </div>
    </form>
  );
}
