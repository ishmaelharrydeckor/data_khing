import { prisma } from "@/lib/prisma";
import { paymentClient } from "@/lib/payment-client";
import { ApplicationStatus } from "@prisma/client";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function VerifyResellerPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { storeSlug } = await params;
  const { reference } = await searchParams;

  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
  });

  if (!store) return <div>Store not found.</div>;

  if (!reference) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Verification Error</h1>
        <p className="text-slate-400 mt-2">No payment reference provided.</p>
        <Link
          href={`/shop/${store.slug}/become-a-reseller`}
          className="mt-6 rounded-lg bg-indigo-650 px-6 py-3 font-semibold hover:bg-indigo-600 transition-all"
        >
          Back to Application
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
      // Update AgentApplication status to PENDING_REVIEW if not already updated by webhook
      const app = await prisma.agentApplication.findUnique({
        where: { paymentRef: reference },
      });

      if (app && app.status === ApplicationStatus.PENDING_PAYMENT) {
        await prisma.agentApplication.update({
          where: { id: app.id },
          data: { status: ApplicationStatus.PENDING_REVIEW },
        });
      }
      message = "Your application fee has been paid successfully! Your application is now pending review by the store admin.";
    } else {
      status = "failed";
      message = "Payment validation failed. Please check your transaction details and try again.";
    }
  } catch (err: any) {
    console.error("Reseller payment verification page error:", err);
    status = "failed";
    message = "An error occurred while verifying your application payment. Please contact support.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 text-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        {status === "success" ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white">Payment Received</h1>
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
          Return to Shop
        </Link>
      </div>
    </div>
  );
}
