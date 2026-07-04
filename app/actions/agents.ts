"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StoreStatus } from "@prisma/client";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string };
}

export async function toggleAgentStatusAction(formData: {
  storeId: string;
  agentStoreId: string;
  action: "SUSPEND" | "REACTIVATE";
}) {
  try {
    const user = await getRequiredSession();
    const { storeId, agentStoreId, action } = formData;

    // Verify parent store ownership
    const parentStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!parentStore || parentStore.ownerUserId !== user.id) {
      return { success: false, error: "Unauthorized access to parent store." };
    }

    // Verify target agent is a direct child
    const agentStore = await prisma.store.findUnique({
      where: { id: agentStoreId },
    });
    if (!agentStore || agentStore.parentStoreId !== storeId) {
      return { success: false, error: "Target store is not your direct agent downline." };
    }

    await prisma.store.update({
      where: { id: agentStoreId },
      data: {
        status: action === "SUSPEND" ? StoreStatus.SUSPENDED : StoreStatus.ACTIVE,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Toggle agent status failed:", err);
    return { success: false, error: err.message || "Failed to toggle status" };
  }
}
