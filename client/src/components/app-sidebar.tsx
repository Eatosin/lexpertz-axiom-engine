"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { Drawer } from "vaul";
import { LayoutDashboard, FileText, Settings, Menu, Cpu, Plus, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { api } from "@/lib/api";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  
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
  }, [getToken, currentFile]); // Refresh list when a new file is added

  // --- 2. Navigation Handlers ---
  const startNewAudit = () => {
    setCurrentFile(null); // Clears the URL state immediately
    setIsOpen(false);
  };

  const NavList = () => (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {/* New Audit Trigger */}
      <button 
        onClick={startNewAudit} 
        className="flex items-center justify-center gap-2 bg-brand-cyan text-black font-bold px-4 py-3 rounded-xl mb-8 hover:opacity-90 transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
      >
        <Plus size={18} /> New Session
      </button>

      {/* Main Nav */}
      <div className="space-y-1 mb-8">
        <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/5">
          <LayoutDashboard size={18} className="text-brand-cyan" /> Command Center
        </Link>
      </div>

      {/* VAULT LIBRARY (The 'Sections Menu') */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="px-4 text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-4">Evidence Vault</h3>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {isLoading ? (
            <div className="px-4 py-2 flex items-center gap-2 text-zinc-600 text-xs">
              <Loader2 size={12} className="animate-spin" /> Syncing...
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-4 border border-dashed border-zinc-800 rounded-lg text-[10px] text-zinc-600 text-center uppercase">
              Vault Empty
            </div>
          ) : (
            history.map((doc) => (
              <button
                key={doc.created_at}
                onClick={() => { setCurrentFile(doc.filename); setIsOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs transition-all text-left",
                  currentFile === doc.filename 
                    ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <FileText size={14} className={currentFile === doc.filename ? "text-brand-cyan" : "text-zinc-700"} />
                <span className="truncate">{doc.filename}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const UserFooter = () => (
    <div className="p-4 border-t border-sidebar-border mt-auto bg-sidebar">
      <div className="flex items-center gap-3 w-full group p-2">
        <UserButton afterSignOutUrl="/" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-zinc-200 truncate">{user?.firstName || "Engineer"}</span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase">Authenticated</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2 text-brand-cyan font-bold text-xl tracking-tighter">
          <Cpu size={24} /> Axiom
        </div>
        <NavList />
        <UserFooter />
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar h-16">
          <div className="flex items-center gap-2 text-brand-cyan font-bold tracking-tighter">
            <Cpu size={20} /> Axiom
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
