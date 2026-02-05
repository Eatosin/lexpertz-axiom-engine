"use client";

import { FileText, Database, ShieldCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface DocumentPanelProps {
  filename: string;
}

export const DocumentPanel = ({ filename }: DocumentPanelProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      className="w-full md:w-80 flex-shrink-0 bg-zinc-900/50 border-r border-border p-6 space-y-8 hidden md:flex flex-col"
    >
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Active Context</h3>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20">
          <FileText className="text-brand-cyan shrink-0" size={20} />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{filename}</p>
            <p className="text-[10px] text-brand-cyan font-mono mt-1 uppercase italic">Vault: production_v1</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Specifications</h3>
        <div className="space-y-3">
          {[
            { label: "Engine", val: "Docling 2.0", icon: Database },
            { label: "Security", val: "JWT-Gated", icon: ShieldCheck },
            { label: "State", val: "Indexed", icon: Clock },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 flex items-center gap-2">
                <item.icon size={14} /> {item.label}
              </span>
              <span className="text-zinc-300 font-mono">{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-4 rounded-xl bg-zinc-950/50 border border-border">
         <p className="text-[10px] text-zinc-600 leading-relaxed uppercase tracking-tighter">
           Axiom Evidence-Gating maps model tokens to verified structural coordinates.
         </p>
      </div>
    </motion.div>
  );
};
