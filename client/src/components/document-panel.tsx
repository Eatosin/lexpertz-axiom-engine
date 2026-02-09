"use client";

import { useState, useEffect } from "react";
import { FileText, Database, ShieldCheck, Clock, Layers, Save, Trash2, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DocumentPanelProps {
  filename: string;
  status: string;
  onDelete: () => void;
  onClose: () => void;
}

export const DocumentPanel = ({ filename, status, onDelete, onClose }: DocumentPanelProps) => {
  const { getToken } = useAuth();
  const [meta, setMeta] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- SOTA: Metadata Sync ---
  useEffect(() => {
    const fetchMetadata = async () => { // FIXED: Renamed from 'fetch' to 'fetchMetadata'
      try {
        const token = await getToken();
        if (!token || !filename) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metadata/${filename}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMeta(data);
        }
      } catch (e) {
        console.error("Vault Link Interrupted:", e);
      }
    };

    fetchMetadata();
  }, [filename, getToken, status]);

  const handleDelete = async () => {
    if (!window.confirm("PERMANENT PURGE: Delete this document and all associated vectors?")) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (token) {
        await api.deleteDocument(filename, token);
        onDelete();
      }
    } catch (e) {
      alert("Purge Failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} 
      animate={{ width: 320, opacity: 1 }} 
      exit={{ width: 0, opacity: 0 }}
      className="h-full bg-card border-r border-border flex flex-col relative overflow-hidden flex-shrink-0"
    >
      {/* Collapse Trigger */}
      <button 
        onClick={onClose} 
        className="absolute right-4 top-4 p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors group"
      >
        <ChevronRight size={18} className="group-hover:text-brand-primary" />
      </button>

      <div className="p-6 space-y-8 mt-4">
        {/* Context Header */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Active Context</h3>
          <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
            <FileText className="text-brand-primary mb-2" size={20} />
            <p className="text-sm font-bold text-white truncate">{filename}</p>
            <p className="text-[10px] text-brand-secondary font-mono mt-1 uppercase italic">
              {meta?.status === 'indexed' ? 'Vault: Synced' : 'Status: ' + status}
            </p>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><Layers size={14} className="text-brand-secondary" /> Chunks</span>
              <span className="text-foreground font-mono">{meta?.chunk_count || "--"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><Database size={14} className="text-brand-secondary" /> Engine</span>
              <span className="text-foreground font-mono">Docling 2.0</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><Save size={14} className="text-brand-primary" /> Persistence</span>
              <span className={cn("font-bold px-2 py-0.5 rounded text-[10px]", meta?.is_permanent ? "bg-brand-primary/10 text-brand-primary" : "bg-zinc-800 text-zinc-500")}>
                {meta?.is_permanent ? "SAVED" : "TEMPORARY"}
              </span>
            </div>
          </div>
        </div>

        {/* Control Suite */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Control Suite</h3>
          <button 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold uppercase tracking-widest"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {isDeleting ? "Purging..." : "Delete Document"}
          </button>
        </div>
      </div>

      <div className="mt-auto p-4 m-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
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
