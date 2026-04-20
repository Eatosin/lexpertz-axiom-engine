"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, FileText, Database, Calendar, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DocumentPanelProps {
  filename: string;
  status: string;
  onDelete: () => void;
  onClose: () => void;
}

export const DocumentPanel = ({ filename, status, onDelete, onClose }: DocumentPanelProps) => {
  const { getToken } = useAuth();
  const[isDeleting, setIsDeleting] = useState(false);

  // TanStack Query Replaces useEffect
  // This automatically fetches, caches, and updates the UI without race conditions.
  const { data: metadata, isLoading, isError } = useQuery({
    queryKey: ["document-metadata", filename],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized");
      return api.getMetadata(filename, token);
    },
    // Only fetch if we have a filename and it's fully indexed
    enabled: !!filename && status === "ready",
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleDelete = async () => {
    const confirmed = window.confirm(`SECURITY WARNING: Are you sure you want to permanently purge ${filename} and all its vectors from the Sovereign Vault?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      if (token) {
        await api.deleteDocument(filename, token);
        onDelete(); // Triggers the dashboard to clear the URL state
      }
    } catch (error) {
      console.error("Deletion failed:", error);
      alert("Failed to purge document from vault.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-md border-l border-white/5">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 bg-zinc-950">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-brand-primary shrink-0" />
          <h3 className="text-sm font-bold text-white truncate">{filename}</h3>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* SOTA: INTELLIGENCE METADATA */}
      <div className="p-4 border-b border-white/5 shrink-0 bg-zinc-900/20">
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Vault Telemetry</h4>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-brand-primary">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : isError || !metadata ? (
          <div className="flex items-center gap-2 text-red-400 text-xs py-2">
            <ShieldAlert size={14} /> Failed to load telemetry.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Chunk Density */}
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                <Database size={10} /> Vector Chunks
              </span>
              <span className="text-lg font-bold text-white">{metadata.chunk_count || 0}</span>
            </div>
            
            {/* Timestamp */}
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                <Calendar size={10} /> Indexed
              </span>
              <span className="text-xs font-medium text-white mt-1">
                {metadata.created_at ? new Date(metadata.created_at).toLocaleDateString() : "Unknown"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PDF VIEWER FALLBACK / PLACEHOLDER */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <FileText size={32} className="text-zinc-600" />
        </div>
        <h4 className="text-white font-bold mb-1">Document Secured</h4>
        <p className="text-xs text-zinc-500 max-w-[200px] mb-6">
          The raw PDF is encrypted in the Sovereign Vault. The engine is interrogating the vectorized data matrix.
        </p>

        {/* DANGER ZONE */}
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {isDeleting ? "Purging..." : "Purge Document"}
        </button>
      </div>

    </div>
  );
};
