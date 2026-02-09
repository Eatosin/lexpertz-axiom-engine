"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { LayoutDashboard, FileText, Plus, Search, Loader2, Shield, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { api } from "@/lib/api";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  const [currentFile, setCurrentFile] = useQueryState("context");

  React.useEffect(() => {
    const fetch = async () => {
      const token = await getToken();
      if (token) {
        const data = await api.getHistory(token);
        setHistory(data || []);
      }
    };
    fetch();
  }, [getToken, currentFile]);

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar Container */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-border transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-72"
      )}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-border text-zinc-400 p-1 rounded-full border border-border hover:text-white z-50"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="p-6 overflow-hidden">
          <div className="flex items-center gap-3 text-brand-primary">
            <Shield size={24} fill="currentColor" />
            {!isCollapsed && <span className="text-white font-bold text-xl tracking-tighter">Axiom</span>}
          </div>
        </div>

        <div className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar">
          <button 
            onClick={() => { setCurrentFile(null); window.location.href="/"; }}
            className={cn("flex items-center justify-center gap-2 bg-brand-primary text-black font-bold rounded-xl transition w-full py-3", isCollapsed ? "px-0" : "px-4")}
          >
            <Plus size={18} /> {!isCollapsed && "New Session"}
          </button>

          <div className="space-y-1">
            {history.map((doc: any) => (
              <button
                key={doc.created_at}
                onClick={() => setCurrentFile(doc.filename)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                  currentFile === doc.filename ? "bg-brand-primary/10 text-brand-primary" : "text-zinc-500 hover:bg-white/5"
                )}
              >
                <FileText size={18} />
                {!isCollapsed && <span className="text-xs truncate">{doc.filename}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{user?.firstName}</span>
                <span className="text-[10px] text-zinc-500 uppercase">Verified</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
