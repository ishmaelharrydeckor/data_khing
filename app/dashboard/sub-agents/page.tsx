import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { GitFork } from "lucide-react";

export default async function SubAgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // Get full descendant tree of users using ancestorPath prefix/contains match on userId
  const descendants = await prisma.user.findMany({
    where: {
      ancestorPath: {
        contains: userId,
      },
    },
    orderBy: { createdAt: "desc" },
    include: { stores: true },
  });

  // Calculate relative tier depth and statistics for each descendant User
  const processedDescendants = await Promise.all(
    descendants.map(async (user) => {
      // Relative depth: how many levels below the active user
      const pathParts = user.ancestorPath.split("/");
      const activeIndex = pathParts.indexOf(userId);
      const depth = activeIndex !== -1 ? pathParts.length - activeIndex : 1;

      // Count orders of this user's storefronts
      const orderCount = await prisma.order.count({
        where: { sellingUserId: user.id },
      });

      // Sum of ledger entries where this user was the selling reseller user
      const userLedgers = await prisma.ledger.findMany({
        where: { userId: user.id },
      });
      const userProfit = userLedgers.reduce((acc, row) => acc + row.amountPesewas, 0);

      return {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        status: user.status,
        stores: user.stores,
        depth,
        orderCount,
        userProfit,
      };
    })
  );

  // Aggregated totals across downline
  const totalDownlineProfit = processedDescendants.reduce((acc, row) => acc + row.userProfit, 0);
  const totalDownlineOrders = processedDescendants.reduce((acc, row) => acc + row.orderCount, 0);

  const formatGHS = (pesewas: number) => {
    return `GH₵${(pesewas / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Full Downline Sub-Agents</h1>
        <p className="text-sm text-slate-400">
          Complete network tree of all sub-resellers recruited under your hierarchy branch (Read-only view).
        </p>
      </div>

      {/* Aggregate summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow">
          <div className="text-xs font-semibold text-slate-500 uppercase">Downline Size</div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{descendants.length} resellers</div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow">
          <div className="text-xs font-semibold text-slate-500 uppercase">Downline Volume</div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{totalDownlineOrders} orders</div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 shadow">
          <div className="text-xs font-semibold text-slate-500 uppercase">Aggregate Profit</div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{formatGHS(totalDownlineProfit)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
        <h3 className="text-md font-bold text-white mb-4">Downline Hierarchy Branch</h3>
        {processedDescendants.length === 0 ? (
          <div className="text-center py-10">
            <GitFork className="h-10 w-10 text-slate-650 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No recursive sub-agents found in this branch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-900">
                <tr>
                  <th className="py-3">Agent / Storefront Skins</th>
                  <th className="py-3">Relative Tier Depth</th>
                  <th className="py-3">Contact Email</th>
                  <th className="py-3">Total Orders</th>
                  <th className="py-3">Cumulative Profit</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {processedDescendants.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-900/20">
                    <td className="py-4">
                      <div className="font-semibold text-slate-200">{agent.name}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {agent.stores.map((s) => (
                          <span key={s.id} className="font-mono text-[10px] text-slate-500">
                            /shop/{s.slug} ({s.name})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="inline-block rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                        Tier {agent.depth} Downline
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-xs text-slate-355">{agent.email}</div>
                    </td>
                    <td className="py-4">{agent.orderCount} sales</td>
                    <td className="py-4 font-bold text-slate-300">{formatGHS(agent.userProfit)}</td>
                    <td className="py-4">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          agent.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : agent.status === "SUSPENDED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {agent.status}
                      </span>
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
