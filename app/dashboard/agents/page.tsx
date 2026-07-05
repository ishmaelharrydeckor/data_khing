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

  // Get direct child agent users
  const agents = await prisma.user.findMany({
    where: { parentUserId: userId },
    orderBy: { createdAt: "desc" },
    include: { stores: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Direct Agents</h1>
        <p className="text-sm text-slate-400">
          Manage your direct reseller agent downlines. Suspend or reactivate their user privileges.
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
                  <th className="py-3">Agent Name</th>
                  <th className="py-3">Active Storefront Skins</th>
                  <th className="py-3">Contact Details</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {agents.map((agent) => {
                  const isSuspended = agent.status === "SUSPENDED";
                  return (
                    <tr key={agent.id} className="hover:bg-slate-900/20">
                      <td className="py-4 font-semibold text-slate-200">
                        {agent.name || "Unnamed Agent"}
                      </td>
                      <td className="py-4">
                        {agent.stores.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No storefront skins</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {agent.stores.map((s) => (
                              <a
                                key={s.id}
                                href={`/shop/${s.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-indigo-400 hover:underline"
                              >
                                /shop/{s.slug} ({s.name})
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-xs text-slate-350">{agent.email}</div>
                        {agent.phone && <div className="text-[10px] text-slate-500">{agent.phone}</div>}
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
                          agentUserId={agent.id}
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
