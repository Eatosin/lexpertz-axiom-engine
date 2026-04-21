"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { 
  FileText, Lock, Terminal, Zap, ArrowRight, 
  Database, Clock, ShieldCheck, CreditCard 
} from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { UploadZone } from "@/components/vault/upload-zone";

// Framer Motion Variants for staggering the Bento Box load
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const CommandCenterHome = () => {
  const { getToken } = useAuth();
  
  // URL State Router: Setting this instantly transitions the app to the VerificationDashboard
  const [, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));

  // 🚀 SOTA: TanStack Query fetches the Vault History instantly
  const { data: documents, isLoading } = useQuery({
    queryKey: ["vault-history"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return[];
      return api.getHistory(token);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 mins to prevent spamming the DB
  });

  const handleUploadComplete = (filename: string, eta: number) => {
    // Navigating via URL state. The VerificationDashboard will mount, 
    // detect the processing status, and trigger the IngestionOverlay.
    setContexts([filename]);
  };

  const handleInterrogate = (filename: string) => {
    setContexts([filename]);
  };

  return (
    <motion.div 
      className="flex-1 w-full overflow-y-auto custom-scrollbar p-6 md:p-12 lg:p-16"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-brand-primary" size={36} />
            Axiom Command Center
          </h1>
          <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
            Welcome to the Sovereign Auditor. Upload financial or legal evidence to initialize a highly-secure, mathematically-verified multi-agent reasoning circuit.
          </p>
        </motion.div>

        {/* TIER 1: THE INGESTION & BILLING GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Ingestion Dropzone (Takes up 2 columns on desktop) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl flex flex-col justify-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Database size={16} className="text-brand-primary" /> Secure Vault Ingestion
            </h2>
            <UploadZone onUploadComplete={handleUploadComplete} />
          </motion.div>

          {/* Locked Billing/Compute Card */}
          <motion.div variants={itemVariants} className="relative bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col">
            
            {/* The "Coming Soon" Lock Overlay */}
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-4">
                <Lock size={20} className="text-brand-primary" />
              </div>
              <h3 className="text-white font-bold mb-1">Billing & Limits</h3>
              <p className="text-xs text-zinc-400">Payment Gateway Activating Soon</p>
            </div>

            {/* The Dimmed "Future" Content beneath the overlay */}
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
          </motion.div>
        </div>

        {/* TIER 2: THE SOVEREIGN ACADEMY (Terminal Cheat Sheet) */}
        <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <Terminal size={16} className="text-brand-secondary" /> The Sovereign Academy
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
              <p>
                Axiom Engine is not a standard chatbot. It is a precise auditing terminal. 
                You control the AI Agents by prefixing your query with <code className="text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded">/axm</code> commands.
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-brand-primary font-bold w-12 shrink-0">-a</span>
                  <span><strong>Deep Audit:</strong> Doubles retrieval depth. Essential for 50+ page legal documents.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-brand-primary font-bold w-12 shrink-0">-t</span>
                  <span><strong>Table Mode:</strong> Forces the Architect to output perfectly formatted Markdown data grids.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-brand-primary font-bold w-12 shrink-0">-v</span>
                  <span><strong>Verification:</strong> Increases Prosecutor strictness to 90%. Rejects ambiguous evidence.</span>
                </li>
              </ul>
            </div>
            
            {/* Terminal Mockup */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 shadow-inner overflow-hidden">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] font-mono text-zinc-600 ml-2">axiom-terminal ~ bash</span>
              </div>
              <p className="font-mono text-xs md:text-sm text-zinc-300 leading-loose">
                <span className="text-brand-secondary mr-2">❯</span> 
                <span className="text-emerald-400">/axm -a -t -v</span> 
                <br className="md:hidden"/> Extract the Q3 and Q4 revenue for 2025. Build a comparative matrix calculating the YOY variance.
              </p>
            </div>
          </div>
        </motion.div>

        {/* TIER 3: RECENT VAULT LEDGER */}
        <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col">
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
                <table className="w-full text-left border-collapse">
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
                            onClick={() => handleInterrogate(doc.filename)}
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
        </motion.div>

      </div>
    </motion.div>
  );
};
