"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs"; // <--- 1. Import Auth Hook

interface UploadZoneProps {
  onUploadComplete: (filename: string) => void;
}

export const UploadZone = ({ onUploadComplete }: UploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getToken } = useAuth(); // <--- 2. Initialize Token Generator

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      // 3. Retrieve secure JWT from Clerk
      const token = await getToken();
      
      if (!token) {
        throw new Error("Identity Session Expired");
      }

      // 4. Pass both arguments to the bridge
      const result = await api.uploadDocument(file, token);
      
      onUploadComplete(result.filename);
    } catch (error) {
      console.error("Ingestion Failure:", error);
      alert("System Error: Authorization denied or server unreachable.");
    } finally {
      setUploading(false);
    }
  };

  // ... (Rest of component remains identical)
  return (
    <div className="w-full">
      {/* ... keeping your existing UI code ... */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
      {!file ? (
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-zinc-800 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-cyan/50 transition">
          <UploadCloud className="mx-auto mb-4 text-zinc-500" size={32} />
          <h3 className="text-white font-bold">Upload Evidence</h3>
        </div>
      ) : (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
           <p className="text-white mb-4">{file.name}</p>
           <button onClick={handleUpload} disabled={uploading} className="w-full py-3 bg-brand-cyan text-black font-bold rounded-xl disabled:opacity-50">
             {uploading ? "Securing..." : "Initialize Ingestion"}
           </button>
        </div>
      )}
    </div>
  );
};
