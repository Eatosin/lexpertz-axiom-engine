"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, Zap, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const RecentVault = ({ onInterrogate }: { onInterrogate: (filename: string) => void }) => {
  const { getToken } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["vault-history-main"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return[];
      return api.getHistory(token);
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col">
      <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Clock size={16} className="text-zinc-400" /> Recent Vault Evidence
        </h2>
        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-mono text-zinc-400">
          {documents?.length || 0} Records Secured
        </div>
      </div>

      <div className="p-6 md:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
            <Zap size={24} className="animate-pulse text-brand-primary" />
            <p className="text-sm font-mono uppercase tracking-widest">Decrypting Ledger...</p>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">
            <FileText size={32} className="opacity-50" />
            <p className="text-sm">Your vault is empty. Upload evidence to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">Document Target</th>
                  <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">Indexed Date</th>
                  <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">State</th>
                  <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 5).map((doc, idx) => (
                  <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 border-b border-white/5 text-sm text-white font-medium flex items-center gap-3">
                      <FileText size={14} className="text-brand-primary" />
                      {doc.filename}
                    </td>
                    <td className="p-4 border-b border-white/5 text-sm text-zinc-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 border-b border-white/5">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider",
                        doc.status === "indexed" ? "bg-emerald-500/10 text-emerald-500" :
                        doc.status === "error" ? "bg-red-500/10 text-red-500" :
                        "bg-amber-500/10 text-amber-500"
                      )}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4 border-b border-white/5 text-right">
                      <button 
                        onClick={() => onInterrogate(doc.filename)}
                        disabled={doc.status !== "indexed"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-brand-primary group-hover:text-black"
                      >
                        Interrogate <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
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
};
