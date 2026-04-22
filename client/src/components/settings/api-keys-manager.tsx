"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Plus, Trash2, Copy, Check, EyeOff, AlertTriangle, Clock, Database } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const ApiKeysManager = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const[copied, setCopied] = useState(false);

  // --- 1. FETCH KEYS ---
  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return[];
      return api.listApiKeys(token);
    },
  });

  // --- 2. CREATE KEY MUTATION ---
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized");
      return api.createApiKey(name, token);
    },
    onSuccess: (data) => {
      setRevealedKey(data.key_value);
      setNewKeyName("");
      // SOTA: Instantly refresh the table to show the new key hint
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  // --- 3. REVOKE KEY MUTATION ---
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error("Unauthorized");
      return api.revokeApiKey(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  // --- 4. SECURE CLIPBOARD INTERACTION ---
  const handleCopy = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* SECTION A: KEY GENERATION */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Key size={16} className="text-brand-primary" /> Generate New MCP Token
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., MacBook Claude Desktop"
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-primary/50 transition-colors"
            disabled={createMutation.isPending}
          />
          <button
            onClick={() => createMutation.mutate(newKeyName)}
            disabled={!newKeyName.trim() || createMutation.isPending}
            className="px-6 py-3 bg-brand-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {createMutation.isPending ? "Generating..." : <><Plus size={16} /> Create Token</>}
          </button>
        </div>

        {/* SECURE KEY REVEAL OVERLAY */}
        <AnimatePresence>
          {revealedKey && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-emerald-500 font-bold text-sm">Save this token securely.</h4>
                  <p className="text-emerald-500/70 text-xs mt-1">For your security, Axiom does not store the raw token. You will not be able to see it again after closing this window.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/20 p-2 rounded-xl">
                <code className="flex-1 text-emerald-400 font-mono text-sm px-3 select-all overflow-x-auto custom-scrollbar">
                  {revealedKey}
                </code>
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-2 shrink-0"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className="text-xs font-bold">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              
              <button 
                onClick={() => setRevealedKey(null)}
                className="mt-4 text-xs text-emerald-500/70 hover:text-emerald-500 underline underline-offset-2"
              >
                I have saved this token securely
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION B: ACTIVE KEYS LEDGER */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-6 md:p-8 border-b border-white/5">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Database size={16} className="text-zinc-400" /> Active Tokens
          </h2>
        </div>

        <div className="p-6 md:p-8">
          {isLoading ? (
            <div className="text-zinc-500 text-sm font-mono uppercase tracking-widest flex items-center gap-2">
              Loading security ledger...
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">
              <EyeOff size={32} className="opacity-50 mb-3" />
              <p className="text-sm">No active tokens. Generate one above to connect an MCP client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">Token Name</th>
                    <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">Key Hint</th>
                    <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5">Last Used</th>
                    <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-normal border-b border-white/5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className={cn("group transition-colors", key.is_active ? "hover:bg-white/[0.02]" : "opacity-40")}>
                      <td className="p-4 border-b border-white/5 text-sm text-white font-medium">
                        {key.name}
                        {!key.is_active && <span className="ml-2 text-[9px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full uppercase">Revoked</span>}
                      </td>
                      <td className="p-4 border-b border-white/5 font-mono text-xs text-zinc-400">
                        {key.key_hint}
                      </td>
                      <td className="p-4 border-b border-white/5 text-sm text-zinc-500 flex items-center gap-1.5">
                        <Clock size={12} />
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-4 border-b border-white/5 text-right">
                        {key.is_active ? (
                          <button 
                            onClick={() => {
                              if (window.confirm(`Revoke ${key.name}? Any local agents using this token will be disconnected instantly.`)) {
                                revokeMutation.mutate(key.id);
                              }
                            }}
                            disabled={revokeMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} /> Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600 font-mono">DEAD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
