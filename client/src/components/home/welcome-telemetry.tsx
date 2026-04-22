"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ShieldCheck, Activity, Zap, Server, X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const WelcomeTelemetry = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch telemetry dynamically
  const { data: telemetry, isLoading } = useQuery({
    queryKey: ["global-telemetry"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      return api.getTelemetry(token);
    },
    staleTime: 1000 * 60 * 5,
  });

  const firstName = user?.firstName || "Sovereign Admin";
  
  // Safely parse data
  const faithfulness = Math.round((telemetry?.ragas?.faithfulness || 0) * 100);
  const precision = Math.round((telemetry?.ragas?.precision || 0) * 100);
  const relevance = Math.round((telemetry?.ragas?.relevance || 0) * 100);
  const trustScore = Math.round((faithfulness + precision + relevance) / 3) || 0;

  return (
    <div className="space-y-6">
      {/* 1. WELCOME MESSAGE */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">System Overview</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-brand-primary">{firstName}</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-mono font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
        >
          <Activity size={14} className="animate-pulse" />
          Axiom Gating: Optimal
        </button>
      </div>

      {/* 2. TELEMETRY WIDGETS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Server size={10}/> Total Chunks</span>
          <span className="text-2xl font-bold text-white mt-1">{isLoading ? "..." : telemetry?.chunks || "0"}</span>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1"><ShieldAlert size={10}/> Hallucinations Blocked</span>
          <span className="text-2xl font-bold text-white mt-1">{isLoading ? "..." : telemetry?.blocked || "0"}</span>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10}/> Vault Persistence</span>
          <span className="text-2xl font-bold text-white mt-1">{isLoading ? "..." : telemetry?.persistence || "0%"}</span>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Zap size={10}/> Avg Latency</span>
          <span className="text-2xl font-bold text-white mt-1">{isLoading ? "..." : telemetry?.latency || "0.0s"}</span>
        </div>
      </div>

      {/* 3. THE GLOBAL SECURITY MODAL (From your screenshot) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
              
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShieldCheck className="text-brand-primary" size={20}/> Global Security Analysis</h3>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Aggregate RAGAS Telemetry (DeepSeek Judge)</p>
              </div>

              <div className="space-y-5 bg-zinc-900/30 border border-white/5 rounded-2xl p-5 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-zinc-300"><span className="uppercase tracking-wider">Average Faithfulness</span><span>{faithfulness}%</span></div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${faithfulness}%` }} className="h-full bg-emerald-500" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-zinc-300"><span className="uppercase tracking-wider">Average Context Precision</span><span>{precision}%</span></div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${precision}%` }} className="h-full bg-sky-500" /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-zinc-300"><span className="uppercase tracking-wider">Average Answer Relevance</span><span>{relevance}%</span></div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${relevance}%` }} className="h-full bg-purple-500" /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <ShieldAlert className="text-red-500 mb-2" size={24} />
                  <span className="text-2xl font-bold text-white">{telemetry?.blocked || "0"}</span>
                  <span className="text-[9px] font-mono text-red-500 uppercase tracking-widest">Breaches Blocked</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="text-emerald-500 mb-2" size={24} />
                  <span className="text-2xl font-bold text-white">{trustScore}%</span>
                  <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Trust Score</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
