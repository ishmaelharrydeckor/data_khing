"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string };
}

export async function saveBrandingAction(formData: {
  storeId: string;
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  contactPhone: string;
  footerText: string;
}) {
  try {
    const user = await getRequiredSession();
    const { storeId, displayName, logoUrl, primaryColor, supportEmail, contactPhone, footerText } = formData;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.ownerUserId !== user.id) {
      return { success: false, error: "Unauthorized access to this store." };
    }

    await prisma.store.update({
      where: { id: storeId },
      data: {
        displayName: displayName || null,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || "#4F46E5",
        supportEmail: supportEmail || null,
        contactPhone: contactPhone || null,
        footerText: footerText || null,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Save branding error:", err);
    return { success: false, error: err.message || "Failed to update branding." };
  }
}
