import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { ResellerApplicationForm } from "@/components/reseller-application-form";
import { PiggyBank, Share2, Rocket, ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });
  if (!store) return { title: "Store Not Found" };
  return {
    title: `Become a Reseller — ${store.displayName || store.name}`,
    description: `Partner with ${store.displayName || store.name} and start your own branded data resell business today.`,
  };
}

export default async function BecomeAResellerPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const primaryColor = store.primaryColor || "#4F46E5";
  const appFee = 5000; // Platform static reseller application fee (GH₵50.00)
  const feeLabel = `GH₵ ${(appFee / 100).toFixed(2)}`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-10 w-auto object-contain rounded" />
            ) : (
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {store.displayName || store.name}
              </span>
            )}
          </div>
          <Link href={`/shop/${store.slug}`} className="text-sm font-semibold hover:text-slate-350 transition-colors">
            Back to Shop
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        {/* Banner Section */}
        <section className="relative overflow-hidden py-20 text-center px-4 border-b border-slate-900 bg-gradient-to-b from-slate-900/30 via-slate-950 to-slate-950">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 mb-4">
              Join {store.displayName || store.name}
            </span>
            <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl mb-6">
              Become a Data Reseller
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Launch your own mobile data shop. Purchase MTNs, Telecel, and AirtelTigo bundles at wholesale prices, customize your retail rates, and keep the profits.
            </p>

            {/* Dynamic Activation Fee Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-3 flex items-center gap-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Activation Fee:</span>
                <span className="text-lg font-bold text-white bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30">
                  {feeLabel}
                </span>
              </div>
              <a
                href="#apply"
                className="rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all shadow-lg flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extrabold text-white">Why Partner With Us?</h2>
            <p className="text-sm text-slate-500 mt-2">Start earning with a premium platform custom built for scale.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-md hover:border-slate-800 transition-all">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 text-indigo-400">
                <PiggyBank className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Earn Profits</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Buy internet data bundles at wholesale agent rates. Set your own markup retail prices, resell to clients, and keep 100% of the profit spreads.
              </p>
            </div>
            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-md hover:border-slate-800 transition-all">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 text-indigo-400">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Your Own Shop</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Get your own customized independent storefront link. Share it with your downlines and customers so they can purchase directly from you.
              </p>
            </div>
            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-md hover:border-slate-800 transition-all">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 text-indigo-400">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Fast Delivery</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Orders are dispatched instantly via automated API connections directly to MTN, Telecel, and AirtelTigo networks. Zero delay.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 border-t border-slate-900 bg-slate-900/10 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-white mb-12">How It Works</h2>
            
            <div className="grid gap-8 md:grid-cols-4 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700 mb-4">1</div>
                <h4 className="text-md font-bold text-white mb-2">Sign Up</h4>
                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Register an account and fill out our simple application form below.</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700 mb-4">2</div>
                <h4 className="text-md font-bold text-white mb-2">Fund Wallet</h4>
                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Fund your agent balance using mobile money to handle incoming orders.</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700 mb-4">3</div>
                <h4 className="text-md font-bold text-white mb-2">Share Link</h4>
                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Share your unique storefront link on WhatsApp, Facebook, or with agents.</p>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700 mb-4">4</div>
                <h4 className="text-md font-bold text-white mb-2">Earn Money</h4>
                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Every purchase automatically credits your margins directly into your wallet.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form Section */}
        <section id="apply" className="py-20 border-t border-slate-900 px-4 max-w-lg mx-auto scroll-mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white">Apply Now</h2>
            <p className="text-sm text-slate-500 mt-2">Enter your business details below to set up your store.</p>
          </div>

          {!session?.user ? (
            <div className="rounded-2xl border border-slate-850 bg-slate-900/30 p-8 text-center shadow-xl">
              <p className="text-slate-400 text-sm mb-6">
                Please sign in or register an account before submitting your reseller application.
              </p>
              <Link
                href="/login"
                className="inline-block rounded-full px-8 py-3 text-sm font-bold text-white transition-all shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                Sign In / Register
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 shadow-xl">
              <ResellerApplicationForm parentStoreId={store.id} primaryColor={primaryColor} />
            </div>
          )}

          <div className="text-center mt-8">
            <a
              href="#apply"
              className="inline-block text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Start Selling Now
            </a>
            {appFee > 0 && (
              <p className="text-[10px] text-slate-600 mt-1">
                * A one-time activation fee of GH₵ {(appFee / 100).toFixed(2)} will be charged during setup.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        {store.footerText || `© 2026 ${store.displayName || store.name}. All rights reserved.`}
      </footer>
    </div>
  );
}
