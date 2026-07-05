import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { LedgerStatus } from "@prisma/client";
import { ArrowUpRight, Coins, ShoppingBag, Users, Wallet } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // 1. Stats Queries
  // Sum available ledger profits
  const availableLedgers = await prisma.ledger.findMany({
    where: {
      userId: userId,
      status: LedgerStatus.AVAILABLE,
    },
  });
  const availableBalance = availableLedgers.reduce((acc, row) => acc + row.amountPesewas, 0);

  // Sum total lifetime earnings
  const allLedgers = await prisma.ledger.findMany({
    where: { userId: userId },
  });
  const lifetimeEarnings = allLedgers.reduce((acc, row) => acc + row.amountPesewas, 0);

  // Total orders count
  const totalOrders = await prisma.order.count({
    where: { storeId: activeStore.id },
  });

  // Direct agent count
  const directAgents = await prisma.user.count({
    where: { parentUserId: userId },
  });

  // 2. Recent Orders List
  const recentOrders = await prisma.order.findMany({
    where: { storeId: activeStore.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { bundle: true },
  });

  // 3. Supplier Account Balance (Platform admin-only stats)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  const isPlatformAdmin = dbUser?.accountType === "ROOT";
  let supplierBalance = 0;
  if (isPlatformAdmin) {
    const supplierAccount = await prisma.supplierAccount.findFirst();
    supplierBalance = supplierAccount ? supplierAccount.balancePesewas : 0;
  }

  const formatGHS = (pesewas: number) => {
    return `GH₵${(pesewas / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
        <p className="text-sm text-slate-400">
          Performance and statistics for <span className="font-semibold text-slate-200">{activeStore.name}</span>
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-400">Available Profit</span>
            <Wallet className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatGHS(availableBalance)}</div>
          <p className="text-xs text-slate-500 mt-1">Ready for withdrawal</p>
        </div>

        {/* Lifetime Profit */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-400">Lifetime Earnings</span>
            <Coins className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatGHS(lifetimeEarnings)}</div>
          <p className="text-xs text-slate-500 mt-1">Total revenue spread</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-400">Total Sales</span>
            <ShoppingBag className="h-5 w-5 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalOrders}</div>
          <p className="text-xs text-slate-500 mt-1">Orders processed</p>
        </div>

        {/* Direct Agents */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-400">Direct Agents</span>
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{directAgents}</div>
          <p className="text-xs text-slate-500 mt-1">Sub-stores managed</p>
        </div>
      </div>

      {/* Platform Admin Stats Section */}
      {isPlatformAdmin && (
        <div className="rounded-xl border border-indigo-950 bg-indigo-950/20 p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-md font-bold text-white uppercase tracking-wider">Platform Core Balance</h3>
              <p className="text-xs text-indigo-300">Shared API Deposit Wallet Balance (Funds all orders)</p>
            </div>
            <ArrowUpRight className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-4xl font-extrabold text-white">{formatGHS(supplierBalance)}</div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
        <h3 className="text-md font-bold text-white mb-4">Recent Store Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No orders recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-900">
                <tr>
                  <th className="py-3">Recipient</th>
                  <th className="py-3">Bundle</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-900/20">
                    <td className="py-3 font-semibold text-slate-200">{order.recipientPhone}</td>
                    <td className="py-3">{order.bundle.label}</td>
                    <td className="py-3 text-slate-300">{formatGHS(order.amountPaid)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
                          order.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : order.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
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
