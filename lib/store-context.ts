import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Store } from "@prisma/client";

// Note: cookies() can only be called dynamically in Server Components, Server Actions, or Route Handlers.
export async function getActiveStore(userId: string): Promise<Store | null> {
  const cookieStore = await cookies();
  const activeStoreId = cookieStore.get("active_store_id")?.value;

  if (activeStoreId) {
    // Re-verify ownership on every read
    const store = await prisma.store.findUnique({
      where: { id: activeStoreId },
    });

    if (store && store.ownerUserId === userId) {
      return store;
    }
  }

  // Fallback: Find user's first owned store if cookie is missing or invalid
  const firstOwnedStore = await prisma.store.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });

  return firstOwnedStore;
}
