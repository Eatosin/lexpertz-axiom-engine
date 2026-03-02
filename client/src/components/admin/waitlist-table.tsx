"use client";

import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function WaitlistTable({ leads }: { leads: any[] }) {
  return (
    <div className="bg-surface border border-white/5 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Clearance Terminal</h3>
          <p className="text-xs text-zinc-500">Latest enterprise waitlist requests</p>
        </div>
        <button className="text-sm font-medium text-brand-secondary hover:text-white transition">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 uppercase bg-[#0A0A0A] border-b border-white/5 font-mono">
            <tr>
              <th className="px-6 py-4 font-medium">Signature (Email)</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-brand-primary uppercase">
                    {lead.email.substring(0,2)}
                  </div>
                  {lead.email}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-bold",
                    lead.status === "approved" ? "bg-brand-primary/10 text-brand-primary" : 
                    lead.status === "rejected" ? "bg-red-500/10 text-red-500" : 
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{lead.date}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No clearance requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
