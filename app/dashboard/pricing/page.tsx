import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { PricingEditorForm } from "@/components/pricing-editor-form";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // Get all active bundles
  const bundles = await prisma.bundle.findMany({
    where: { active: true },
  });

  // Get active user pricings
  const userPricings = await prisma.userPricing.findMany({
    where: { userId: userId },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Fetch live supplier products to show actual wholesale base prices
  const { supplierClient } = await import("@/lib/supplier-client");
  let supplierProducts: any[] = [];
  try {
    supplierProducts = await supplierClient.getProducts();
  } catch (err) {
    console.error("Failed to load live supplier products for pricing editor:", err);
  }

  // Get parent pricings or wholesale defaults to compute wholesale floor (what this user pays)
  const mappedBundles = await Promise.all(
    bundles.map(async (b) => {
      // Find what this user pays
      let costPrice = 0;
      const defaults: Record<string, number> = {
        "mtn-1gb": 300,
        "mtn-5gb": 1200,
        "mtn-10gb": 2200,
        "telecel-2gb": 500,
        "telecel-5gb": 1100,
        "at-3gb": 600,
      };
      
      const supplierProd = supplierProducts.find(sp => sp.id === b.id);
      const wholesale = supplierProd ? supplierProd.wholesalePricePesewas : (defaults[b.id] || 1000);

      if (dbUser?.parentUserId) {
        // Parent sub-agent pricing
        const parentPricing = await prisma.userPricing.findUnique({
          where: {
            userId_bundleId: { userId: dbUser.parentUserId, bundleId: b.id },
          },
        });
        costPrice = parentPricing ? parentPricing.priceForSubAgentsPesewas : Math.round(wholesale * 1.1);
      } else {
        costPrice = wholesale; // Root / Independent pays raw wholesale
      }

      // Existing user pricing configs
      const up = userPricings.find((p) => p.bundleId === b.id);
      const customer = up ? up.priceForCustomersPesewas : Math.round(costPrice * 1.2);
      const subAgent = up ? up.priceForSubAgentsPesewas : Math.round(costPrice * 1.1);

      return {
        id: b.id,
        label: b.label,
        network: b.network,
        minPricePesewas: costPrice,
        customerPricePesewas: customer,
        subAgentPricePesewas: subAgent,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Pricing Editor</h1>
        <p className="text-sm text-slate-400">
          Configure customer retail pricing and wholesale prices for your reseller agent downlines.
        </p>
      </div>

      {/* Standard Instruction Card */}
      <div className="rounded-xl border border-indigo-950 bg-indigo-950/20 p-6 leading-relaxed">
        <h3 className="text-md font-bold text-white mb-3">You have TWO prices:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
          <li>
            <span className="font-semibold text-slate-200">Customer Price</span> - What normal customers pay at your store
          </li>
          <li>
            <span className="font-semibold text-slate-200">Agent Price</span> - Special lower price for agents under you (their cost price)
          </li>
        </ul>
        <p className="text-sm text-slate-400 mb-4">
          Agents buy from you at the agent price, then sell to their customers at their own price.
        </p>
        <div className="border-t border-slate-900 pt-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tips:</h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
            <li>Agent Price must be lower than Customer Price</li>
            <li>Agent Price cannot be lower than platform cost</li>
            <li>When you save, the price is automatically sent to all agents under you</li>
          </ul>
        </div>
      </div>

      <PricingEditorForm storeId={activeStore.id} bundles={mappedBundles} />
    </div>
  );
}
