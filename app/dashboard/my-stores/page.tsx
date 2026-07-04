import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateStoreForm } from "@/components/create-store-form";
import { Layers, Store as StoreIcon } from "lucide-react";

export default async function MyStoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;

  const stores = await prisma.store.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Stores</h1>
        <p className="text-sm text-slate-400">
          Manage your independent and agent stores. Up to 5 stores permitted per user.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: List of stores */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-md font-bold text-white">Your Storefronts</h3>
          {stores.length === 0 ? (
            <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-8 text-center">
              <StoreIcon className="h-10 w-10 text-slate-650 mx-auto mb-3" />
              <p className="text-sm text-slate-500">You don't own any stores yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => {
                const isActive = store.status === "ACTIVE";
                return (
                  <div
                    key={store.id}
                    className="rounded-xl border border-slate-900 bg-slate-900/30 p-5 flex flex-col justify-between hover:border-slate-800 transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-100">{store.name}</span>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {store.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">/shop/{store.slug}</p>
                      <div className="mt-3 flex gap-2 text-xs text-slate-450">
                        <span className="bg-slate-900 border border-slate-800 rounded px-2 py-1 uppercase">
                          {store.storeType}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Create form */}
        <div className="space-y-4">
          <CreateStoreForm />
        </div>
      </div>
    </div>
  );
}
