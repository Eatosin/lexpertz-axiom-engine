"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Check, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

interface UploadZoneProps {
  onUploadComplete: (filename: string) => void;
}

export const UploadZone = ({ onUploadComplete }: UploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getToken } = useAuth();

  // Reset progress when file is cleared
  useEffect(() => {
    if (!file) setProgress(0);
  }, [file]);

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

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90; // Wait at 90% for actual server response
        }
        // Random increment to feel "alive"
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 300);
    return interval;
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const progressInterval = simulateProgress();

    try {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized: Identity Session Expired");

      console.log("NEURAL LINK: Initiating Ingestion for", file.name);

      // Perform the actual upload
      const result = await api.uploadDocument(file, token);
      
      // Success! Finish the bar
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log("INGESTION SUCCESS:", result.filename);
      
      // Small delay to let the user see the 100% Green State before switching views
      setTimeout(() => {
        onUploadComplete(result.filename);
      }, 800);
      
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error("❌ INGESTION ERROR:", error);
      alert("Neural Link Failure: Ensure the Inference Engine is 'Running' on Hugging Face.");
    } finally {
      if (progress < 100) setUploading(false); // Only reset if failed
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
            className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center transition-all cursor-pointer group hover:border-brand-primary/40 bg-white/5 relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileSelect} 
            />
            
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-brand-primary/10 transition-all relative z-10">
              <UploadCloud className="text-zinc-500 group-hover:text-brand-primary transition-colors" size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Upload Evidence Document</h3>
            <p className="text-zinc-500 text-sm relative z-10">Drag & Drop or Click to Browse (PDF Only)</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden"
          >
            {/* Success Glow Background */}
            {progress === 100 && (
               <div className="absolute inset-0 bg-emerald-500/10 z-0 animate-pulse" />
            )}

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                  {progress === 100 ? <Check size={24} /> : <FileText size={24} />}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">
                    {progress === 100 ? "Transmission Complete" : "Ready for Ingestion"}
                  </p>
                </div>
              </div>
              {!uploading && (
                <button onClick={() => setFile(null)} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition shrink-0">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* The Dynamic Action Area */}
            {uploading ? (
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-brand-primary">
                  <span>
                    {progress < 30 ? "Securing Link..." : progress < 70 ? "Transmitting Bytes..." : progress < 100 ? "Finalizing..." : "Success"}
                  </span>
                  <span>{progress}%</span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeInOut" }}
                    className="h-full bg-brand-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                className="w-full py-4 bg-brand-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition active:scale-[0.98] relative z-10"
              >
                Initialize Verification Loop <ShieldCheck size={18} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
