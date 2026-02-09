"use client";

import { useState, useEffect } from "react";
import { FileText, Database, ShieldCheck, Clock, Layers, Save, Trash2, Loader2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const DocumentPanel = ({ filename, status, onDelete, onClose }: { filename: string, status: string, onDelete: () => void, onClose: () => void }) => {
  const { getToken } = useAuth();
  const [meta, setMeta] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (token && filename) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/metadata/${filename}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMeta(await res.json());
      }
    };
    fetch();
  }, [filename, getToken, status]);

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      className="h-full bg-card border-r border-border flex flex-col relative overflow-hidden"
    >
      <button onClick={onClose} className="absolute right-4 top-4 p-1 hover:bg-white/5 rounded-md text-zinc-500">
        <ChevronRight size={18} />
      </button>

      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Context</h3>
          <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
            <FileText className="text-brand-primary mb-2" size={20} />
            <p className="text-sm font-bold text-white truncate">{filename}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Metadata</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Chunks</span>
              <span className="text-brand-secondary font-mono">{meta?.chunk_count || "--"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Engine</span>
              <span className="text-brand-secondary font-mono">Docling 2.0</span>
            </div>
          </div>
        </div>

        <button 
          onClick={async () => {
            if(!confirm("Purge document?")) return;
            setIsDeleting(true);
            const token = await getToken();
            if(token) { await api.deleteDocument(filename, token); onDelete(); }
            setIsDeleting(false);
          }}
          className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 text-xs font-bold uppercase hover:bg-red-500/5 transition"
        >
          {isDeleting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Delete Document"}
        </button>
      </div>
    </motion.div>
  );
};
