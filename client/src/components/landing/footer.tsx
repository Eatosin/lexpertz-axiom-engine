"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ShieldCheck, X, Code2, Briefcase, Globe, Cpu, Database, Server 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  // Infinite diagnostic ticker logs
  useEffect(() => {
    setTelemetryLogs([
      "SEC_AUDIT_OK [0x5E] //",
      "HNSW_VEC_SYNC: ONLINE //",
      "LLAMA_3.3_JUDGE_SCORE: 1.00 //",
      "DEEPSEEK_PROSECUTOR_GATE: SECURE //",
      "RECURSIVE_GRAPH_RUN: PASS //",
      "NVIDIA_NIM_LATENCY: 2.4s //",
      "MCP_LOCAL_BRIDGE_STABLE //",
      "AES_256_WAITLIST_SHIELD: ACTIVE"
    ]);
  }, []);

  return (
    <footer className="relative bg-magnesium-deck border-t border-black pt-16 pb-10 px-6 overflow-hidden z-20">
      
      {/* Heavy shadow groove separator at the footer entry */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-black shadow-groove" />
      <div className="absolute inset-x-0 top-[2px] border-t border-white/[0.04] pointer-events-none" />

      {/* Subtle industrial background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-brand-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        
        {/* --- 1. THE LIVE TELEMETRY MARQUEE TICKER --- */}
        <div className="w-full bg-[#050607] border border-zinc-900 rounded-xl py-3.5 px-4 overflow-hidden relative shadow-groove flex items-center gap-4">
          <div className="absolute inset-0 screen-glare pointer-events-none z-10" />
          
          <div className="flex items-center gap-1.5 shrink-0 bg-black/60 border border-zinc-850 px-2.5 py-1 rounded-md text-[8px] font-mono text-brand-primary tracking-wider uppercase relative z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-led-green animate-pulse" />
            <span>LIVE_TRACES</span>
          </div>

          {/* Marquee loop */}
          <div className="w-full overflow-hidden whitespace-nowrap relative z-10 select-none">
            <motion.div 
              className="inline-flex gap-8 text-[9px] font-mono text-zinc-500 uppercase tracking-[0.15em]"
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
            >
              {/* Double arrays to prevent empty wrapping gaps */}
              {[...telemetryLogs, ...telemetryLogs, ...telemetryLogs].map((log, index) => (
                <span key={index} className={cn(log.includes("OK") || log.includes("SECURE") ? "text-brand-primary/80 font-bold" : "")}>
                  {log}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* --- 2. MULTI-BAY PARTITIONS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-4">
          
          {/* Bay A: Brand Panel (Spans 4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-3 text-white font-extrabold tracking-tighter text-lg group">
              <div className="w-9 h-9 rounded-xl bg-[#090a0b] border-beveled shadow-groove flex items-center justify-center group-hover:border-brand-primary/40 transition-colors">
                <ShieldCheck className="text-brand-primary filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" size={20} />
              </div>
              <span>Axiom Engine</span>
            </Link>
            
            <p className="text-zinc-500 text-[11px] leading-relaxed max-w-xs font-mono">
              The world’s first Evidence-Gated Agentic Engine [1]. Optimized to detect legal, financial, and code alignment contradictions in real-time [1].
            </p>

            <div className="flex items-center gap-3">
              {[
                { icon: X, href: "#", label: "X (Twitter)" },
                { icon: Code2, href: "https://github.com/Eatosin", label: "GitHub" },
                { icon: Briefcase, href: "#", label: "LinkedIn" }
              ].map((social, idx) => (
                <Link 
                  key={idx}
                  href={social.href} 
                  aria-label={social.label}
                  title={social.label}
                  className="w-8 h-8 rounded-lg bg-black border border-zinc-900 hover:border-zinc-750 flex items-center justify-center text-zinc-650 hover:text-white transition-all shadow-groove"
                >
                  <social.icon size={14} />
                </Link>
              ))}
            </div>
          </div>

          {/* Bay B: Navigation Matrix Column (Spans 2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <h5 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.25em] font-black block border-l-2 border-brand-primary pl-2.5">
              Platform
            </h5>
            <ul className="flex flex-col gap-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <li><Link href="#architecture" className="hover:text-brand-primary transition-colors">The Engine</Link></li>
              <li><Link href="#pricing" className="hover:text-brand-primary transition-colors">Workspace</Link></li>
              <li><Link href="#pricing" className="hover:text-brand-primary transition-colors">Sovereign Vault</Link></li>
            </ul>
          </div>

          {/* Bay C: Navigation Matrix Column (Spans 2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <h5 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.25em] font-black block border-l-2 border-[#0ea5e9] pl-2.5">
              Company
            </h5>
            <ul className="flex flex-col gap-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              <li><Link href="#" className="hover:text-brand-primary transition-colors">About Lexpertz</Link></li>
              <li><Link href="#" className="hover:text-brand-primary transition-colors">Contact Sales</Link></li>
              <li><Link href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Bay D: Compliance Chip Array Panel (Spans 4 cols) */}
          <div className="md:col-span-4 space-y-4 bg-black/30 p-5 rounded-2xl border border-white/[0.01] shadow-groove relative">
            <span className="absolute top-2 right-2 text-[6px] font-mono text-zinc-700 uppercase">CHIP_SET_COMP_01</span>
            
            <h5 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.25em] font-black block">
              Sovereign Compliance Seals
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-2 pt-2">
              {[
                { label: "SOC 2 TYPE II", led: "bg-brand-primary shadow-led-green" },
                { label: "GDPR COMPLIANT", led: "bg-brand-secondary shadow-led-blue" },
                { label: "ISO 27001 SECURE", led: "bg-purple-500 shadow-led-blue" }
              ].map((badge, idx) => (
                <div 
                  key={idx} 
                  className="px-3 py-2 bg-[#090a0b] border-beveled rounded-lg flex items-center justify-between group shadow-groove"
                >
                  <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {badge.label}
                  </span>
                  <span className={cn("w-1.5 h-1.5 rounded-full", badge.led)} />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* --- 3. SYSTEM BOTTOM STATUS BAR --- */}
        <div className="pt-8 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em]">
            Lexpertz AI Ecosystem © {currentYear} • Standard AI Guesses, Axiom Proves. [1]
          </div>
          
          <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] bg-[#050607] px-4 py-2 rounded-lg border border-zinc-900 shadow-groove">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-led-green animate-pulse" />
              <span className="text-zinc-500">Status: Operational</span>
            </div>
            <span className="text-zinc-800">|</span>
            <div className="flex items-center gap-1 text-zinc-500">
              <Globe size={11} className="text-zinc-600" /> 
              <span>Uplink Secure</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
