"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserStatus } from "@prisma/client";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string };
}

export async function toggleAgentStatusAction(formData: {
  storeId: string; // Kept for interface compatibility
  agentUserId: string;
  action: "SUSPEND" | "REACTIVATE";
}) {
  try {
    const user = await getRequiredSession();
    const { agentUserId, action } = formData;

    // Verify target agent is a direct child of the logged-in user
    const agentUser = await prisma.user.findFirst({
      where: {
        id: agentUserId,
        parentUserId: user.id,
      },
    });

    if (!agentUser) {
      return { success: false, error: "Target agent is not your direct downline." };
    }

    // Toggle status on User
    await prisma.user.update({
      where: { id: agentUserId },
      data: {
        status: action === "SUSPEND" ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Toggle agent status failed:", err);
    return { success: false, error: err.message || "Failed to toggle status" };
  }
}
