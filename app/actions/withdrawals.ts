"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WithdrawalStatus, PayoutMethod, LedgerStatus } from "@prisma/client";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string };
}

export async function requestWithdrawalAction(formData: {
  storeId: string;
  amountPesewas: number;
  payoutMethod: PayoutMethod;
}) {
  try {
    const user = await getRequiredSession();
    const { storeId, amountPesewas, payoutMethod } = formData;

    if (amountPesewas <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.ownerUserId !== user.id) {
      return { success: false, error: "Unauthorized access." };
    }

    // Get all AVAILABLE ledger rows for this store
    const availableLedgers = await prisma.ledger.findMany({
      where: {
        storeId,
        status: LedgerStatus.AVAILABLE,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalAvailable = availableLedgers.reduce((acc, row) => acc + row.amountPesewas, 0);

    if (totalAvailable < amountPesewas) {
      return { success: false, error: "Insufficient available balance." };
    }

    // Select ledger rows to cover this withdrawal
    let accumulated = 0;
    const selectedLedgerIds: string[] = [];

    for (const row of availableLedgers) {
      if (accumulated >= amountPesewas) break;
      accumulated += row.amountPesewas;
      selectedLedgerIds.push(row.id);
    }

    // Create withdrawal request
    await prisma.withdrawal.create({
      data: {
        storeId,
        amountPesewas,
        ledgerIds: selectedLedgerIds,
        status: WithdrawalStatus.PENDING,
        payoutMethod,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Withdrawal error:", err);
    return { success: false, error: err.message || "Failed to submit request." };
  }
}

export async function processWithdrawalAction(withdrawalId: string, action: "APPROVE" | "REJECT") {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Only root platform admins can process payouts." };
    }

    const w = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!w || w.status !== WithdrawalStatus.PENDING) {
      return { success: false, error: "Withdrawal request is not pending." };
    }

    if (action === "APPROVE") {
      // 1. Mark withdrawal COMPLETED
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.COMPLETED,
          completedAt: new Date(),
          completedByUserId: (session.user as any).id,
          payoutReference: "payout_ref_" + Math.random().toString(36).substring(2, 10),
        },
      });

      // 2. Flip all referenced ledgers to WITHDRAWN
      await prisma.ledger.updateMany({
        where: {
          id: { in: w.ledgerIds },
        },
        data: {
          status: LedgerStatus.WITHDRAWN,
        },
      });
    } else {
      // Mark failed/rejected
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          completedAt: new Date(),
          completedByUserId: (session.user as any).id,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Process withdrawal error:", err);
    return { success: false, error: err.message };
  }
}
