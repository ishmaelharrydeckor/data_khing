"use server";

import { prisma } from "@/lib/prisma";
import { ApplicationStatus, StoreStatus, StoreType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { paymentClient } from "@/lib/payment-client";
import { createApplicationApprovalLedger } from "@/lib/ledger-utils";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("You must be logged in to apply.");
  }
  return session.user as { id: string; email: string };
}

export async function submitResellerApplicationAction(formData: {
  storeName: string;
  parentStoreId: string;
}) {
  try {
    const user = await getRequiredSession();
    const { storeName, parentStoreId } = formData;

    if (!storeName || !parentStoreId) {
      return { success: false, error: "Store Name is required." };
    }

    const parentStore = await prisma.store.findUnique({
      where: { id: parentStoreId },
    });

    if (!parentStore) {
      return { success: false, error: "Parent store not found." };
    }

    const applicationFee = 5000; // GH₵50 application fee

    // Generate Paystack checkout reference
    const paymentRef = "app_pay_" + crypto.randomBytes(8).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/shop/${parentStore.slug}/become-a-reseller/verify-payment`;

    const paystackRes = await paymentClient.initializePayment(
      user.email,
      applicationFee,
      callbackUrl
    );

    const app = await prisma.agentApplication.create({
      data: {
        applicantUserId: user.id,
        parentStoreId,
        storeName,
        applicationFeePesewas: applicationFee,
        paymentRef: paystackRes.reference, // Use the real Paystack transaction reference
        status: ApplicationStatus.PENDING_PAYMENT,
      },
    });

    return {
      success: true,
      authorizationUrl: paystackRes.authorizationUrl,
      reference: paystackRes.reference,
    };
  } catch (err: any) {
    console.error("Reseller application submit failed:", err);
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function approveApplicationAction(applicationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const app = await prisma.agentApplication.findUnique({
      where: { id: applicationId },
      include: { applicant: true, parentStore: true },
    });

    if (!app || app.status !== ApplicationStatus.PENDING_REVIEW) {
      return { success: false, error: "Application is not ready for review." };
    }

    const slug = app.storeName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.floor(1000 + Math.random() * 9000);

    // Create new Store for the approved agent
    const newStore = await prisma.store.create({
      data: {
        ownerUserId: app.applicantUserId,
        parentStoreId: app.parentStoreId,
        slug,
        name: app.storeName,
        status: StoreStatus.ACTIVE,
        storeType: StoreType.AGENT,
        displayName: app.storeName,
        // Materialized path: parent path + new id
        ancestorPath: app.parentStore
          ? `${app.parentStore.ancestorPath}/${app.parentStore.id}`
          : "root",
      },
    });

    // Copy parent store's pricings as default sub-agent pricings
    if (app.parentStoreId) {
      const parentPricings = await prisma.storePricing.findMany({
        where: { storeId: app.parentStoreId },
      });

      for (const p of parentPricings) {
        await prisma.storePricing.create({
          data: {
            storeId: newStore.id,
            bundleId: p.bundleId,
            priceForCustomersPesewas: p.priceForSubAgentsPesewas, // Starting retail price is parent's agent wholesale cost
            priceForSubAgentsPesewas: Math.round(p.priceForSubAgentsPesewas * 1.05), // Markup for sub-agents
          },
        });
      }
    }

    // Update application status
    await prisma.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedByUserId: (session.user as any).id,
        reviewedAt: new Date(),
      },
    });

    // Create ledger credit for approving parent store
    await createApplicationApprovalLedger(applicationId);

    // Update user role to AGENT
    await prisma.user.update({
      where: { id: app.applicantUserId },
      data: { role: "AGENT" },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Approve application failed:", err);
    return { success: false, error: err.message };
  }
}

export async function rejectApplicationAction(applicationId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const app = await prisma.agentApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app || app.status !== ApplicationStatus.PENDING_REVIEW) {
      return { success: false, error: "Application is not ready for review." };
    }

    // Update application status
    await prisma.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        reviewedByUserId: (session.user as any).id,
        reviewedAt: new Date(),
      },
    });

    // Note: Automatic Paystack refund would be triggered here in real implementation.
    // For mock/test mode, we log and complete.

    return { success: true };
  } catch (err: any) {
    console.error("Reject application failed:", err);
    return { success: false, error: err.message };
  }
}
