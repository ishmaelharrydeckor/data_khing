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

    // Resolve customer price for this store
    const pricing = await prisma.storePricing.findUnique({
      where: {
        storeId_bundleId: { storeId, bundleId },
      },
    });

    // Fallback if no custom pricing is set
    let amountPaid = pricing ? pricing.priceForCustomersPesewas : Math.round(bundle.dataAmountGB * 150 + 500); // GHS 15/GB + 5 GHS default

    // 2. Generate references
    const idempotencyKey = crypto.randomUUID();
    const orderId = crypto.randomUUID();

    // 3. Initialize Paystack payment
    // We pass a callback URL which will redirect back to store page
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/shop/${store.slug}/verify-payment`;

    const paystackRes = await paymentClient.initializePayment(
      email || "guest@datakhing.com",
      amountPaid,
      callbackUrl
    );

    // 4. Create PENDING Order
    await prisma.order.create({
      data: {
        id: orderId,
        storeId,
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
