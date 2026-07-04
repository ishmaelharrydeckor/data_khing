"use client";

import { useState } from "react";
import { Clock, ShieldCheck, HeartHandshake, Phone, MessageSquare, Award, ThumbsUp, Percent, Star } from "lucide-react";

interface AboutTabsProps {
  store: {
    name: string;
    displayName: string | null;
    createdAt: string;
    contactEmail: string | null;
    contactPhone: string | null;
    supportEmail: string | null;
  };
  primaryColor: string;
  daysActive: number;
  stats: {
    HAPPY_CUSTOMERS: string;
    ORDERS_COMPLETED: string;
    AVERAGE_RATING: string;
    SUCCESS_RATE: string;
  };
  policies: {
    DELIVERY: string;
    REFUNDS: string;
    SUPPORT: string;
  };
}

export function AboutTabs({ store, primaryColor, daysActive, stats, policies }: AboutTabsProps) {
  const [activeTab, setActiveTab] = useState<"about" | "stats" | "policies">("about");

  const displayName = store.displayName || store.name;

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* Tabs list */}
      <div className="flex border-b border-slate-900 justify-center gap-4">
        {(["about", "stats", "policies"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer capitalize px-4 ${
              activeTab === tab
                ? "text-white"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
            style={{ borderBottomColor: activeTab === tab ? primaryColor : "transparent" }}
          >
            {tab === "about" ? "About Us" : tab === "stats" ? "Statistics" : "Policies"}
          </button>
        ))}
      </div>

      {/* About Us Tab */}
      {activeTab === "about" && (
        <div className="space-y-10 animate-in fade-in duration-200">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Info details */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">Profile Overview</h3>
              
              <div className="space-y-4 text-sm text-slate-400">
                <div className="flex justify-between py-2 border-b border-slate-900">
                  <span className="font-medium text-slate-500">Business Name</span>
                  <span className="font-bold text-white text-right">{displayName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-900">
                  <span className="font-medium text-slate-500">Support Email</span>
                  <span className="font-bold text-white text-right">{store.supportEmail || store.contactEmail || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-900">
                  <span className="font-medium text-slate-500">Contact Number</span>
                  <span className="font-bold text-white text-right">{store.contactPhone || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-900">
                  <span className="font-medium text-slate-500">Established</span>
                  <span className="font-bold text-white text-right">{new Date(store.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium text-slate-500">In Business</span>
                  <span className="font-bold text-indigo-400 text-right">{daysActive} {daysActive === 1 ? "day" : "days"}</span>
                </div>
              </div>

              {/* Call / WhatsApp CTAs */}
              {store.contactPhone && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <a
                    href={`tel:${store.contactPhone}`}
                    className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 py-3 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Phone className="h-4 w-4 text-emerald-400" /> Call Us
                  </a>
                  <a
                    href={`https://wa.me/${store.contactPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 py-3 text-xs font-bold text-emerald-400 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-400" /> WhatsApp Us
                  </a>
                </div>
              )}
            </div>

            {/* Mission / Choose Us */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Our Mission</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We strive to democratize internet connectivity across Ghana. By making mobile data top-ups affordable, fast, and accessible, we enable families, students, and businesses to remain connected seamlessly.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest">Why Choose Us?</h4>
                <div className="grid gap-3 text-xs">
                  <div className="flex gap-3 rounded-xl border border-slate-900/50 bg-slate-900/20 p-3">
                    <Clock className="h-5 w-5 text-indigo-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-white">Instant Dispatch</h5>
                      <p className="text-slate-500 mt-0.5">Automated delivery loops send data directly to you.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-slate-900/50 bg-slate-900/20 p-3">
                    <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-white">Secure Payouts</h5>
                      <p className="text-slate-500 mt-0.5">Your money is processed securely through Paystack channels.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-slate-900/50 bg-slate-900/20 p-3">
                    <HeartHandshake className="h-5 w-5 text-indigo-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-white">Reliable Support</h5>
                      <p className="text-slate-500 mt-0.5">Our helpful support lines remain open 24/7.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && (
        <div className="space-y-8 animate-in fade-in duration-200 text-center max-w-2xl mx-auto">
          <div className="space-y-2 mb-8">
            <h3 className="text-lg font-bold text-white">Platform Trust Statistics</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Validated overall statistics across our global reseller network infrastructure.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Stat Card 1 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/25 p-5 flex flex-col justify-center items-center shadow-md">
              <Award className="h-7 w-7 text-indigo-400 mb-2" />
              <div className="text-2xl font-black text-white">{stats.ORDERS_COMPLETED}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Orders Dispatched</div>
            </div>
            {/* Stat Card 2 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/25 p-5 flex flex-col justify-center items-center shadow-md">
              <ThumbsUp className="h-7 w-7 text-indigo-400 mb-2" />
              <div className="text-2xl font-black text-white">{stats.HAPPY_CUSTOMERS}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Happy Clients</div>
            </div>
            {/* Stat Card 3 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/25 p-5 flex flex-col justify-center items-center shadow-md">
              <Star className="h-7 w-7 text-indigo-400 mb-2 fill-indigo-400/20" />
              <div className="text-2xl font-black text-white">{stats.AVERAGE_RATING}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Average Review</div>
            </div>
            {/* Stat Card 4 */}
            <div className="rounded-2xl border border-slate-900 bg-slate-900/25 p-5 flex flex-col justify-center items-center shadow-md">
              <Percent className="h-7 w-7 text-indigo-400 mb-2" />
              <div className="text-2xl font-black text-white">{stats.SUCCESS_RATE}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Success Ratio</div>
            </div>
          </div>
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === "policies" && (
        <div className="space-y-8 animate-in fade-in duration-200 max-w-3xl mx-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Delivery Policy</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{policies.DELIVERY}</p>
            </div>
            <div className="border-t border-slate-900 pt-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Refund Conditions</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{policies.REFUNDS}</p>
            </div>
            <div className="border-t border-slate-900 pt-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Customer Support</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{policies.SUPPORT}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
