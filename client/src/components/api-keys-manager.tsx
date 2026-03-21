"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Copy, Check, Trash2, AlertTriangle, Plus, Terminal } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const ApiKeysManager = () => {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Key State
  const[isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const[newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (token) {
        const data = await api.listApiKeys(token);
        setKeys(data ||[]);
      }
    } catch (e) {
      console.error("Failed to load keys", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [getToken]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const token = await getToken();
      if (token) {
        const res = await api.createApiKey(newKeyName, token);
        setNewlyGeneratedKey(res.key_value);
        setNewKeyName("");
        await fetchKeys(); // Refresh list to show the new hint
      }
    } catch (e) {
      alert("Failed to generate key.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure? Any MCP server using this key will be instantly disconnected.")) return;
    try {
      const token = await getToken();
      if (token) {
        await api.revokeApiKey(id, token);
        await fetchKeys(); // Refresh list
      }
    } catch (e) {
      alert("Failed to revoke key.");
    }
  };

  const copyToClipboard = () => {
    if (newlyGeneratedKey) {
      navigator.clipboard.writeText(newlyGeneratedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Terminal className="text-brand-primary" /> Developer Settings (MCP)
        </h2>
        <p className="text-zinc-400 text-sm">
          Manage your Personal Access Tokens. Use these to connect local IDEs (Claude Desktop, Cursor) to your Axiom Sovereign Vault.
        </p>
      </div>

      {/* NEW KEY ALERT (Shown only once) */}
      <AnimatePresence>
        {newlyGeneratedKey && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-emerald-500 font-bold">Store this key securely</h3>
                <p className="text-sm text-emerald-500/80">
                  This is the ONLY time you will see this key. If you lose it, you will need to generate a new one.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-black/40 border border-white/10 rounded-xl font-mono text-zinc-200 text-sm">
                {newlyGeneratedKey}
              </code>
              <button 
                onClick={copyToClipboard}
                className="p-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2 font-bold"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            
            <button 
              onClick={() => setNewlyGeneratedKey(null)}
              className="text-xs text-zinc-500 hover:text-white underline underline-offset-4"
            >
              I have saved it securely. Dismiss.
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE KEY SECTION */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">New Token Name</label>
          <input 
            type="text" 
            placeholder="e.g., MacBook Claude Desktop" 
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand-primary outline-none transition-colors"
          />
        </div>
        <button 
          onClick={handleCreateKey}
          disabled={isCreating || !newKeyName.trim()}
          className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Generate Token
        </button>
      </div>

      {/* ACTIVE KEYS LIST */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Active MCP Tokens</h3>
        
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-dashed border-white/10 rounded-3xl">
            No API keys generated yet.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className={cn(
                "p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                k.is_active ? "bg-zinc-900/40 border-white/5" : "bg-red-500/5 border-red-500/10 opacity-50"
              )}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Key size={14} className={k.is_active ? "text-brand-primary" : "text-red-500"} />
                    <span className="font-bold text-white">{k.name}</span>
                    {!k.is_active && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] uppercase font-bold tracking-widest">Revoked</span>}
                  </div>
                  <code className="text-xs text-zinc-500 font-mono">{k.key_hint}</code>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Last Used</div>
                    <div className="text-xs text-zinc-300">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</div>
                  </div>
                  
                  {k.is_active && (
                    <button 
                      onClick={() => handleRevoke(k.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Revoke Key"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
