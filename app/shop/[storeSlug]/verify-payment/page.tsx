import { prisma } from "@/lib/prisma";
import { paymentClient } from "@/lib/payment-client";
import { OrderStatus } from "@prisma/client";
import { supplierClient } from "@/lib/supplier-client";
import { createCascadingLedgerEntries } from "@/lib/ledger-utils";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default async function VerifyPaymentPage({
  params,
  searchParams,
}: {
  params: { storeSlug: string };
  searchParams: { reference?: string };
}) {
  const store = await prisma.store.findUnique({
    where: { slug: params.storeSlug },
  });

  if (!store) return <div>Store not found.</div>;

  const reference = searchParams.reference;

  if (!reference) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Verification Error</h1>
        <p className="text-slate-400 mt-2">No payment reference provided.</p>
        <Link
          href={`/shop/${store.slug}`}
          className="mt-6 rounded-lg bg-indigo-650 px-6 py-3 font-semibold hover:bg-indigo-600 transition-all"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  let status: "success" | "failed" = "failed";
  let message = "";

  try {
    const paystackRes = await paymentClient.verifyPayment(reference);

    if (paystackRes.status === "success") {
      status = "success";
      // Update order status if not already processed by webhook
      const order = await prisma.order.findUnique({
        where: { paystackRef: reference },
        include: { bundle: true },
      });

      if (order && order.status === OrderStatus.PENDING) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PROCESSING },
        });

        // Trigger supplier fulfillment
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
          console.error("Fulfillment error during sync verification:", supplierErr);
          if (supplierErr.message === "INSUFFICIENT_BALANCE") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });
          }
        }
      }
      message = "Your payment was processed successfully! The data bundle is being sent to your phone.";
    } else {
      status = "failed";
      message = "Payment authorization failed or was canceled. Please try again.";
    }
  } catch (err: any) {
    console.error("Verification page failed:", err);
    status = "failed";
    message = "An error occurred while verifying your payment. Please contact support.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        {status === "success" ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white">Payment Successful</h1>
            <p className="text-slate-400 mt-4 leading-relaxed">{message}</p>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white">Payment Failed</h1>
            <p className="text-slate-400 mt-4 leading-relaxed">{message}</p>
          </>
        )}

        <Link
          href={`/shop/${store.slug}`}
          className="mt-8 block w-full rounded-lg py-3 text-center font-bold text-white transition-all shadow-lg"
          style={{ backgroundColor: store.primaryColor || "#4F46E5" }}
        >
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
