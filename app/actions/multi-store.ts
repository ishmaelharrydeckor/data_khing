"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoreStatus } from "@prisma/client";
import { cookies } from "next/headers";

// Helpers to get current user session
async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; email: string; name?: string };
}

export async function createIndependentStoreAction(formData: { name: string; slug: string }) {
  const user = await getRequiredSession();
  const cleanSlug = formData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");

  if (!formData.name || !cleanSlug) {
    return { success: false, error: "Name and Slug are required." };
  }

  // 1. Check unique slug
  const existingSlug = await prisma.store.findUnique({
    where: { slug: cleanSlug },
  });
  if (existingSlug) {
    return { success: false, error: "Store slug is already taken." };
  }

  // 2. Enforce limit of 5 stores
  const storeCount = await prisma.store.count({
    where: { ownerUserId: user.id },
  });
  if (storeCount >= 5) {
    return { success: false, error: "You can own a maximum of 5 stores." };
  }

  // 3. Enforce 24h cooldown
  const mostRecentStore = await prisma.store.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (mostRecentStore) {
    const cooldownMs = 24 * 60 * 60 * 1000;
    const timeSinceCreation = Date.now() - new Date(mostRecentStore.createdAt).getTime();
    if (timeSinceCreation < cooldownMs) {
      const hoursRemaining = Math.ceil((cooldownMs - timeSinceCreation) / (1000 * 60 * 60));
      return {
        success: false,
        error: `Please wait ${hoursRemaining} hour(s) before creating another store.`,
      };
    }
  }

  // 4. Update user accountType if currently null (means they are self-serving independent resellers)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser && dbUser.accountType === null) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountType: "INDEPENDENT",
        status: "ACTIVE",
      },
    });
  }

  // 5. Create store presentation skin
  const store = await prisma.store.create({
    data: {
      ownerUserId: user.id,
      slug: cleanSlug,
      name: formData.name,
      status: StoreStatus.ACTIVE,
      displayName: formData.name,
    },
  });

  // 6. Update active store cookie
  const cookieStore = await cookies();
  cookieStore.set("active_store_id", store.id, { path: "/" });

  return { success: true, store };
}

export async function switchActiveStoreAction(storeId: string) {
  const user = await getRequiredSession();

  // Verify ownership
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store || store.ownerUserId !== user.id) {
    return { success: false, error: "You do not own this store." };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_store_id", store.id, { path: "/" });

  return { success: true };
}
