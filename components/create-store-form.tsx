"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createIndependentStoreAction } from "@/app/actions/multi-store";

export function CreateStoreForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await createIndependentStoreAction({ name, slug });
      if (!res.success) {
        throw new Error(res.error || "Failed to create store");
      }

      setName("");
      setSlug("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-6 shadow-md">
      <h3 className="text-md font-bold text-white mb-4">Create Independent Store</h3>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Store Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Speed Data Hub"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Store Slug (unique path identifier)
          </label>
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 overflow-hidden focus-within:border-indigo-500">
            <span className="flex items-center px-3 text-sm text-slate-500 bg-slate-900 border-r border-slate-800">
              /shop/
            </span>
            <input
              type="text"
              required
              placeholder="speed-data"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full bg-transparent p-3 text-slate-100 placeholder-slate-650 focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Spaces and symbols are automatically converted. Only letters, numbers, and dashes allowed.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name || !slug}
          className="w-full rounded-lg bg-indigo-650 hover:bg-indigo-600 p-3 font-semibold text-white transition-all disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Store"}
        </button>
      </form>
    </div>
  );
}
