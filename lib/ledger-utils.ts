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
  
  const defaults: Record<string, number> = {
    "mtn-1gb": 300,
    "mtn-5gb": 1200,
    "mtn-10gb": 2200,
    "telecel-2gb": 500,
    "telecel-5gb": 1100,
    "at-3gb": 600,
  };
  return defaults[bundleId] || 1000;
}

/**
 * Resolves what a specific user charges for a bundle.
 * If no pricing is set, falls back to what the user pays upstream + default spread, or parent price.
 */
export async function getUserBundlePricing(userId: string, bundleId: string): Promise<{ customerPrice: number; subAgentPrice: number }> {
  const pricing = await prisma.userPricing.findUnique({
    where: {
      userId_bundleId: { userId, bundleId },
    },
  });

  if (pricing) {
    return {
      customerPrice: pricing.priceForCustomersPesewas,
      subAgentPrice: pricing.priceForSubAgentsPesewas,
    };
  }

  // Fallback if no config: look up user parent to see parent sub-agent price
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { parentUserId: true },
  });

  let wholesale = await getWholesaleCost(bundleId);

  if (user?.parentUserId) {
    const parentPricing = await getUserBundlePricing(user.parentUserId, bundleId);
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
 * Walks parentUserId upward until null.
 */
export async function createCascadingLedgerEntries(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Order not found");

  const bundleId = order.bundleId;
  let currentUserId: string | null = order.sellingUserId;
  let tierDepth = 0;

  while (currentUserId !== null) {
    const currentUser: any = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) break;

    let buyPrice = 0;
    let sellPrice = 0;

    if (tierDepth === 0) {
      // First tier: Selling reseller user.
      sellPrice = order.amountPaid;

      if (currentUser.parentUserId) {
        // Buy price = what parent charges sub-agents
        const parentPricing = await getUserBundlePricing(currentUser.parentUserId, bundleId);
        buyPrice = parentPricing.subAgentPrice;
      } else {
        // No parent: buy price is wholesale cost
        buyPrice = await getWholesaleCost(bundleId);
      }
    } else {
      // Upper tiers (parents)
      const currentPricing = await getUserBundlePricing(currentUserId, bundleId);
      sellPrice = currentPricing.subAgentPrice;

      if (currentUser.parentUserId) {
        const parentPricing = await getUserBundlePricing(currentUser.parentUserId, bundleId);
        buyPrice = parentPricing.subAgentPrice;
      } else {
        buyPrice = await getWholesaleCost(bundleId);
      }
    }

    const profit = sellPrice - buyPrice;

    // Create Ledger row for this user
    await prisma.ledger.create({
      data: {
        userId: currentUserId,
        orderId: order.id,
        tierDepth,
        buyPricePesewas: buyPrice,
        sellPricePesewas: sellPrice,
        amountPesewas: profit,
        status: LedgerStatus.AVAILABLE,
      },
    });

    // Move to next tier
    currentUserId = currentUser.parentUserId;
    tierDepth++;
  }
}

/**
 * Creates a ledger entry to credit the approving user when an application is approved.
 */
export async function createApplicationApprovalLedger(applicationId: string): Promise<void> {
  const app = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
  });

  if (!app || !app.parentUserId) return;

  await prisma.ledger.create({
    data: {
      userId: app.parentUserId,
      applicationId: app.id,
      tierDepth: 0,
      buyPricePesewas: 0,
      sellPricePesewas: app.applicationFeePesewas,
      amountPesewas: app.applicationFeePesewas,
      status: LedgerStatus.AVAILABLE,
    },
  });
}
