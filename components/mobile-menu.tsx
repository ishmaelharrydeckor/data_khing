"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, Layers, Users, GitFork, Coins, Palette, FileText, DollarSign } from "lucide-react";

export function MobileMenu({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/my-stores", label: "My Stores", icon: Layers },
    { href: "/dashboard/pricing", label: "Pricing Editor", icon: DollarSign },
    { href: "/dashboard/branding", label: "Branding", icon: Palette },
    { href: "/dashboard/agents", label: "My Agents", icon: Users },
    { href: "/dashboard/sub-agents", label: "Downline Tree", icon: GitFork },
    { href: "/dashboard/applications", label: "Applications", icon: FileText },
    { href: "/dashboard/withdrawals", label: "Withdrawals", icon: Coins },
  ];

  return (
    <div className="md:hidden">
      {/* Hamburger Toggle Button */}
      <button
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        className="p-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Fullscreen Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex-1 space-y-2 mt-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 rounded-xl border border-slate-900 bg-slate-900/30 px-4 py-3.5 text-md font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-all min-h-[44px]"
                >
                  <Icon className="h-5 w-5 text-indigo-400" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="border-t border-slate-900 pt-6 pb-8 text-center text-xs text-slate-500">
            {isPlatformAdmin && <div className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase mb-1">Platform Admin Mode</div>}
            DataKhing Mobile Dashboard
          </div>
        </div>
      )}
    </div>
  );
}
