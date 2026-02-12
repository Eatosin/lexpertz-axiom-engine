"use client";

import * as React from "react";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { LayoutDashboard, FileText, Plus, Shield, Info, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import { api } from "@/lib/api";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  
  // SOTA: URL-Based Panel Control
  const [currentFile, setCurrentFile] = useQueryState("context");
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));

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

  const NavItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
        active ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "text-zinc-500 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn(active ? "text-brand-primary" : "group-hover:text-brand-secondary")} />
      {!isCollapsed && <span className="text-xs font-semibold truncate">{label}</span>}
      {!isCollapsed && badge && <div className="ml-auto h-2 w-2 rounded-full bg-brand-primary animate-pulse" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-border transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-zinc-900 text-zinc-500 p-1 rounded-full border border-border hover:text-brand-primary z-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="p-6">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3 text-brand-primary">
                <Shield size={24} fill="currentColor" />
                {!isCollapsed && <span className="text-white font-bold text-xl tracking-tighter">Axiom</span>}
             </div>
             {!isCollapsed && <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pl-1">Powered by Lexpertz AI</span>}
          </div>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <NavItem 
              icon={LayoutDashboard} 
              label="Command Center" 
              active={!currentFile} 
              onClick={() => { setCurrentFile(null); window.location.href="/"; }} 
            />
            {currentFile && (
              <NavItem 
                icon={Info} 
                label="Document Intel" 
                active={showPanel} 
                onClick={() => setShowPanel(!showPanel)} 
              />
            )}
          </div>

          <div className="space-y-4">
            {!isCollapsed && <h3 className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em] px-2">Recent Audits</h3>}
            <div className="space-y-1">
              {history.slice(0, 5).map((doc: any) => (
                <button
                  key={doc.created_at}
                  onClick={() => setCurrentFile(doc.filename)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-xs transition-all",
                    currentFile === doc.filename ? "text-brand-primary bg-brand-primary/5" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <FileText size={16} />
                  {!isCollapsed && <span className="truncate">{doc.filename}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border mt-auto bg-zinc-950/50">
          <div className="flex items-center gap-3 p-2">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "h-9 w-9 border border-brand-primary/20" }}} />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{user?.firstName}</span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter">Verified Auditor</span>
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
