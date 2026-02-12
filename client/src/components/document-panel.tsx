"use client";

import { useState, useEffect } from "react";
import { FileText, Database, ShieldCheck, Layers, Save, Trash2, Loader2, ChevronRight, Plus, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const DocumentPanel = ({ filename, status, onDelete, onClose }: any) => {
  const { getToken } = useAuth();
  const [meta, setMeta] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (token && filename) {
        const data = await api.getMetadata(filename, token);
        setMeta(data);
      }
    };
    fetch();
  }, [filename, getToken, status]);

  const handleSave = async () => {
    setIsSaving(true);
    const token = await getToken();
    if (token) {
        await api.saveToVault(filename, token);
        setMeta({ ...meta, is_permanent: true });
    }
    setIsSaving(false);
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      className="h-full bg-card border-r border-border flex flex-col relative overflow-hidden flex-shrink-0"
    >
      <button onClick={onClose} className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-md text-zinc-500 transition-colors group">
        <ChevronRight size={18} className="group-hover:text-brand-secondary" />
      </button>

      <div className="p-6 space-y-8 mt-6">
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Active Context</h3>
          <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
            <FileText className="text-brand-primary mb-2" size={20} />
            <p className="text-sm font-bold text-white truncate">{filename}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><Layers size={14} className="text-brand-secondary" /> Chunks</span>
              <span className="text-foreground font-mono">{meta?.chunk_count || "--"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><Database size={14} className="text-brand-secondary" /> Engine</span>
              <span className="text-foreground font-mono">Docling 2.0</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          {/* PERSISTENCE LOGIC: Hide button if already permanent */}
          {meta?.is_permanent ? (
             <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 size={14} /> Persisted in Vault
             </div>
          ) : (
            <button 
              onClick={handleSave} disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-black px-4 py-3 rounded-xl text-xs font-bold uppercase hover:opacity-90 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Save to Library
            </button>
          )}

          <button 
            onClick={async () => {
              if(!confirm("Purge document?")) return;
              setIsDeleting(true);
              const token = await getToken();
              if(token) { await api.deleteDocument(filename, token); onDelete(); }
              setIsDeleting(false);
            }}
            className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-bold uppercase hover:bg-red-500/5 transition flex justify-center items-center gap-2"
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 size={14} />}
            Delete Document
          </button>
        </div>
      </div>

      <div className="mt-auto p-4 m-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
         <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-tighter">
            Axiom Gating Logic Active. High-fidelity verification enforced.
         </p>
      </div>
    </motion.div>
  );
};
