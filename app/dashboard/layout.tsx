import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveStore } from "@/lib/store-context";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StoreSwitcher } from "@/components/store-switcher";
import { MobileMenu } from "@/components/mobile-menu";
import {
  LayoutDashboard,
  Layers,
  Users,
  GitFork,
  Coins,
  Palette,
  FileText,
  DollarSign,
  PlusCircle,
} from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (dbUser?.status === "PENDING") {
    const pendingApp = await prisma.agentApplication.findFirst({
      where: { applicantUserId: userId },
      orderBy: { createdAt: "desc" },
    });
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-905 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Under Review
          </h2>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            Your reseller agent application {pendingApp ? `for "${pendingApp.storeName}"` : ""} is currently under review.
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
            You will gain access to your dashboard and storefront once your parent administrator approves your application.
          </p>
          <Link
            href="/"
            className="mt-6 block w-full rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-705 py-3 font-semibold text-slate-300 hover:text-white transition-all text-sm cursor-pointer"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (dbUser?.status === "SUSPENDED") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-950 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-black bg-gradient-to-r from-red-450 to-rose-500 bg-clip-text text-transparent">
            Account Suspended
          </h2>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            Your reseller account has been suspended.
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Please contact support or your upstream agent supervisor for assistance.
          </p>
          <Link
            href="/"
            className="mt-6 block w-full rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-705 py-3 font-semibold text-slate-300 hover:text-white transition-all text-sm cursor-pointer"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Get active store context with ownership verification
  const activeStore = await getActiveStore(userId);

  // Get all stores owned by this user for the switcher dropdown
  const myStores = await prisma.store.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });

  // If user owns no stores, prompt them to create one or apply
  if (!activeStore && myStores.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            No Stores Found
          </h2>
          <p className="text-sm text-slate-450 mt-2 mb-6">
            You don't own any active data reseller store. Create an independent store or join a reseller downline to get started.
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard/my-stores"
              className="block w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold text-white shadow-lg transition-all"
            >
              Add Independent Store
            </Link>
            <Link
              href="/"
              className="block w-full rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 py-3 font-semibold text-slate-300 hover:text-white transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  const isPlatformAdmin = dbUser?.accountType === "ROOT";

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col hidden md:flex shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-900">
          <Link href="/" className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            DataKhing
          </Link>
        </div>

        {/* Store Switcher */}
        <div className="p-4 border-b border-slate-900">
          <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider block mb-1">
            Active Store Context
          </label>
          {activeStore && <StoreSwitcher currentStore={activeStore} stores={myStores} />}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>

          <Link
            href="/dashboard/my-stores"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <Layers className="h-4 w-4" />
            My Stores
          </Link>

          <Link
            href="/dashboard/pricing"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Pricing Editor
          </Link>

          <Link
            href="/dashboard/branding"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <Palette className="h-4 w-4" />
            Branding
          </Link>

          <Link
            href="/dashboard/agents"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <Users className="h-4 w-4" />
            My Agents
          </Link>

          <Link
            href="/dashboard/sub-agents"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <GitFork className="h-4 w-4" />
            Downline Tree
          </Link>

          <Link
            href="/dashboard/applications"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <FileText className="h-4 w-4" />
            Applications
          </Link>

          <Link
            href="/dashboard/withdrawals"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-all font-medium"
          >
            <Coins className="h-4 w-4" />
            Withdrawals
          </Link>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-900 text-xs text-slate-500">
          <div>Logged in as:</div>
          <div className="font-semibold text-slate-300 truncate">{session.user?.email}</div>
          {isPlatformAdmin && <div className="mt-1 text-[10px] uppercase font-bold text-indigo-400">Platform Admin</div>}
        </div>
      </aside>

      {/* Main Body Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-100 hidden md:block">
            {activeStore ? activeStore.name : "Dashboard"}
          </h2>
          <div className="flex items-center gap-2 md:hidden w-full justify-between">
            <MobileMenu isPlatformAdmin={isPlatformAdmin} />
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate max-w-[100px]">
              DataKhing
            </span>
            {activeStore && <StoreSwitcher currentStore={activeStore} stores={myStores} />}
          </div>
          <div className="flex items-center gap-4 hidden md:flex">
            {activeStore && (
              <Link
                href={`/shop/${activeStore.slug}`}
                target="_blank"
                className="text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                Visit Storefront
              </Link>
            )}
          </div>
        </header>

        {/* Scrollable Page content */}
        <main className="flex-grow p-6 overflow-y-auto bg-slate-950/20">
          {children}
        </main>
      </div>
    </div>
  );
}
