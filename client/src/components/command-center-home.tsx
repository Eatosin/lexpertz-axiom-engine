"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, ShieldCheck, Zap, Database, ArrowRight, 
  Activity, Layers, X, Target, FileText, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { UploadZone } from "./upload-zone";
import { api, VaultSearchResult } from "@/lib/api";

export function CommandCenterHome() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [, setContext] = useQueryState("context");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);

  // Telemetry State
  const [telemetry, setTelemetry] = useState<any>({
    chunks: "--", blocked: "--", persistence: "--", latency: "--",
    ragas: { faithfulness: 0, precision: 0, relevance: 0 }
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const token = await getToken();
        if (token && isMounted) {
          const data = await api.getTelemetry(token);
          if (data && data.chunks) setTelemetry(data);
        }
      } catch (e) { console.error("Telemetry failed", e); }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [getToken]);

  const handleUploadComplete = (filename: string) => {
    setIsModalOpen(false);
    setContext(filename);
  };

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const token = await getToken();
      if (token) {
        const results = await api.searchVault(searchQuery, token);
        setSearchResults(results);
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const QuickAction = ({ icon: Icon, title, desc, color, onClick }: any) => (
    <button onClick={onClick} className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-brand-primary/30 transition-all text-left overflow-hidden w-full">
      <div className={cn("mb-4 p-3 rounded-2xl w-fit transition-colors", color)}><Icon size={24} /></div>
      <h3 className="text-white font-bold mb-1">{title}</h3>
      <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
      <ArrowRight className="absolute right-6 bottom-6 text-zinc-700 group-hover:text-brand-primary transition-colors" size={18} />
    </button>
  );

  const RagasBar = ({ label, value, color }: any) => {
    const percentage = Math.round((value || 0) * 100);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono uppercase tracking-widest text-zinc-400">
          <span>{label}</span><span className="text-white">{percentage}%</span>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full", color)} />
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full p-6 md:p-10 space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">System Overview</h2>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
              Welcome back, <span className="text-brand-primary">{user?.firstName || "Auditor"}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <Activity size={16} className="text-brand-primary animate-pulse" />
            <span className="text-xs font-mono text-brand-primary uppercase font-bold tracking-widest">Axiom Gating: Optimal</span>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickAction icon={Plus} title="New Evidence Audit" desc="Ingest and vectorize new documents via Docling V2." color="bg-emerald-500/10 text-emerald-500" onClick={() => setIsModalOpen(true)} />
          <QuickAction icon={Search} title="Interrogate Vault" desc="Semantic search across all your persisted documents." color="bg-sky-500/10 text-sky-500" onClick={() => setIsSearchOpen(true)} />
          <QuickAction icon={ShieldCheck} title="Security Analysis" desc="Review hallucination scores and RAGAS benchmarks." color="bg-purple-500/10 text-purple-500" onClick={() => setIsSecurityOpen(true)} />
        </div>

        {/* Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[{ label: "Total Chunks", value: telemetry.chunks, icon: Layers }, { label: "Hallucinations Blocked", value: telemetry.blocked, icon: Zap }, { label: "Vault Persistence", value: telemetry.persistence, icon: Database }, { label: "Avg Latency", value: telemetry.latency, icon: Activity }].map((stat, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 hover:border-white/10 transition-colors">
                 <div className="flex items-center gap-2 text-zinc-500 uppercase font-mono text-[9px] tracking-widest"><stat.icon size={12} /> {stat.label}</div>
                 <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
              </div>
           ))}
        </div>

        {/* Guidance Card */}
        <div className="p-8 rounded-[40px] bg-gradient-to-br from-brand-primary/20 to-brand-secondary/5 border border-brand-primary/20 flex flex-col md:flex-row items-center gap-8">
            <div className="h-24 w-24 rounded-3xl bg-zinc-950 flex items-center justify-center border border-white/10 shrink-0">
               <ShieldCheck size={48} className="text-brand-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Advanced RAG Best Practices</h3>
              <p className="text-zinc-400 text-sm max-w-xl">
                 Learn how the Architect Node uses the Python REPL to verify mathematical claims in your documents. 
                 Our evidence-gating prevents 99% of LLM hallucinations.
              </p>
              <button className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase tracking-widest mt-4 group">
                 Read Documentation <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
        </div>
      </motion.div>

      {/* --- OVERLAYS --- */}
      <AnimatePresence>
        
        {/* 1. UPLOAD MODAL */}
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[32px] p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6">
                <div className="space-y-1"><h3 className="text-lg font-bold text-white">Secure Evidence Ingestion</h3></div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white"><X size={20} /></button>
              </div>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </motion.div>
          </motion.div>
        )}

        {/* 2. SECURITY MODAL */}
        {isSecurityOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsSecurityOpen(false)}>
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-zinc-950 border border-brand-primary/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-primary/20 blur-[100px] pointer-events-none" />
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3"><ShieldCheck className="text-brand-primary" size={28} /><h3 className="text-2xl font-bold text-white tracking-tight">Global Security Analysis</h3></div>
                    <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest">Aggregate RAGAS Telemetry (Llama 3.3 Judge)</p>
                  </div>
                  <button onClick={() => setIsSecurityOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>
                <div className="space-y-8 relative z-10">
                   <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
                      <RagasBar label="Average Faithfulness" value={telemetry?.ragas?.faithfulness} color="bg-emerald-500" />
                      <RagasBar label="Average Context Precision" value={telemetry?.ragas?.precision} color="bg-sky-500" />
                      <RagasBar label="Average Answer Relevance" value={telemetry?.ragas?.relevance} color="bg-purple-500" />
                   </div>
                   {/* Restored Target and Zap Icons */}
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                         <Zap size={20} className="mx-auto text-red-500 mb-2" />
                         <p className="text-2xl font-bold text-red-500">{telemetry.blocked}</p>
                         <p className="text-[10px] text-red-500/70 uppercase font-mono tracking-widest mt-1">Breaches Blocked</p>
                      </div>
                      <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-center">
                         <Target size={20} className="mx-auto text-brand-primary mb-2" />
                         <p className="text-2xl font-bold text-brand-primary">
                            {telemetry?.ragas?.faithfulness ? Math.round(telemetry.ragas.faithfulness * 100) : 0}%
                         </p>
                         <p className="text-[10px] text-brand-primary/70 uppercase font-mono tracking-widest mt-1">Trust Score</p>
                      </div>
                   </div>
                </div>
             </motion.div>
           </motion.div>
        )}

        {/* 3. COMMAND PALETTE (INTERROGATE VAULT) */}
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[10vh]"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} 
              className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center px-4 border-b border-zinc-800">
                <Search size={24} className="text-brand-secondary shrink-0" />
                <input 
                  autoFocus placeholder="Interrogate across all persisted vault documents..."
                  className="w-full bg-transparent text-white text-lg px-4 py-6 outline-none placeholder:text-zinc-600"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                />
                {isSearching ? (
                  <Loader2 className="animate-spin text-brand-primary" size={24} />
                ) : (
                  <button onClick={executeSearch} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-lg transition-colors">
                    Search
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {searchResults.length === 0 && !isSearching && (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    Enter a query and hit Search to scan the Hybrid Matrix.
                  </div>
                )}
                
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setContext(result.filename); // Instantly routes to the specific document
                    }}
                    className="w-full text-left p-4 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/10 mb-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-brand-primary font-mono text-xs uppercase tracking-widest">
                        {/* Correctly using FileText for document provenance */}
                        <FileText size={14} />
                        {result.filename}
                      </div>
                      <div className="px-2 py-1 rounded bg-brand-secondary/10 text-brand-secondary text-[10px] font-bold">
                        Score: {Math.round(result.similarity * 100)}%
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                      {result.content}
                    </p>
                  </button>
                ))}
              </div>
              
              <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <span>Vector + Keyword Hybrid Search Active</span>
                <span>Click result to load workspace</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
        }
