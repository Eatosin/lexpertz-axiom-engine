"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUploadComplete: (filename: string, estimatedSeconds: number) => void;
}

export const UploadZone = ({ onUploadComplete }: UploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const[isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      alert("Security Protocol: Only PDF formats are accepted.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      alert("Payload too large. Maximum file size is 50MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); },[]);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); },[]);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) validateAndSetFile(e.dataTransfer.files[0]);
  },[]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized");

      // SOTA ETA MATH: 15 seconds per MB + 10s baseline
      const sizeInMB = file.size / (1024 * 1024);
      const calculatedETA = Math.ceil((sizeInMB * 15) + 10);

      const result = await api.uploadDocument(file, token);
      onUploadComplete(result.filename, calculatedETA);
      
    } catch (error) {
      console.error("❌ INGESTION ERROR:", error);
      alert("Neural Link Failure: Vault API is unreachable.");
      setUploading(false); 
    } 
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group relative overflow-hidden",
              isDragging ? "border-brand-primary bg-brand-primary/10 scale-[1.02]" : "border-white/10 hover:border-brand-primary/40 bg-white/5"
            )}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
            <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all relative z-10",
              isDragging ? "bg-brand-primary text-black scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/5 border border-white/10 text-zinc-500 group-hover:text-brand-primary group-hover:bg-brand-primary/10 group-hover:scale-110"
            )}>
              <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">{isDragging ? "Drop to Secure Vault" : "Upload Evidence Document"}</h3>
            <p className="text-zinc-500 text-sm relative z-10">Drag & Drop or Click to Browse (PDF Only)</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0">
                  <FileText size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">{uploading ? "Transmitting Bytes..." : "Ready for Ingestion"}</p>
                </div>
              </div>
              {!uploading && (
                <button onClick={() => setFile(null)} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition shrink-0"><X size={20} /></button>
              )}
            </div>
            {uploading ? (
              <div className="w-full py-4 bg-zinc-950 border border-white/5 text-zinc-400 font-bold rounded-xl flex items-center justify-center gap-3 relative z-10">
                <Loader2 className="animate-spin text-brand-primary" size={18} />
                <span className="uppercase tracking-widest text-[10px] text-brand-primary">Transmitting to Node...</span>
              </div>
            ) : (
              <button onClick={handleUpload} className="w-full py-4 bg-brand-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition active:scale-[0.98] relative z-10">
                Initialize Verification Loop <ShieldCheck size={18} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
