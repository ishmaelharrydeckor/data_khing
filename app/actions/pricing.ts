"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string };
}

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

export async function savePricingAction(formData: {
  storeId: string;
  bundleId: string;
  priceForCustomersPesewas: number;
  priceForSubAgentsPesewas: number;
}) {
  try {
    const user = await getRequiredSession();
    const { storeId, bundleId, priceForCustomersPesewas, priceForSubAgentsPesewas } = formData;

    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.ownerUserId !== user.id) {
      return { success: false, error: "Unauthorized access to this store." };
    }

    // Floor price validation: must be >= what this store itself pays
    let minAllowedPrice = 0;
    if (store.parentStoreId) {
      // Find parent store's sub-agent price
      const parentPricing = await prisma.storePricing.findUnique({
        where: {
          storeId_bundleId: { storeId: store.parentStoreId, bundleId },
        },
      });
      if (parentPricing) {
        minAllowedPrice = parentPricing.priceForSubAgentsPesewas;
      } else {
        // Parent sub-agent default
        const parentWholesale = await getWholesaleCost(bundleId);
        minAllowedPrice = Math.round(parentWholesale * 1.1);
      }
    } else {
      // Root or independent: wholesale is floor
      minAllowedPrice = await getWholesaleCost(bundleId);
    }

    if (priceForCustomersPesewas < minAllowedPrice) {
      return {
        success: false,
        error: `Customer price cannot be lower than your cost price (GH₵${(minAllowedPrice / 100).toFixed(2)}).`,
      };
    }

    if (priceForSubAgentsPesewas < minAllowedPrice) {
      return {
        success: false,
        error: `Sub-agent price cannot be lower than your cost price (GH₵${(minAllowedPrice / 100).toFixed(2)}).`,
      };
    }

    if (priceForSubAgentsPesewas >= priceForCustomersPesewas) {
      return {
        success: false,
        error: "Sub-agent price must be lower than your customer retail price.",
      };
    }

    // Save
    await prisma.storePricing.upsert({
      where: {
        storeId_bundleId: { storeId, bundleId },
      },
      update: {
        priceForCustomersPesewas,
        priceForSubAgentsPesewas,
      },
      create: {
        storeId,
        bundleId,
        priceForCustomersPesewas,
        priceForSubAgentsPesewas,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Save pricing error:", err);
    return { success: false, error: err.message || "Failed to save pricing." };
  }
}
