"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveApplicationAction, rejectApplicationAction } from "@/app/actions/reseller";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    if (!confirm("Are you sure you want to approve this reseller application?")) return;
    startTransition(async () => {
      const res = await approveApplicationAction(applicationId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to approve application");
      }
    });
  };

  const handleReject = () => {
    if (!confirm("Are you sure you want to reject this reseller application?")) return;
    startTransition(async () => {
      const res = await rejectApplicationAction(applicationId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to reject application");
      }
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-50"
      >
        {isPending ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="rounded bg-red-650 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-50"
      >
        {isPending ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
