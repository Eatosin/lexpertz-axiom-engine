"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutPanelLeft, GitCompare, X, Plus, CheckCircle2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState, parseAsBoolean, parseAsArrayOf, parseAsString } from "nuqs";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuditStream } from "@/hooks/use-audit-stream";

// SOTA Feature-Sliced Components
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatInput } from "@/components/chat/chat-input";
import { UploadZone } from "@/components/vault/upload-zone";
import { IngestionOverlay } from "@/components/vault/ingestion-overlay";
import { DocumentPanel } from "@/components/vault/document-panel";

export const VerificationDashboard = ({ contexts: initialContexts }: { contexts: string[] }) => {
  const { getToken } = useAuth();
  
  // --- 1. URL STATE (Nuqs) ---
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault(initialContexts));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); 

  // --- 2. LOCAL UI STATE ---
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready">("idle");
  const [activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ingestionEta, setIngestionEta] = useState(45);
  const[isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMultiMode = contexts.length > 1;

  // --- 3. THE SOVEREIGN STREAM ENGINE ---
  const { messages, isStreaming, submitQuery, stopStream, setMessages } = useAuditStream({ 
    token: authToken, 
    contexts 
  });

  // --- 4. AUTH HYDRATION ---
  useEffect(() => {
    getToken().then(setAuthToken);
  }, [getToken]);

  // --- 5. SESSION RECOVERY & POLLING ENGINE ---
  const startPolling = useCallback((filename: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      if (!authToken) return;
      try {
        const res = await api.checkStatus(filename, authToken);
        if (res.status === "indexed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus("ready");
          
          // SOTA: Desktop Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Axiom Engine", {
              body: `Audit complete: ${filename} is now ready for interrogation.`,
              icon: "/favicon.ico"
            });
          }
        } else if (res.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          alert("Ingestion Failed. Please check the document format.");
          setStatus("idle");
        }
      } catch (e) { console.error("Polling fault:", e); }
    }, 3000);
  }, [authToken]);

  // Recover Session (With Sticky Ingestion Fix & Stale State Protection)
  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      if (!authToken || contexts.length === 0) {
        if (isMounted) setStatus("idle");
        return;
      }

      const primaryFile = contexts[0];
      setActiveViewerFile(primaryFile);

      try {
        const res = await api.checkStatus(primaryFile, authToken);
        if (!isMounted) return;

        if (res.status === "indexed") {
          setStatus("ready");
          if (!isMultiMode) {
            const history = await api.getChatHistory(primaryFile, authToken);
            if (history && Array.isArray(history) && history.length > 0) {
              setMessages(history.map((msg: any) => ({
                id: msg.id.toString(), role: msg.role, content: msg.content, status: "verified", metrics: msg.metrics
              })));
            }
          }
        } else if (res.status === "processing") {
          // Because ingest.py now writes to the DB instantly, we just trust the DB!
          setStatus("ingesting");
          startPolling(primaryFile);
        }
      } catch (e) { 
        if (isMounted) {
          // SOTA FIX: Check the LIVE state inside the setter to avoid the closure trap
          setStatus((currentLiveStatus) => 
            currentLiveStatus === "ingesting" ? "ingesting" : "ready"
          );
        }
      }
    };
    
    recover();
    return () => { isMounted = false; };
  }, [authToken, contexts, isMultiMode, startPolling, setMessages]);
  
  // --- 6. EVENT HANDLERS ---
  const handleIngestionStart = (filename: string, eta: number) => {
    setContexts([filename]);
    setIngestionEta(eta);
    setStatus("ingesting");
    setTimeout(() => startPolling(filename), 1000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    submitQuery(input);
    setInput("");
  };

  // External Query Handoff (e.g. from CommandCenter)
  useEffect(() => {
    if (status === "ready" && q) {
      submitQuery(q);
      setQ(null);
    }
  },[status, q, setQ, submitQuery]);

  const handleSaveToVault = async () => {
    if (contexts.length === 0 || !authToken) return;
    await api.saveToVault(contexts[0], authToken);
    setIsSaved(true);
  };

  // --- 7. RENDER TREE ---
  return (
    <div className="flex w-full h-full relative overflow-hidden bg-zinc-950">
      
      {/* SOTA: INGESTION OVERLAY */}
      <AnimatePresence>
        {status === "ingesting" && (
          <IngestionOverlay filename={contexts[0] || "Document"} estimatedSeconds={ingestionEta} />
        )}
      </AnimatePresence>

      {/* STATE 1: EMPTY VAULT (Upload Zone) */}
      {status === "idle" && contexts.length === 0 ? (
        <div className="flex w-full h-full items-center justify-center p-6">
          <UploadZone onUploadComplete={handleIngestionStart} />
        </div>
      ) : (
        /* STATE 2: ACTIVE WORKSPACE */
        <div className="flex w-full h-full">
          
          {/* LEFT PANEL: Document Viewer */}
          <AnimatePresence>
            {status !== "ingesting" && showPanel && contexts.length > 0 && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }} 
                animate={{ width: "35%", opacity: 1 }} 
                exit={{ width: 0, opacity: 0 }} 
                className="border-r border-white/10 bg-zinc-950 flex flex-col z-10 relative shrink-0 hidden md:flex"
              >
                {/* Context Switcher Tabs */}
                <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-zinc-950/80 backdrop-blur-md p-2 gap-2 shrink-0">
                  {contexts.map((file) => (
                    <button 
                      key={file} 
                      onClick={() => setActiveViewerFile(file)} 
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border", 
                        activeViewerFile === file ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" : "bg-transparent border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                      )}
                    >
                      {file.substring(0, 15)}...
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative overflow-hidden">
                   {activeViewerFile && (
                     <DocumentPanel filename={activeViewerFile} status={status} onDelete={() => setContexts([])} onClose={() => setShowPanel(false)} />
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RIGHT PANEL: Chat & Synthesis */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            
            {/* Top Toolbar */}
            {status !== "ingesting" && (
              <div className="h-14 px-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex justify-between items-center shrink-0 z-20">
                <div className="flex items-center gap-3">
                  {!showPanel && contexts.length > 0 && (
                    <button onClick={() => setShowPanel(true)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all hidden md:block text-zinc-400 hover:text-white">
                      <LayoutPanelLeft size={16} />
                    </button>
                  )}
                  <span className={cn("text-[10px] font-mono uppercase tracking-widest flex items-center gap-2", isMultiMode ? "text-orange-500" : "text-emerald-500")}>
                    {isMultiMode ? <><GitCompare size={14} className="animate-pulse" /> STRATEGIST NODE ACTIVE</> : <><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Vault Link Active</>}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center gap-2">
                    {contexts.map((f) => (
                      <div key={f} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                        {f.substring(0, 12)}...
                        <button onClick={() => setContexts(prev => prev.filter(x => x !== f))} className="hover:text-red-400 transition-colors"><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                  {!isMultiMode && status === "ready" && (
                    <button onClick={handleSaveToVault} disabled={isSaved} className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-1.5", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]")}>
                      {isSaved ? <CheckCircle2 size={12} /> : <Plus size={12} />} {isSaved ? "Saved" : "Save to Vault"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chat Thread Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div className="flex-1 overflow-y-auto pb-40">
                {status !== "ingesting" && status !== "idle" && (
                  <ChatThread messages={messages} scrollRef={scrollRef} activeContext={contexts.join(", ")} />
                )}
              </div>
              
              {/* Floating Command Module */}
              {status !== "idle" && status !== "ingesting" && (
                <div className="absolute bottom-0 left-0 right-0">
                  <ChatInput 
                    input={input} 
                    setInput={setInput} 
                    onSend={handleSend} 
                    onStop={stopStream}
                    isStreaming={isStreaming}
                    isMultiMode={isMultiMode} 
                    hasContext={contexts.length > 0} 
                    disabled={status !== "ready"}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
