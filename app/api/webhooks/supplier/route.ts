import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCascadingLedgerEntries } from "@/lib/ledger-utils";
import { OrderStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // raw bytes

    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const secret = process.env.SUPPLIER_WEBHOOK_SECRET || "mock_supplier_secret";
    const expected = crypto
      .createHmac("sha256", secret)
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
    console.log("Received supplier webhook event:", event.event);

    // Event contains order details. E.g. { event: "order.completed", data: { reference: "ref_123" } }
    const eventType = event.event;
    const orderRef = event.data?.reference || event.data?.orderRef;

    if (orderRef) {
      const order = await prisma.order.findUnique({
        where: { supplierOrderRef: orderRef },
      });

      if (order) {
        if (eventType === "order.completed") {
          // Update status to DELIVERED
          await prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.DELIVERED },
          });
          // Cascade ledgers
          await createCascadingLedgerEntries(order.id);
        } else if (eventType === "order.failed") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.FAILED },
          });
        } else if (eventType === "order.refunded") {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.REFUNDED },
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    console.error("Supplier webhook error:", err);
    return new Response("Internal Error", { status: 500 });
  }
}
