import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, OrderStatus } from "@prisma/client";
import { supplierClient } from "@/lib/supplier-client";
import { createCascadingLedgerEntries } from "@/lib/ledger-utils";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // raw bytes

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY || "mock_paystack_secret";
    const expected = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    const isValid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      console.log("Paystack payment successful. Reference:", reference);

      // 1. Check if it's a Reseller Application
      const application = await prisma.agentApplication.findUnique({
        where: { paymentRef: reference },
      });

      if (application) {
        if (application.status === ApplicationStatus.PENDING_PAYMENT) {
          await prisma.agentApplication.update({
            where: { id: application.id },
            data: { status: ApplicationStatus.PENDING_REVIEW },
          });
          console.log(`AgentApplication ${application.id} moved to PENDING_REVIEW`);
        }
        return new Response("OK", { status: 200 });
      }

      // 2. Check if it's a Customer Order
      const order = await prisma.order.findUnique({
        where: { paystackRef: reference },
        include: { bundle: true },
      });

      if (order && order.status === OrderStatus.PENDING) {
        // Move order to processing
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PROCESSING },
        });

        // Trigger fulfillment with DataMart Supplier API
        try {
          const supplierRes = await supplierClient.placeOrder({
            phoneNumber: order.recipientPhone,
            network: order.bundle.network,
            capacity: order.bundle.dataAmountGB,
            idempotencyKey: order.idempotencyKey,
          });

          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: supplierRes.status === "DELIVERED" ? OrderStatus.DELIVERED : OrderStatus.PROCESSING,
              supplierPurchaseId: supplierRes.supplierPurchaseId,
              supplierOrderRef: supplierRes.supplierOrderRef,
            },
          });

          if (supplierRes.status === "DELIVERED") {
            await createCascadingLedgerEntries(order.id);
          }
        } catch (supplierErr: any) {
          console.error("Supplier fulfillment error inside Paystack webhook:", supplierErr.message);
          // If insufficient balance, set order failed as per spec
          if (supplierErr.message === "INSUFFICIENT_BALANCE") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });
          }
          // Note: for other API/IP errors, polling or manual resolve handles it
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return new Response("Internal Error", { status: 500 });
  }
}
