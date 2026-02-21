"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Database, 
  Layers, 
  Plus, 
  Trash2, 
  Loader2, 
  ChevronRight, 
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

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
  const [isSaving, setIsSaving] = useState(false);

  // Sync Metadata on filename or status changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchMetadata = async () => {
      if (!filename) return;
      try {
        const token = await getToken();
        if (token && isMounted) {
          const data = await api.getMetadata(filename, token);
          setMeta(data);
        }
      } catch (err) {
        console.error("Axiom Meta Error:", err);
      }
    };

    fetchMetadata();
    return () => { isMounted = false; };
  }, [filename, getToken, status]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = await getToken();
      if (token) {
        await api.saveToVault(filename, token);
        // Optimistic UI update
        setMeta((prev: any) => ({ ...prev, is_permanent: true }));
      }
    } catch (error) {
      console.error("Axiom Vault Error:", error);
      alert("Persistence Failure: Could not commit to vault.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} 
      animate={{ width: 320, opacity: 1 }} 
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="h-full bg-card border-r border-border flex flex-col relative overflow-hidden flex-shrink-0"
    >
      {/* Close Toggle */}
      <button 
        onClick={onClose} 
        className="absolute right-4 top-4 p-1.5 hover:bg-white/5 rounded-md text-zinc-500 transition-colors group z-10"
      >
        <ChevronRight size={18} className="group-hover:text-brand-secondary" />
      </button>

      <div className="p-6 space-y-8 mt-6 overflow-y-auto custom-scrollbar">
        {/* Header Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={12} className="text-brand-primary" /> Active Context
          </h3>
          <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20 group hover:border-brand-primary/40 transition-colors">
            <FileText className="text-brand-primary mb-2" size={20} />
            <p className="text-sm font-bold text-white truncate" title={filename}>{filename}</p>
          </div>
        </div>

        {/* Specifications List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Layers size={14} className="text-brand-secondary" /> Chunks
              </span>
              <span className="text-foreground font-mono bg-white/5 px-2 py-0.5 rounded">
                {meta?.chunk_count !== undefined ? meta.chunk_count : "--"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Database size={14} className="text-brand-secondary" /> Engine
              </span>
              <span className="text-foreground font-mono">
                {meta?.engine || "Docling 2.0"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Suite */}
        <div className="space-y-3 pt-4 border-t border-border">
          {meta?.is_permanent ? (
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }}
               className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-emerald-500/5"
             >
                <CheckCircle2 size={14} /> Persisted in Vault
             </motion.div>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={isSaving || status === "processing"}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-black px-4 py-3 rounded-xl text-xs font-bold uppercase hover:opacity-90 transition active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Save to Library
            </button>
          )}

          <button 
            onClick={async () => {
              if(!confirm("Purge document from Axiom Vault? This action is irreversible.")) return;
              try {
                setIsDeleting(true);
                const token = await getToken();
                if(token) { 
                  await api.deleteDocument(filename, token); 
                  onDelete(); 
                }
              } catch (error) {
                console.error("Purge Error:", error);
                alert("Deletion Denied: System error.");
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-bold uppercase hover:bg-red-500/5 transition flex justify-center items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            Delete Document
          </button>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-auto p-4 m-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
         <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-tighter text-center">
            Axiom Gating Logic Active.<br/>High-fidelity evidence verification enforced.
         </p>
      </div>
    </motion.div>
  );
};
