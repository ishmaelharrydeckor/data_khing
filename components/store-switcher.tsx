"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchActiveStoreAction } from "@/app/actions/multi-store";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
}

export function StoreSwitcher({
  currentStore,
  stores,
}: {
  currentStore: StoreItem;
  stores: StoreItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === currentStore.id) return;

    startTransition(async () => {
      const res = await switchActiveStoreAction(val);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to switch store");
      }
    });
  };

  return (
    <div className="relative">
      <select
        value={currentStore.id}
        onChange={handleSelect}
        disabled={isPending}
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name} ({store.slug})
          </option>
        ))}
      </select>
      {isPending && (
        <span className="absolute right-8 top-2.5 h-3 w-3 animate-ping rounded-full bg-indigo-400 opacity-75" />
      )}
    </div>
  );
}
