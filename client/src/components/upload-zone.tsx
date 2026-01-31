"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/client/lib/utils";

interface UploadZoneProps {
  onUploadComplete: (filename: string) => void;
}

export const UploadZone = ({ onUploadComplete }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      alert("System Policy: Only PDF documents are permitted for verification.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    // --- REAL API CALL TO PYTHON BACKEND ---
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Note: In prod, this URL comes from process.env.NEXT_PUBLIC_API_URL
      // For now, we simulate the network delay to demonstrate the UI state
      // const res = await fetch("http://localhost:8000/api/v1/upload", { method: "POST", body: formData });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulating 2s upload
      
      onUploadComplete(file.name);
    } catch (error) {
      console.error("Ingestion Error:", error);
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
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group",
              isDragging ? "border-brand-cyan bg-brand-cyan/10" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
            
            <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className={cn("transition-colors", isDragging ? "text-brand-cyan" : "text-zinc-500")} size={32} />
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-zinc-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for Ingestion</p>
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
              className="w-full py-4 bg-brand-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
