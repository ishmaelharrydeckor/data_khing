import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StorefrontForm } from "@/components/storefront-form";
import Link from "next/link";
import Image from "next/image";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });
  if (!store) return { title: "Store Not Found" };
  return {
    title: `${store.displayName || store.name} — Buy Cheap Mobile Data`,
    description: `Buy MTN, Telecel, and AirtelTigo data bundles instantly at ${store.displayName || store.name}`,
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

  // Get active bundles
  const bundles = await prisma.bundle.findMany({
    where: { active: true },
  });

  // Get customized prices for the owner of this store
  const userPricings = await prisma.userPricing.findMany({
    where: { userId: store.ownerUserId },
  });

  // Map bundles to store prices
  const mappedBundles = bundles.map((b) => {
    const up = userPricings.find((p) => p.bundleId === b.id);
    // Fallback default pricing if not explicitly set
    const price = up ? up.priceForCustomersPesewas : Math.round(b.dataAmountGB * 150 + 500);
    return {
      id: b.id,
      label: b.label,
      network: b.network,
      dataAmountGB: b.dataAmountGB,
      pricePesewas: price,
    };
  });

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

          <div className="flex items-center gap-4">
            <Link
              href={`/shop/${store.slug}/become-a-reseller`}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-all shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              Become a Reseller
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="text-center mb-10 max-w-xl">
          <h1 className="text-4xl font-extrabold sm:text-5xl tracking-tight text-white mb-4">
            High-Speed Data Bundles
          </h1>
          <p className="text-lg text-slate-400">
            Top up MTN, Telecel, and AirtelTigo instantly. Select network, bundle, and pay securely using Mobile Money.
          </p>
        </div>

        <StorefrontForm storeId={store.id} bundles={mappedBundles} primaryColor={primaryColor} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">About Us</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {store.footerText || `Premium mobile data top-up services powered by ${store.displayName || store.name}.`}
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Support Contact</h3>
            <p className="text-sm text-slate-500">Email: {store.supportEmail || "support@reseller.com"}</p>
            {store.contactPhone && <p className="text-sm text-slate-500 mt-1">Phone: {store.contactPhone}</p>}
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Sell With Us</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href={`/shop/${store.slug}/become-a-reseller`} className="hover:text-white transition-colors">
                Become a Reseller
              </Link>
              <Link href={`/shop/${store.slug}/track-order`} className="hover:text-white transition-colors">
                Track Order
              </Link>
              <Link href={`/shop/${store.slug}/about`} className="hover:text-white transition-colors">
                About Us
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Reseller Login
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 text-center text-xs text-slate-600">
          {store.footerText || `© 2026 ${store.displayName || store.name}. All rights reserved.`}
        </div>
      </footer>
    </div>
  );
}
