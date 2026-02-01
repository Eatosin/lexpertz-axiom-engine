"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Database, Search, Cpu, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadZone } from "./upload-zone"; // <--- Importing the new component

const STEPS = [
  { id: "retrieve", label: "Hybrid Retrieval", icon: Database },
  { id: "critique", label: "Adversarial Critique", icon: Search },
  { id: "verify", label: "Evidence Mapping", icon: ShieldCheck },
];

export const VerificationDashboard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "verified">("idle");
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // Triggered when the UploadZone finishes
  const startSimulation = (filename: string) => {
    setCurrentFile(filename);
    setStatus("processing");
    setActiveStep(0);
    
    // Simulate the Python Backend Logic Steps
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setActiveStep(step);
      if (step >= STEPS.length) {
        clearInterval(timer);
        setStatus("verified");
      }
    }, 2000); // 2 seconds per agentic step
  };

  const reset = () => {
    setStatus("idle");
    setCurrentFile(null);
    setActiveStep(0);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl shadow-2xl min-h-[500px] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="text-brand-cyan" size={24} />
            Axiom Reasoning Node
          </h2>
          <p className="text-zinc-500 text-sm font-mono mt-1 italic">
            {status === "idle" ? "Waiting for Evidence..." : `Analyzing: ${currentFile}`}
          </p>
        </div>
        
        {status === "verified" && (
          <button 
            onClick={reset}
            className="px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-lg hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <RefreshCw size={14} /> New Audit
          </button>
        )}
      </div>

      {/* Main Content Area: Switches between Upload and Visualization */}
      <div className="flex-1 flex flex-col justify-center">
        {status === "idle" ? (
          <UploadZone onUploadComplete={startSimulation} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* The Stepper UI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = activeStep > idx;
                const isActive = activeStep === idx;

                return (
                  <div key={step.id} className="relative">
                    <div className={cn(
                      "p-6 rounded-2xl border transition-all duration-500 flex flex-col items-center text-center",
                      isActive 
                        ? "border-brand-cyan bg-brand-cyan/5 scale-105 shadow-[0_0_30px_rgba(6,182,212,0.1)] opacity-100" 
                        : isCompleted 
                          ? "border-emerald-500/30 bg-emerald-500/5 opacity-100" 
                          : "border-white/5 bg-black/20 opacity-30"
                    )}>
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-colors",
                        isCompleted ? "bg-emerald-500/10 text-emerald-500" : isActive ? "bg-brand-cyan/10 text-brand-cyan" : "bg-zinc-800 text-zinc-600"
                      )}>
                        {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{step.label}</h4>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                        {isCompleted ? "Complete" : isActive ? "Processing..." : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* The Evidence Output */}
            <AnimatePresence mode="wait">
              {status === "verified" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl bg-zinc-950 border border-emerald-500/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                        Analysis Complete: The identified liability matches the amortized schedule with 
                        <span className="text-emerald-400 font-bold ml-1">99.8% Confidence.</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-500 font-mono">
                          SRC: {currentFile}
                        </div>
                        <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-brand-cyan font-mono">
                          COORD: P.45, L.12-14
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};
