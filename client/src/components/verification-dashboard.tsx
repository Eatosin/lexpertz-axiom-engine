"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Database, Search, Cpu, FileText, CheckCircle2, RefreshCw, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadZone } from "./upload-zone";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useQueryState } from "nuqs"; // <--- SOTA State Manager

const STEPS = [
  { id: "retrieve", label: "Hybrid Retrieval", icon: Database },
  { id: "critique", label: "Adversarial Critique", icon: Search },
  { id: "verify", label: "Evidence Mapping", icon: ShieldCheck },
];

export const VerificationDashboard = () => {
  const { getToken } = useAuth();

  // --- 1. URL-Based State (The Source of Truth) ---
  // If ?context=filename.pdf exists in URL, we are 'ready'. If not, we are 'idle'.
  const [currentFile, setCurrentFile] = useQueryState("context");
  
  // Local UI States
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  // --- 2. Synchronization Effect ---
  // If the URL has a file, we automatically snap to "Ready" state on load.
  useEffect(() => {
    if (currentFile && status === "idle") {
      setStatus("ready");
    } else if (!currentFile && status !== "ingesting") {
      setStatus("idle");
    }
  }, [currentFile, status]);

  const handleUploadComplete = async (filename: string) => {
    // We don't set URL yet, we wait for ingestion
    setStatus("ingesting");
    
    const token = await getToken();
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.checkStatus(filename, token);
        if (res.status === "indexed") {
          clearInterval(interval);
          // SET THE URL -> This persists the session
          setCurrentFile(filename); 
          setStatus("ready");
        } else if (res.status === "error") {
          clearInterval(interval);
          alert("Ingestion Failure: The Vault rejected this document.");
          setStatus("idle");
        }
      } catch (e) { console.error(e); }
    }, 3000);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setStatus("reasoning");
    setVerificationResult(null);
    setActiveStep(0);

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const token = await getToken();
      if (!token) throw new Error("Session Expired");

      // Verify against the file in the URL
      if (!currentFile) throw new Error("No context active");

      const response = await api.verifyQuestion(question, token);
      
      clearInterval(timer);
      setVerificationResult(response.answer);
      setActiveStep(STEPS.length); 
      setStatus("verified");
    } catch (error) {
      clearInterval(timer);
      setStatus("ready");
      alert("Adversarial Loop Terminated.");
    }
  };

  const reset = () => {
    // Clearing the URL resets the state automatically via the useEffect
    setCurrentFile(null); 
    setQuestion("");
    setVerificationResult(null);
    setStatus("idle");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-2xl min-h-[600px] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="text-brand-cyan" size={24} />
            Axiom Reasoning Node
          </h2>
          <p className="text-muted-foreground text-sm font-mono mt-1 italic">
            {status === "idle" ? "System Awaiting Evidence..." : `Active Context: ${currentFile}`}
          </p>
        </div>
        {status !== "idle" && (
          <button 
            onClick={reset} 
            className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-bold rounded-lg hover:bg-secondary/80 transition flex items-center gap-2"
          >
            <RefreshCw size={14} /> New Session
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {status === "idle" && <UploadZone onUploadComplete={handleUploadComplete} />}

        {status === "ingesting" && (
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-brand-cyan w-12 h-12 mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Reconstructing Structural Data...</h3>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Engine: IBM Docling v2.0</p>
          </div>
        )}

        {status === "ready" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl text-center">
              <CheckCircle2 className="mx-auto text-brand-cyan mb-2" size={32} />
              <h3 className="text-foreground font-bold">Evidence Vault Synchronized.</h3>
              <p className="text-muted-foreground text-sm">Axiom-Verify is now context-aware.</p>
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything (e.g., 'What are the core liabilities?')"
                className="w-full bg-secondary/50 border border-input rounded-xl px-6 py-5 text-foreground focus:border-brand-cyan transition pr-14 outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button 
                onClick={handleAsk} 
                className="absolute right-3 top-3 p-3 bg-brand-cyan text-black rounded-lg hover:bg-brand-cyan/90 transition shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {(status === "reasoning" || status === "verified") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Visual Stepper */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = activeStep > idx || status === "verified";
                const isActive = activeStep === idx && status === "reasoning";
                return (
                  <div key={step.id} className={cn(
                    "p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-500",
                    isActive 
                      ? "border-brand-cyan bg-brand-cyan/5 scale-105 shadow-[0_0_30px_rgba(6,182,212,0.1)] opacity-100" 
                      : "border-border bg-card opacity-50",
                    isCompleted && "border-emerald-500/30 bg-emerald-500/5 opacity-100"
                  )}>
                    <Icon className={cn("mb-4 h-8 w-8", isActive ? "text-brand-cyan" : isCompleted ? "text-emerald-500" : "text-muted-foreground")} />
                    <h4 className="text-sm font-bold text-foreground">{step.label}</h4>
                  </div>
                );
              })}
            </div>

            {/* Evidence Output */}
            {status === "verified" && (
              <div className="p-6 bg-card border border-emerald-500/30 rounded-2xl animate-in fade-in slide-in-from-bottom-4 shadow-xl">
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
                     <FileText size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-muted-foreground text-xs font-bold uppercase mb-2 tracking-tighter">Verified Audit Result</h4>
                    <p className="text-foreground leading-relaxed text-sm md:text-base">{verificationResult}</p>
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                        <button onClick={() => setStatus("ready")} className="text-xs font-bold text-brand-cyan flex items-center gap-1 hover:underline">
                            <RefreshCw size={10} /> Interrogate Further
                        </button>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">Coordinate Logic Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
