"use client";

import { useState, useEffect } from "react";
import { FileText, Database, ShieldCheck, Clock, Layers, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";

interface DocumentPanelProps {
  filename: string;
  status: string; // "idle" | "ingesting" | "ready" | ...
}

export const DocumentPanel = ({ filename, status }: DocumentPanelProps) => {
  const { getToken } = useAuth();
  const [meta, setMeta] = useState<any>(null);

  // --- SOTA: Live Metadata Sync ---
  // Fetches real chunk counts and persistence status from Supabase
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Direct fetch to the new metadata endpoint
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metadata/${filename}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMeta(data);
        }
      } catch (e) {
        console.error("Metadata Sync Failed:", e);
      }
    };

    if (filename) fetchMeta();
  }, [filename, getToken, status]); // Refetch if status changes

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}
      className="w-full md:w-80 flex-shrink-0 bg-card border-r border-border p-6 space-y-8 hidden md:flex flex-col"
    >
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Active Context</h3>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
          <FileText className="text-brand-primary shrink-0" size={20} />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate">{filename}</p>
            <p className="text-[10px] text-brand-primary font-mono mt-1 uppercase italic">
              {meta?.status === 'indexed' ? 'Vault: Synced' : 'Processing...'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Live Specifications</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Layers size={14} /> Chunks</span>
            <span className="text-foreground font-mono">{meta?.chunk_count || "--"}</span>
          </div>
           <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Database size={14} /> Engine</span>
            <span className="text-foreground font-mono">Docling 2.0</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Save size={14} /> Persistence</span>
            <span className={meta?.is_permanent ? "text-brand-primary font-bold" : "text-zinc-500"}>
              {meta?.is_permanent ? "SAVED" : "TEMPORARY"}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Clock size={14} /> Indexed</span>
            <span className="text-foreground font-mono">
                {meta?.created_at ? new Date(meta.created_at).toLocaleDateString() : "--"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 rounded-xl bg-secondary/30 border border-border">
         <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tighter">
           Axiom Evidence-Gating maps model tokens to verified structural coordinates.
         </p>
      </div>
    </motion.div>
  );
};
