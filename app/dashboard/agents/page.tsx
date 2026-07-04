import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { AgentStatusToggle } from "@/components/agent-status-toggle";
import { StoreIcon } from "lucide-react";

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // Get direct children only
  const agents = await prisma.store.findMany({
    where: { parentStoreId: activeStore.id },
    orderBy: { createdAt: "desc" },
    include: { owner: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Direct Agents</h1>
        <p className="text-sm text-slate-400">
          Manage your direct reseller agent downlines. Suspend or reactivate their store access.
        </p>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
        {agents.length === 0 ? (
          <div className="text-center py-10">
            <StoreIcon className="h-10 w-10 text-slate-650 mx-auto mb-3" />
            <p className="text-sm text-slate-500">You do not have any direct agents recruited yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-900">
                <tr>
                  <th className="py-3">Agent / Store Name</th>
                  <th className="py-3">Slug Path</th>
                  <th className="py-3">Owner Contact</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {agents.map((agent) => {
                  const isSuspended = agent.status === "SUSPENDED";
                  return (
                    <tr key={agent.id} className="hover:bg-slate-900/20">
                      <td className="py-4 font-semibold text-slate-200">{agent.name}</td>
                      <td className="py-4 font-mono text-xs text-slate-500">/shop/{agent.slug}</td>
                      <td className="py-4">
                        <div className="text-xs text-slate-350">{agent.owner.email}</div>
                        {agent.owner.phone && <div className="text-[10px] text-slate-500">{agent.owner.phone}</div>}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
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
                      <td className="py-4">
                        <AgentStatusToggle
                          storeId={activeStore.id}
                          agentStoreId={agent.id}
                          isSuspended={isSuspended}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
