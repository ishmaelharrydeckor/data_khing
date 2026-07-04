import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { ShieldCheck, Layers, Palette, DollarSign } from "lucide-react";

export default function RootLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {SITE_CONFIG.SITE_NAME}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-slate-900 border border-slate-800 hover:border-slate-750 hover:bg-slate-850 px-5 py-2 text-sm font-semibold transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-semibold transition-all shadow-lg"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="relative overflow-hidden py-24 sm:py-32 flex flex-col items-center justify-center text-center px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl">
            <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400 mb-6 uppercase tracking-wider">
              {SITE_CONFIG.SITE_TAGLINE}
            </span>
            <h1 className="text-5xl font-extrabold sm:text-7xl tracking-tight text-white mb-6 leading-none">
              Start Your Own{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Data Reselling
              </span>{" "}
              Business
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Recruit sub-agents, configure custom retail prices, manage downlines, and distribute data bundles instantly. Powered by DataMart Store API, customized with your independent branding.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-8 py-4 font-bold text-white shadow-xl transition-all"
              >
                Launch Your Store Now
              </Link>
              <Link
                href="/shop/root"
                className="rounded-xl bg-slate-905 border border-slate-800 hover:border-slate-700 px-8 py-4 font-bold text-slate-300 hover:text-white transition-all"
              >
                View Root Storefront
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-900">
          <h2 className="text-3xl font-bold tracking-tight text-white text-center mb-12">
            Why Resellers Choose DataKhing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 transition-all hover:border-indigo-500/20">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Recursive Sub-Stores</h3>
              <p className="text-sm text-slate-400">
                Recruit sub-agents down to unlimited depth. Every agent gets their own custom store path.
              </p>
            </div>

            <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 transition-all hover:border-indigo-500/20">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Flexible Cascading Spreads</h3>
              <p className="text-sm text-slate-400">
                You configure your customer retail prices and agent wholesale costs. Keep 100% of the spreads.
              </p>
            </div>

            <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 transition-all hover:border-indigo-500/20">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 mb-4">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">White-Label Branding</h3>
              <p className="text-sm text-slate-400">
                Customize store name, primary color theme, logo, support contact, and footer text without leaks.
              </p>
            </div>

            <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 transition-all hover:border-indigo-500/20">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Secure Fulfillment</h3>
              <p className="text-sm text-slate-400">
                Fulfilled automatically using DataMart Store API, with secure Paystack payments.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 text-center text-xs text-slate-650">
        <div>© 2026 DataKhing Platform. All rights reserved.</div>
        <div className="mt-2 text-slate-700">Support: {SITE_CONFIG.SUPPORT_EMAIL}</div>
      </footer>
    </div>
  );
}
