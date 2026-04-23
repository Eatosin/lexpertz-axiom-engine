"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { useAuth, UserButton } from "@clerk/nextjs";
import { 
  LayoutDashboard, TerminalSquare, FileText, 
  ChevronLeft, ChevronRight, ShieldCheck, Database
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const AppSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));

  const { data: history } = useQuery({
    queryKey:["vault-history-sidebar"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return[];
      return api.getHistory(token);
    },
    staleTime: 1000 * 60 * 5,
  });

  // FIX: Smart Navigation Router
  const handleWorkspaceNav = (targetFile?: string) => {
    if (pathname !== "/dashboard") {
      // If trapped on Settings page, hard-route back to Dashboard
      if (targetFile) {
        router.push(`/dashboard?contexts=${encodeURIComponent(targetFile)}`);
      } else {
        router.push("/dashboard");
      }
    } else {
      // If already on Dashboard, use ultra-fast Nuqs state swap
      if (targetFile) {
        setContexts([targetFile]);
      } else {
        setContexts([]);
      }
    }
  };

  // UI Active State Logic
  const isHomeActive = pathname === "/dashboard" && contexts.length === 0;
  const isSettingsActive = pathname === "/dashboard/settings";

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="h-full bg-zinc-950 border-r border-white/5 flex flex-col shrink-0 relative z-40"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 p-1 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-xl z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* 1. BRANDING */}
      <div className={cn("h-16 flex items-center border-b border-white/5 shrink-0 transition-all", isCollapsed ? "justify-center px-0" : "px-6")}>
        <div className="flex items-center overflow-hidden whitespace-nowrap">
          <ShieldCheck className="text-brand-primary shrink-0" size={28} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, width: 0, marginLeft: 0 }} 
                animate={{ opacity: 1, width: "auto", marginLeft: 12 }} 
                exit={{ opacity: 0, width: 0, marginLeft: 0 }} 
                className="font-bold text-white tracking-tight text-lg overflow-hidden"
              >
                Axiom <span className="font-light text-zinc-400">Engine</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col gap-6">
        
        <div className={cn("space-y-2", isCollapsed ? "px-3" : "px-4")}>
          {!isCollapsed && <p className="px-2 text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-3">System</p>}
          
          <button 
            onClick={() => handleWorkspaceNav()}
            title="Command Center"
            className={cn(
              "w-full flex items-center rounded-xl transition-all group",
              isCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3",
              isHomeActive ? "bg-brand-primary/10 text-brand-primary" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <LayoutDashboard size={20} className={cn("shrink-0", isHomeActive ? "text-brand-primary" : "text-zinc-500 group-hover:text-zinc-300")} />
            {!isCollapsed && <span className="text-sm font-medium truncate">Command Center</span>}
          </button>
          
          <Link 
            href="/dashboard/settings" 
            title="Developer Settings"
            className={cn(
              "w-full flex items-center rounded-xl transition-all group",
              isCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3",
              isSettingsActive ? "bg-brand-secondary/10 text-brand-secondary" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <TerminalSquare size={20} className={cn("shrink-0", isSettingsActive ? "text-brand-secondary" : "text-zinc-500 group-hover:text-zinc-300")} />
            {!isCollapsed && <span className="text-sm font-medium truncate">Developer Settings</span>}
          </Link>
        </div>

        {/* Recent Vault */}
        {history && history.length > 0 && (
          <div className={cn("space-y-1", isCollapsed ? "px-3" : "px-4")}>
            {!isCollapsed && <p className="px-2 text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-3 mt-4">Recent Vault</p>}
            
            {history.slice(0, 5).map((doc, idx) => {
              const isDocActive = pathname === "/dashboard" && contexts.includes(doc.filename);
              return (
                <button
                  key={idx}
                  onClick={() => handleWorkspaceNav(doc.filename)}
                  title={doc.filename}
                  className={cn(
                    "w-full flex items-center rounded-xl transition-all group",
                    isCollapsed ? "justify-center p-3" : "px-3 py-2 gap-3",
                    isDocActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 border border-transparent"
                  )}
                >
                  <FileText size={isCollapsed ? 20 : 16} className={cn("shrink-0", isDocActive ? "text-emerald-500" : "text-zinc-600 group-hover:text-zinc-400")} />
                  {!isCollapsed && <span className="text-xs font-medium truncate">{doc.filename}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. BOTTOM STATUS CARD */}
      <div className={cn("p-4 border-t border-white/5 shrink-0 bg-zinc-900/20 transition-all", isCollapsed ? "flex justify-center" : "flex justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg" } }} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">Sovereign Admin</span>
              <span className="text-[10px] text-brand-primary flex items-center gap-1">
                <Database size={10} /> Vault Connected
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
