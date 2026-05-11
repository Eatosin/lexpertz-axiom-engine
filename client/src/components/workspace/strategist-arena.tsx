"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuditStream } from "@/hooks/use-audit-stream";
import { ChatInput } from "@/components/chat/chat-input";
import { Scale, FileText, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- SOTA FIX: LLM Markdown Pre-Processor ---
// LLMs often use single newlines. Strict Markdown requires double newlines for block separation.
// This intercepts the stream and forces blank lines before bold headers and lists.
const formatLLMOutput = (text: string) => {
  if (!text) return "";
  return text
    .replace(/([a-zA-Z0-9\]\)])\n(\*\*.+?\*\*)/g, '$1\n\n$2') // Fix Bold Headers
    .replace(/([a-zA-Z0-9\]\)])\n(- |\* |\d+\. )/g, '$1\n\n$2'); // Fix Lists
};

export const StrategistArena = () => {
  const { getToken } = useAuth();
  
  const[selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const { data: vaultFiles, isLoading: isLoadingVault } = useQuery({
    queryKey: ["vault-history-main"], 
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized");
      return api.getHistory(token);
    },
  });

  const { messages, isStreaming, submitQuery, stopStream } = useAuditStream({
    token: null, 
    contexts: selectedFiles,
  });

  const toggleFile = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename) ? prev.filter(f => f !== filename) :[...prev, filename]
    );
  };

  const handleExecuteStrategist = async () => {
    if (selectedFiles.length < 2) {
      alert("Strategist Protocol Requires at least 2 documents for comparison.");
      return;
    }

    let finalQuery = input.trim();
    if (!finalQuery.includes("/axm")) finalQuery = `/axm -c ${finalQuery}`;

    const token = await getToken();
    if (token) {
      const { submitQuery: instantSubmit } = useAuditStream({ token, contexts: selectedFiles });
      instantSubmit(finalQuery);
      setInput(""); 
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative z-10">
      
      {/* 1. HEADER & VAULT DRAWER */}
      <div className="shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Scale size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">The Strategist Node</h1>
              <p className="text-zinc-400 text-sm">Select 2+ documents to build a comparative risk matrix.</p>
            </div>
          </div>

          {isLoadingVault ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm animate-pulse">
              <Loader2 size={14} className="animate-spin" /> Accessing Sovereign Vault...
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
              {vaultFiles?.map((doc) => {
                const isSelected = selectedFiles.includes(doc.filename);
                return (
                  <button
                    key={doc.filename}
                    onClick={() => toggleFile(doc.filename)}
                    className={cn(
                      "shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200",
                      isSelected ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    {isSelected ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                    <span className="truncate max-w-[150px]">{doc.filename}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. THE MATRIX ARENA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center opacity-50">
              <ShieldAlert size={48} className="text-orange-500 mb-4 opacity-50" />
              <h3 className="text-zinc-300 font-medium">Awaiting Execution</h3>
              <p className="text-zinc-500 text-sm max-w-sm mt-2">
                The comparative engine natively formats outputs as Markdown Data Grids. Ensure 2 or more target documents are selected.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("p-6 rounded-2xl", msg.role === "user" ? "bg-zinc-900 border border-white/5 ml-auto max-w-3xl" : "bg-transparent w-full")}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-4 text-orange-500 text-xs font-mono uppercase tracking-widest">
                    <Scale size={14} /> {msg.status === "verified" ? "Verified Matrix" : "Synthesizing..."}
                  </div>
                )}
                
                {msg.role === "user" ? (
                  <h2 className="text-lg font-bold text-white">{msg.content}</h2>
                ) : (
                  <div className="w-full prose prose-invert prose-orange max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed mb-6" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 text-zinc-300 space-y-2 marker:text-orange-500" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 text-zinc-300 space-y-2 marker:text-orange-500 font-mono" {...props} />,
                        li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2" {...props} />,
                        // Wider tables for comparative matrices
                        table: ({node, ...props}) => (
                          <div className="my-8 overflow-x-auto rounded-xl border border-orange-500/20 bg-zinc-900/50 shadow-2xl">
                            <table className="w-full text-left border-collapse" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-orange-500/10 border-b border-orange-500/20" {...props} />,
                        th: ({node, ...props}) => <th className="p-4 text-[10px] font-mono text-orange-400 uppercase tracking-widest" {...props} />,
                        td: ({node, ...props}) => <td className="p-4 border-b border-white/5 text-sm text-zinc-300 align-top" {...props} />,
                      }}
                    >
                      {formatLLMOutput(msg.content)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ChatInput 
        input={input}
        setInput={setInput}
        onSend={handleExecuteStrategist}
        onStop={stopStream}
        isStreaming={isStreaming}
        isMultiMode={true}
        hasContext={selectedFiles.length > 0}
        disabled={selectedFiles.length < 2 || isLoadingVault}
      />
    </div>
  );
};
