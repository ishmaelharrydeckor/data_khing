import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { LedgerStatus, WithdrawalStatus } from "@prisma/client";
import { WithdrawalsForm } from "@/components/withdrawals-form";

export default async function WithdrawalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // Calculate available profit balance
  const availableLedgers = await prisma.ledger.findMany({
    where: {
      storeId: activeStore.id,
      status: LedgerStatus.AVAILABLE,
    },
  });
  const availableBalancePesewas = availableLedgers.reduce((acc, row) => acc + row.amountPesewas, 0);

  // Get active store withdrawal history
  const withdrawals = await prisma.withdrawal.findMany({
    where: { storeId: activeStore.id },
    orderBy: { requestedAt: "desc" },
  });

  const isAdmin = activeStore.storeType === "ROOT";

  // If Admin, query all platform-wide pending withdrawals
  let pendingAdminWithdrawals: any[] = [];
  if (isAdmin) {
    const rawPending = await prisma.withdrawal.findMany({
      where: { status: WithdrawalStatus.PENDING },
      orderBy: { requestedAt: "asc" },
      include: { store: true },
    });

    pendingAdminWithdrawals = rawPending.map((w) => ({
      id: w.id,
      storeName: w.store.name,
      amountPesewas: w.amountPesewas,
      payoutMethod: w.payoutMethod,
      requestedAt: w.requestedAt.toISOString(),
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Withdrawals & Payouts</h1>
        <p className="text-sm text-slate-400">
          Request payout against your available balance. Profits are distributed securely based on your cascading ledgers.
        </p>
      </div>

      <WithdrawalsForm
        storeId={activeStore.id}
        availableBalanceGHS={availableBalancePesewas / 100}
        isAdmin={isAdmin}
        pendingAdminWithdrawals={pendingAdminWithdrawals}
      />

      {/* Withdrawal History Table */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
        <h3 className="text-md font-bold text-white mb-4">Payout History</h3>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No withdrawal requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-900">
                <tr>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Method</th>
                  <th className="py-3">Reference</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-900/20">
                    <td className="py-3 font-semibold text-slate-200">
                      GH₵{(w.amountPesewas / 100).toFixed(2)}
                    </td>
                    <td className="py-3 text-slate-350">{w.payoutMethod}</td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {w.payoutReference || "N/A"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
                          w.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : w.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(w.requestedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
