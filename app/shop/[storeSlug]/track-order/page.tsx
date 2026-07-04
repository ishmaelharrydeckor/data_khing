import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrackOrderForm } from "@/components/track-order-form";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });
  if (!store) return { title: "Store Not Found" };
  return {
    title: `Track Order — ${store.displayName || store.name}`,
    description: `Track your MTN, Telecel, or AirtelTigo data delivery status at ${store.displayName || store.name}`,
  };
}

export default async function TrackOrderPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

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
            <Link href={`/shop/${store.slug}`} className="text-sm font-semibold hover:text-slate-350 transition-colors">
              Back to Shop
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col justify-start">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Track Your Order</h1>
          <p className="text-slate-450 mt-2 text-sm max-w-md mx-auto">
            Retrieve your live mobile data dispatch status using your phone number, order reference, or payment provider Transaction ID.
          </p>
        </div>

        <TrackOrderForm storeId={store.id} primaryColor={primaryColor} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        {store.footerText || `© 2026 ${store.displayName || store.name}. All rights reserved.`}
      </footer>
    </div>
  );
}
