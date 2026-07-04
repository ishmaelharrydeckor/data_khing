import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { BrandingEditorForm } from "@/components/branding-editor-form";

export default async function BrandingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  const brandingProps = {
    storeId: activeStore.id,
    displayName: activeStore.displayName || "",
    logoUrl: activeStore.logoUrl || "",
    primaryColor: activeStore.primaryColor || "#4F46E5",
    supportEmail: activeStore.supportEmail || "",
    contactPhone: activeStore.contactPhone || "",
    footerText: activeStore.footerText || "",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Store Branding</h1>
        <p className="text-sm text-slate-400">
          Personalize your storefront colors, logos, titles, and support info. Changes will apply immediately to your public URL storefront path.
        </p>
      </div>

      <BrandingEditorForm branding={brandingProps} />
    </div>
  );
}
