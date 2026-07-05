"use server";

import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import crypto from "crypto";
import { paymentClient } from "@/lib/payment-client";

export async function createOrderAction(formData: {
  storeId: string;
  bundleId: string;
  recipientPhone: string;
  email: string;
}) {
  try {
    const { storeId, bundleId, recipientPhone, email } = formData;

    if (!recipientPhone || recipientPhone.length < 9) {
      return { success: false, error: "Please enter a valid phone number." };
    }

    // 1. Fetch store and pricing details
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      return { success: false, error: "Store not found." };
    }

    const bundle = await prisma.bundle.findUnique({
      where: { id: bundleId },
    });
    if (!bundle) {
      return { success: false, error: "Bundle not found." };
    }

    // Resolve customer price for the owner of the store
    const { getUserBundlePricing } = await import("@/lib/ledger-utils");
    const pricing = await getUserBundlePricing(store.ownerUserId, bundleId);
    let amountPaid = pricing.customerPrice;

    // 2. Generate references
    const idempotencyKey = crypto.randomUUID();
    const orderId = crypto.randomUUID();

    // 3. Initialize Paystack payment
    // We pass a callback URL which will redirect back to store page
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const callbackUrl = `${baseUrl}/shop/${store.slug}/verify-payment`;

    const paystackRes = await paymentClient.initializePayment(
      email || "guest@datakhing.com",
      amountPaid,
      callbackUrl
    );

    // Look up if user session exists to link customerUserId
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    const buyerUser = session?.user?.email 
      ? await prisma.user.findUnique({ where: { email: session.user.email } }) 
      : null;

    // 4. Create PENDING Order
    await prisma.order.create({
      data: {
        id: orderId,
        storeId,
        sellingUserId: store.ownerUserId,
        customerUserId: buyerUser?.id || null,
        bundleId,
        recipientPhone,
        status: OrderStatus.PENDING,
        idempotencyKey,
        paystackRef: paystackRes.reference,
        amountPaid,
      },
    });

    return {
      success: true,
      authorizationUrl: paystackRes.authorizationUrl,
      reference: paystackRes.reference,
    };
  } catch (err: any) {
    console.error("Failed to create order action:", err);
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function trackOrderAction(
  storeId: string,
  searchType: "phone" | "reference" | "txid",
  query: string
) {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return { success: false, error: "Query cannot be empty." };

    let orders: any[] = [];

    if (searchType === "phone") {
      if (!/^\+?[0-9]{9,15}$/.test(cleanQuery)) {
        return { success: false, error: "Invalid phone number format." };
      }
      orders = await prisma.order.findMany({
        where: { storeId, recipientPhone: cleanQuery },
        include: { bundle: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    } else if (searchType === "reference") {
      if (cleanQuery.length < 8) {
        return { success: false, error: "Invalid reference key length." };
      }
      orders = await prisma.order.findMany({
        where: {
          storeId,
          OR: [
            { id: cleanQuery },
            { id: { startsWith: cleanQuery } }
          ]
        },
        include: { bundle: true },
        orderBy: { createdAt: "desc" },
      });
    } else if (searchType === "txid") {
      if (cleanQuery.length < 5) {
        return { success: false, error: "Invalid Transaction ID length." };
      }
      orders = await prisma.order.findMany({
        where: {
          storeId,
          OR: [
            { paystackRef: cleanQuery },
            { supplierOrderRef: cleanQuery }
          ]
        },
        include: { bundle: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return {
      success: true,
      orders: orders.map(o => ({
        id: o.id,
        phone: o.recipientPhone,
        bundleName: o.bundle.label,
        network: o.bundle.network,
        amount: o.amountPaid,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        paystackRef: o.paystackRef || "N/A",
      }))
    };
  } catch (err: any) {
    console.error("Order tracking failure:", err);
    return { success: false, error: "Failed to query orders." };
  }
}

