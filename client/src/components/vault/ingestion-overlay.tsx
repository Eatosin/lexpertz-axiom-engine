"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface IngestionOverlayProps {
  filename: string;
  estimatedSeconds: number;
}

export const IngestionOverlay = ({ filename, estimatedSeconds }: IngestionOverlayProps) => {
  const [timeLeft, setTimeLeft] = useState(estimatedSeconds);
  const [notifyGranted, setNotifyGranted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const requestNotification = () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support desktop notifications.");
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") setNotifyGranted(true);
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-md w-full">
        
        {/* SOTA: The "Axiom Auditor" Animation */}
        <div className="relative w-48 h-48 mb-8">
          <motion.div 
            animate={{ scale:[1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-brand-primary rounded-full blur-3xl"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText size={80} className="text-zinc-800" strokeWidth={1} />
          </div>
          <motion.div 
            animate={{ y:[-40, 40, -40] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.8)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-2 border-dashed border-brand-primary rounded-full flex items-center justify-center bg-zinc-950"
            >
              <ShieldCheck size={24} className="text-brand-primary" />
            </motion.div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Neural Ingestion Active</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">
          The Sovereign Auditor is normalizing <span className="text-white font-mono">{filename}</span>.
        </p>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 w-full flex flex-col items-center shadow-2xl">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Estimated Time Remaining</span>
          <span className="text-4xl font-mono text-brand-primary font-light tracking-tighter mb-6">
            {timeLeft > 0 ? formatTime(timeLeft) : "Finalizing..."}
          </span>

          <button 
            onClick={requestNotification}
            disabled={notifyGranted}
            className={cn(
              "w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300",
              notifyGranted ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-white/5 text-white hover:bg-brand-primary hover:text-black border border-white/10"
            )}
          >
            {notifyGranted ? <><BellRing size={16} className="animate-bounce" /> Alerts Activated</> : <><Bell size={16} /> Notify me when ready</>}
          </button>
        </div>
      </div>
    </div>
  );
};
