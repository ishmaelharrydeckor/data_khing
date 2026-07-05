import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import { ApplicationActions } from "@/components/application-actions";
import { FileText } from "lucide-react";

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const activeStore = await getActiveStore(userId);

  if (!activeStore) {
    redirect("/dashboard/my-stores");
  }

  // Fetch applications where parentUserId matches this user
  const apps = await prisma.agentApplication.findMany({
    where: { parentUserId: userId },
    orderBy: { createdAt: "desc" },
    include: { applicant: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Pending Reseller Applications</h1>
        <p className="text-sm text-slate-400">
          Review and approve requests from users applying to resell data bundles under your store.
        </p>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 shadow backdrop-blur-xl">
        {apps.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 text-slate-650 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No reseller applications received yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-900">
                <tr>
                  <th className="py-3">Applicant Name</th>
                  <th className="py-3">Email Address</th>
                  <th className="py-3">Desired Store Name</th>
                  <th className="py-3">Application Fee</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {apps.map((app) => {
                  const isPendingReview = app.status === "PENDING_REVIEW";
                  return (
                    <tr key={app.id} className="hover:bg-slate-900/20">
                      <td className="py-4 font-semibold text-slate-200">{app.applicant.name}</td>
                      <td className="py-4 text-xs text-slate-450">{app.applicant.email}</td>
                      <td className="py-4 text-slate-300 font-semibold">{app.storeName}</td>
                      <td className="py-4">GH₵{(app.applicationFeePesewas / 100).toFixed(2)}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
                            app.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : app.status === "REJECTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : app.status === "PENDING_REVIEW"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-slate-900 text-slate-500 border border-slate-800"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-4">
                        {isPendingReview ? (
                          <ApplicationActions applicationId={app.id} />
                        ) : (
                          <span className="text-xs text-slate-600">Reviewed</span>
                        )}
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
