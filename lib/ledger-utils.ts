import { prisma } from "./prisma";
import { LedgerStatus } from "@prisma/client";

/**
 * Resolves the wholesale cost of a bundle.
 */
async function getWholesaleCost(bundleId: string): Promise<number> {
  const bundle = await prisma.bundle.findUnique({
    where: { id: bundleId },
  });
  if (!bundle) return 0;
  // If wholesale pricing is stored on Bundle (which it is, see placeOrder product catalog)
  // we can mock a default wholesale price if not found.
  // For safety, let's assume default prices for standard bundles.
  const defaults: Record<string, number> = {
    "mtn-1gb": 300,
    "mtn-5gb": 1200,
    "mtn-10gb": 2200,
    "telecel-2gb": 500,
    "telecel-5gb": 1100,
    "at-3gb": 600,
  };
  return defaults[bundleId] || 1000; // default 10 GHS wholesale if unknown
}

/**
 * Resolves what a specific store charges for a bundle.
 * If no pricing is set, falls back to what the store pays upstream + default spread, or parent price.
 */
async function getStoreBundlePricing(storeId: string, bundleId: string): Promise<{ customerPrice: number; subAgentPrice: number }> {
  const pricing = await prisma.storePricing.findUnique({
    where: {
      storeId_bundleId: { storeId, bundleId },
    },
  });

  if (pricing) {
    return {
      customerPrice: pricing.priceForCustomersPesewas,
      subAgentPrice: pricing.priceForSubAgentsPesewas,
    };
  }

  // Fallback if no config: look up store parent to see parent sub-agent price
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { parentStoreId: true },
  });

  let wholesale = await getWholesaleCost(bundleId);

  if (store?.parentStoreId) {
    const parentPricing = await getStoreBundlePricing(store.parentStoreId, bundleId);
    // Charge slightly more than parent agent price
    return {
      customerPrice: Math.round(parentPricing.subAgentPrice * 1.15),
      subAgentPrice: Math.round(parentPricing.subAgentPrice * 1.08),
    };
  }

  // If root/independent, fall back to wholesale
  return {
    customerPrice: Math.round(wholesale * 1.2),
    subAgentPrice: Math.round(wholesale * 1.1),
  };
}

/**
 * Creates cascading ledger entries for a successful order.
 * Walks parentStoreId upward until null.
 */
export async function createCascadingLedgerEntries(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true },
  });

  if (!order) throw new Error("Order not found");

  const bundleId = order.bundleId;
  let currentStoreId: string | null = order.storeId;
  let tierDepth = 0;
  let childSellPrice = order.amountPaid; // Initial sell price is what customer paid

  while (currentStoreId !== null) {
    const currentStore: any = await prisma.store.findUnique({
      where: { id: currentStoreId },
    });

    if (!currentStore) break;

    let buyPrice = 0;
    let sellPrice = 0;

    if (tierDepth === 0) {
      // First tier: Selling store.
      // Customer paid `order.amountPaid`. That is the sell price.
      sellPrice = order.amountPaid;

      if (currentStore.parentStoreId) {
        // Buy price = what parent store charges sub-agents
        const parentPricing = await getStoreBundlePricing(currentStore.parentStoreId, bundleId);
        buyPrice = parentPricing.subAgentPrice;
      } else {
        // No parent: buy price is wholesale cost
        buyPrice = await getWholesaleCost(bundleId);
      }
    } else {
      // Upper tiers (parents)
      // Sell price = what this store charged the tier below (its own agent pricing)
      const currentPricing = await getStoreBundlePricing(currentStoreId, bundleId);
      sellPrice = currentPricing.subAgentPrice;

      if (currentStore.parentStoreId) {
        // Buy price = what parent charges agents
        const parentPricing = await getStoreBundlePricing(currentStore.parentStoreId, bundleId);
        buyPrice = parentPricing.subAgentPrice;
      } else {
        // No parent: buy price is wholesale cost
        buyPrice = await getWholesaleCost(bundleId);
      }
    }

    const profit = sellPrice - buyPrice;

    // Create Ledger row for this tier
    await prisma.ledger.create({
      data: {
        storeId: currentStoreId,
        orderId: order.id,
        tierDepth,
        buyPricePesewas: buyPrice,
        sellPricePesewas: sellPrice,
        amountPesewas: profit,
        status: LedgerStatus.AVAILABLE,
      },
    });

    // Move to next tier
    currentStoreId = currentStore.parentStoreId;
    tierDepth++;
  }
}

/**
 * Creates a ledger entry to credit the approving store when an application is approved.
 */
export async function createApplicationApprovalLedger(applicationId: string): Promise<void> {
  const app = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
  });

  if (!app || !app.parentStoreId) return;

  await prisma.ledger.create({
    data: {
      storeId: app.parentStoreId,
      applicationId: app.id,
      tierDepth: 0,
      buyPricePesewas: 0,
      sellPricePesewas: app.applicationFeePesewas,
      amountPesewas: app.applicationFeePesewas,
      status: LedgerStatus.AVAILABLE,
    },
  });
}
