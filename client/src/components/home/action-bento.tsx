"use client";

import React from "react";
import { UploadZone } from "@/components/vault/upload-zone";
import { Lock, CreditCard, Database } from "lucide-react";

export const ActionBento = ({ onUploadComplete }: { onUploadComplete: (filename: string, eta: number) => void }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* INGESTION */}
      <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl flex flex-col">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Database size={16} className="text-brand-primary" /> Secure Vault Ingestion
        </h2>
        <UploadZone onUploadComplete={onUploadComplete} />
      </div>

      {/* BILLING (Coming Soon) */}
      <div className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-4">
            <Lock size={20} className="text-brand-primary" />
          </div>
          <h3 className="text-white font-bold mb-1">Billing & Limits</h3>
          <p className="text-xs text-zinc-400">Payment Gateway Activating Soon</p>
        </div>

        <div className="opacity-30 pointer-events-none select-none filter blur-[1px]">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <CreditCard size={16} /> Neural Compute
          </h2>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Current Plan</p>
              <p className="text-lg font-bold text-white">Sovereign Pro</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Token Usage</span>
                <span className="text-brand-primary">45k / 100k</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary w-[45%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
