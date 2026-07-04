import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { ResellerApplicationForm } from "@/components/reseller-application-form";

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
      <main className="flex-grow mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Become a Reseller</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Launch your own mobile data shop under our platform. Set your retail prices, recruit your own agents, and keep 100% of the spreads.
          </p>
          <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-300 inline-block font-semibold">
            One-time application fee: GH₵50.00
          </div>
        </div>

        {!session?.user ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 text-center shadow-lg">
            <p className="text-slate-400 text-sm mb-4">
              Please sign in or register an account before submitting your reseller application.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Sign In / Register
            </Link>
          </div>
        ) : (
          <ResellerApplicationForm parentStoreId={store.id} primaryColor={primaryColor} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        {store.footerText || `© 2026 ${store.displayName || store.name}. All rights reserved.`}
      </footer>
    </div>
  );
}
