"use client";

import * as React from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { LayoutDashboard, FileText, Shield, Info, ChevronLeft, ChevronRight, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from "nuqs";
import { api } from "@/lib/api";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  
  // V3.1: SYNCED ARRAY STATE
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));

  React.useEffect(() => {
    const fetch = async () => {
      const token = await getToken(); // 1. Get the token
      if (token) {
        const data = await api.getHistory(token); // 2. Pass it to the API
        setHistory(data || []);
      }
    };
    fetch();
  }, [getToken]);

  const navigateToHome = () => setContexts([]); // Clears all contexts -> Routes to Home
  const navigateToDoc = (filename: string) => setContexts([filename]); // Routes to Dashboard

  const NavItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group border border-transparent",
        active ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : "text-zinc-500 hover:text-white hover:bg-white/5"
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
        "hidden md:flex flex-col bg-zinc-950 border-r border-white/5 transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-zinc-900 text-zinc-500 p-1 rounded-full border border-white/10 hover:text-brand-primary z-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="p-6">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3 text-brand-primary">
                <Shield size={24} fill="currentColor" />
                {!isCollapsed && <span className="text-white font-bold text-xl tracking-tighter">Axiom</span>}
             </div>
             {!isCollapsed && <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pl-1">V3.1 Auditor</span>}
          </div>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <NavItem 
              icon={LayoutDashboard} 
              label="Command Center" 
              active={contexts.length === 0} 
              onClick={navigateToHome}
            />
            {contexts.length > 0 && (
              <NavItem 
                icon={Info} 
                label="Active Workspace" 
                active={true} 
                onClick={() => setShowPanel(!showPanel)} 
              />
            )}
          </div>

          <div className="space-y-4">
            {!isCollapsed && <h3 className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em] px-2">Recent Audits</h3>}
            <div className="space-y-1">
              {history.slice(0, 8).map((doc: any) => (
                <button
                  key={doc.created_at}
                  onClick={() => navigateToDoc(doc.filename)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-xs transition-all",
                    contexts.includes(doc.filename) ? "text-brand-primary bg-brand-primary/5" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {contexts.includes(doc.filename) ? <GitCompare size={14} className="text-orange-500"/> : <FileText size={16} />}
                  {!isCollapsed && <span className="truncate">{doc.filename}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 mt-auto bg-zinc-950">
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
