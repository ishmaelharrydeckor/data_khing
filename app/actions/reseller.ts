"use server";

import { prisma } from "@/lib/prisma";
import { ApplicationStatus, StoreStatus, AccountType, UserStatus } from "@prisma/client";
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
  email: string;
  phone: string;
  password: string;
  parentStoreId: string;
}) {
  try {
    const { storeName, email, phone, password, parentStoreId } = formData;

    if (!storeName || !email || !phone || !password || !parentStoreId) {
      return { success: false, error: "All fields are required." };
    }

    const parentStore = await prisma.store.findUnique({
      where: { id: parentStoreId },
    });

    if (!parentStore) {
      return { success: false, error: "Parent store not found." };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return { success: false, error: "An account with this email already exists." };
    }

    const applicationFee = 5000; // GH₵50 application fee

    // Generate Paystack checkout reference
    const paymentRef = "app_pay_" + crypto.randomBytes(8).toString("hex");
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = headerList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const callbackUrl = `${baseUrl}/shop/${parentStore.slug}/become-a-reseller/verify-payment`;

    const paystackRes = await paymentClient.initializePayment(
      email,
      applicationFee,
      callbackUrl
    );

    // Create User immediately (status: PENDING, accountType: null)
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);
    const applicant = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        status: "PENDING",
      },
    });

    const app = await prisma.agentApplication.create({
      data: {
        applicantUserId: applicant.id,
        parentUserId: parentStore.ownerUserId,
        viaStoreId: parentStoreId,
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
      include: { applicant: true, parentUser: true },
    });

    if (!app || app.status !== ApplicationStatus.PENDING_REVIEW) {
      return { success: false, error: "Application is not ready for review." };
    }

    const slug = app.storeName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.floor(1000 + Math.random() * 9000);

    // 1. Create first storefront skin for the approved agent
    const newStore = await prisma.store.create({
      data: {
        ownerUserId: app.applicantUserId,
        slug,
        name: app.storeName,
        status: StoreStatus.ACTIVE,
        displayName: app.storeName,
      },
    });

    // 2. Copy parent user's bundle pricings as starting buy prices for the new agent
    if (app.parentUserId) {
      const parentPricings = await prisma.userPricing.findMany({
        where: { userId: app.parentUserId },
      });

      for (const p of parentPricings) {
        await prisma.userPricing.create({
          data: {
            userId: app.applicantUserId,
            bundleId: p.bundleId,
            priceForCustomersPesewas: p.priceForSubAgentsPesewas, // Starting retail price is parent's agent wholesale cost
            priceForSubAgentsPesewas: Math.round(p.priceForSubAgentsPesewas * 1.05), // Markup for sub-agents
          },
        });
      }
    }

    // 3. Update application status
    await prisma.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedByUserId: (session.user as any).id,
        reviewedAt: new Date(),
      },
    });

    // 4. Create ledger credit for approving parent store owner
    await createApplicationApprovalLedger(applicationId);

    // 5. Update user to ACTIVE agent
    const ancestorPath = app.parentUser
      ? `${app.parentUser.ancestorPath}/${app.parentUser.id}`
      : "root";

    await prisma.user.update({
      where: { id: app.applicantUserId },
      data: {
        status: "ACTIVE",
        accountType: "AGENT",
        parentUserId: app.parentUserId,
        ancestorPath,
        role: "AGENT",
      },
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

    // 1. Update application status
    await prisma.agentApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        reviewedByUserId: (session.user as any).id,
        reviewedAt: new Date(),
      },
    });

    // 2. Retain applicant user but activate as generic customer accountType: null
    await prisma.user.update({
      where: { id: app.applicantUserId },
      data: {
        status: "ACTIVE",
        accountType: null,
      },
    });

    // Note: Automatic Paystack refund of the application fee is logged here for real gateway processing.
    console.log(`Application ${applicationId} rejected. Refunding fee: GH₵ ${(app.applicationFeePesewas / 100).toFixed(2)}`);

    return { success: true };
  } catch (err: any) {
    console.error("Reject application failed:", err);
    return { success: false, error: err.message };
  }
}
