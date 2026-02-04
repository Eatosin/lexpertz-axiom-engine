"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

interface UploadZoneProps {
  onUploadComplete: (filename: string) => void;
}

export const UploadZone = ({ onUploadComplete }: UploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getToken } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        alert("Security Protocol: Only PDF formats are accepted.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized: Identity Session Expired");

      console.log("NEURAL LINK: Initiating Ingestion for", file.name);

      const result = await api.uploadDocument(file, token);
      
      console.log("INGESTION SUCCESS:", result.filename);
      onUploadComplete(result.filename);
      
    } catch (error) {
      console.error("❌ INGESTION ERROR:", error);
      alert("Neural Link Failure: Ensure the Inference Engine is 'Running' on Hugging Face.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 text-center transition-all cursor-pointer group hover:border-brand-cyan/40 bg-zinc-900/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileSelect} 
            />
            <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="text-zinc-500 group-hover:text-brand-cyan transition-colors" size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload Evidence Document</h3>
            <p className="text-zinc-500 text-sm">Drag & Drop or Click to Browse (PDF Only)</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-white font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-zinc-500 text-xs">Ready for High-Res Ingestion</p>
                </div>
              </div>
              {!uploading && (
                <button onClick={() => setFile(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition">
                  <X size={20} />
                </button>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-4 bg-brand-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition disabled:opacity-50"
            >
              {uploading ? (
                <>Ingesting... <Loader2 className="animate-spin" size={18} /></>
              ) : (
                <>Initialize Verification Loop <Check size={18} /></>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
