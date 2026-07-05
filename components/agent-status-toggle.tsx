"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAgentStatusAction } from "@/app/actions/agents";

export function AgentStatusToggle({
  storeId,
  agentUserId,
  isSuspended,
}: {
  storeId: string;
  agentUserId: string;
  isSuspended: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleAgentStatusAction({
        storeId,
        agentUserId,
        action: isSuspended ? "REACTIVATE" : "SUSPEND",
      });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update agent status.");
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`rounded px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-50 ${
        isSuspended ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
      }`}
    >
      {isPending ? "Updating..." : isSuspended ? "Reactivate" : "Suspend"}
    </button>
  );
}
