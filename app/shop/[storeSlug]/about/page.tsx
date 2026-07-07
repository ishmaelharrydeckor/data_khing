import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { AboutTabs } from "@/components/about-tabs";

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });
  if (!store) return { title: "Store Not Found" };
  return {
    title: `About Us — ${store.displayName || store.name}`,
    description: `Learn more about our mobile data reseller platform, business values, delivery statistics, and policies.`,
  };
}

export default async function AboutPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store || store.status !== "ACTIVE") {
    notFound();
  }

  const primaryColor = store.primaryColor || "#4F46E5";

  // Calculate dynamic days in business
  const createdDate = new Date(store.createdAt);
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - createdDate.getTime();
  const daysActive = Math.max(1, Math.floor(timeDifference / (1000 * 60 * 60 * 24)));

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-10 w-auto object-contain rounded" />
            ) : (
              <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-[250px] md:max-w-none">
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">About Our Store</h1>
          <p className="text-slate-450 mt-2 text-sm max-w-md mx-auto">
            Discover our reseller background, view overall platform stats, or review delivery and refund policies.
          </p>
        </div>

        <AboutTabs
          store={{
            name: store.name,
            displayName: store.displayName,
            createdAt: store.createdAt.toISOString(),
            contactEmail: null,
            contactPhone: store.contactPhone,
            supportEmail: store.supportEmail,
          }}
          primaryColor={primaryColor}
          daysActive={daysActive}
          stats={SITE_CONFIG.TRUST_STATS}
          policies={SITE_CONFIG.PLATFORM_POLICIES}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        {store.footerText || `© 2026 ${store.displayName || store.name}. All rights reserved.`}
      </footer>
    </div>
  );
}
