"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { Drawer } from "vaul";
import { LayoutDashboard, FileText, Settings, Menu, Cpu, Plus, Loader2, Shield, Search as SearchIcon, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { api } from "@/lib/api";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);
  
  // URL State Control
  const [currentFile, setCurrentFile] = useQueryState("context");

  // --- 1. Fetch Audit History ---
  React.useEffect(() => {
    const fetchHistory = async () => {
      const token = await getToken();
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await api.getHistory(token);
        setHistory(data);
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    fetchHistory();
  }, [getToken, currentFile]);

  // --- 2. Filter & Truncate Logic ---
  const filteredHistory = history.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const displayHistory = showAll ? filteredHistory : filteredHistory.slice(0, 5);

  // --- 3. Navigation Handlers ---
  const startNewAudit = () => {
    setCurrentFile(null);
    window.location.href = "/";
    setIsOpen(false);
  };

  const NavList = () => (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {/* Search Bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
        <input 
          type="text"
          placeholder="Search Vault..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-sidebar-border rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-primary/50 transition"
        />
      </div>

      {/* New Audit Trigger */}
      <button 
        onClick={startNewAudit} 
        className="flex items-center justify-center gap-2 bg-brand-primary text-black font-bold px-4 py-3 rounded-xl mb-6 hover:opacity-90 transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
      >
        <Plus size={18} /> New Session
      </button>

      {/* VAULT LIBRARY */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-3">Evidence Vault</h3>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {isLoading ? (
            <div className="px-4 py-2 flex items-center gap-2 text-zinc-600 text-xs">
              <Loader2 size={12} className="animate-spin" /> Syncing...
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-4 border border-dashed border-zinc-800 rounded-lg text-[10px] text-zinc-600 text-center uppercase">
              Vault Empty
            </div>
          ) : (
            <>
              {displayHistory.map((doc) => (
                <button
                  key={doc.created_at}
                  onClick={() => { setCurrentFile(doc.filename); setIsOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all group",
                    currentFile === doc.filename 
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className={doc.status === 'indexed' ? "text-brand-primary" : "text-zinc-700"} />
                    <span className="truncate">{doc.filename}</span>
                  </div>
                  {doc.status === 'indexed' && <CheckCircle2 size={12} className="text-brand-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              ))}
              {filteredHistory.length > 5 && (
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-[10px] font-bold text-zinc-600 hover:text-zinc-400 py-2 uppercase tracking-tighter transition flex items-center justify-center gap-1"
                >
                  {showAll ? "Show Less" : `View ${filteredHistory.length - 5} More`} <ChevronDown size={10} className={showAll ? "rotate-180" : ""} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const UserFooter = () => (
    <div className="p-4 border-t border-sidebar-border mt-auto bg-sidebar">
      <div className="flex items-center gap-3 w-full group p-2 rounded-xl hover:bg-white/5 transition-colors">
        <UserButton 
           afterSignOutUrl="/" 
           appearance={{ elements: { userButtonAvatarBox: "h-9 w-9 border border-brand-primary/20 hover:border-brand-primary" } }}
        />
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-zinc-200 truncate">{user?.firstName || "Auditor"}</span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">Verified Identity</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand-gradient rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                <Shield size={18} fill="currentColor" />
              </div>
              <span className="text-white font-bold text-xl tracking-tighter">Axiom Verify</span>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[8px] text-zinc-500 uppercase tracking-[0.2em]">Powered by</span>
              <span className="text-[8px] text-brand-primary font-bold uppercase tracking-[0.2em]">Lexpertz AI</span>
            </div>
          </div>
        </div>
        <NavList />
        <UserFooter />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar h-16">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-brand-gradient rounded-md flex items-center justify-center text-white">
               <Shield size={14} fill="currentColor" />
            </div>
            <span className="text-white font-bold text-lg tracking-tighter">Axiom</span>
          </div>
          <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
            <Drawer.Trigger asChild>
              <button className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-border">
                <Menu size={20} />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" />
              <Drawer.Content className="bg-sidebar flex flex-col rounded-t-3xl h-[92vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border shadow-2xl">
                <div className="p-4 bg-sidebar border-b border-sidebar-border flex justify-center">
                  <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <NavList />
                </div>
                <UserFooter />
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </header>

        <main className="flex-1 overflow-auto bg-zinc-950/30">
          {children}
        </main>
      </div>
    </div>
  );
      }
