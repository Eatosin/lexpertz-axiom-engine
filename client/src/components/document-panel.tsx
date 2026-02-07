"use client";

import { useState, useEffect } from "react";
import { FileText, Database, ShieldCheck, Clock, Layers, Save, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DocumentPanelProps {
  filename: string;
  status: string;
  onDelete?: () => void;
}

export const DocumentPanel = ({ filename, status, onDelete }: DocumentPanelProps) => {
  const { getToken } = useAuth();
  const [meta, setMeta] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metadata/${filename}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMeta(await res.json());
      } catch (e) { console.error(e); }
    };
    if (filename) fetchMeta();
  }, [filename, getToken, status]);

  const handleDelete = async () => {
    if (!window.confirm("PERMANENT PURGE: Delete this document and all vectors?")) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (token) {
        await api.deleteDocument(filename, token);
        if (onDelete) onDelete();
      }
    } catch (e) { alert("Purge Failed."); } finally { setIsDeleting(false); }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="w-full md:w-80 flex-shrink-0 bg-card border-r border-border p-6 space-y-8 hidden md:flex flex-col relative"
    >
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Active Context</h3>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
          <FileText className="text-brand-primary shrink-0" size={20} />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground truncate">{filename}</p>
            <p className="text-[10px] text-brand-primary font-mono mt-1 uppercase italic animate-pulse">
              {meta?.status === 'indexed' ? 'Vault: Synced' : 'Status: ' + status}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Live Specifications</h3>
        <div className="space-y-3">
          {/* Chunks: Secondary (Blue) for Data volume */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Layers size={14} className="text-brand-secondary" /> Chunks</span>
            <span className="text-foreground font-mono">{meta?.chunk_count || "--"}</span>
          </div>
          {/* Engine: Secondary (Blue) for Technology */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Database size={14} className="text-brand-secondary" /> Engine</span>
            <span className="text-foreground font-mono">Docling 2.0</span>
          </div>
          {/* Persistence: Primary (Green) for Active Saving */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-2"><Save size={14} className="text-brand-primary" /> Persistence</span>
            <span className={cn("font-bold px-2 py-0.5 rounded text-[10px]", meta?.is_permanent ? "bg-brand-primary/10 text-brand-primary" : "bg-zinc-800 text-zinc-500")}>
              {meta?.is_permanent ? "SAVED" : "TEMPORARY"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Control Suite</h3>
        <button 
          onClick={handleDelete} disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold uppercase tracking-widest"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {isDeleting ? "Purging..." : "Delete Document"}
        </button>
      </div>

      {/* Footer Decoration using Accent (Dark Green) */}
      <div className="mt-auto p-4 rounded-xl bg-brand-accent/5 border border-brand-primary/10">
         <div className="flex items-start gap-2">
            <ShieldCheck size={12} className="text-brand-primary mt-0.5" />
            <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-tighter">
              Axiom Gating Protocol Active. High-fidelity verification enforced.
            </p>
         </div>
      </div>
    </motion.div>
  );
};
