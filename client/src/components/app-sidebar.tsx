"use client";

import * as React from "react";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { 
  LayoutDashboard, 
  FileText, 
  ShieldCheck, // Swapped from Shield
  Info, 
  ChevronLeft, 
  ChevronRight, 
  GitCompare, 
  Terminal,
  Settings2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from "nuqs";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link"; // Added for the logo link

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [history, setHistory] = React.useState<any[]>([]);
  
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));

  React.useEffect(() => {
    const fetch = async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await api.getHistory(token);
          setHistory(data || []);
        }
      } catch (e) {
        console.error("Failed to fetch history:", e);
      }
    };
    fetch();
  }, [getToken]);

  const handleNav = (path: string, clearContext = false) => {
    if (clearContext) setContexts([]);
    router.push(path);
  };

  const NavItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group border mb-1",
        active 
          ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
          : "text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn(
        "transition-transform duration-300 group-hover:scale-110",
        active ? "text-brand-primary" : "text-zinc-500 group-hover:text-brand-primary"
      )} />
      {!isCollapsed && (
        <span className={cn(
          "text-xs tracking-tight transition-opacity duration-300",
          active ? "font-bold" : "font-medium"
        )}>
          {label}
        </span>
      )}
      {!isCollapsed && badge && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <aside className={cn(
        "hidden md:flex flex-col bg-zinc-950 border-r border-white/5 transition-all duration-500 relative z-50",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-zinc-900 text-zinc-500 p-1 rounded-full border border-border hover:text-brand-primary z-50 transition-all hover:scale-110 shadow-xl"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* --- BRANDING LOGO SECTION (UPDATED) --- */}
        <div className="p-8">
          <Link href="/" className="group flex flex-col gap-1 outline-none">
             <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-primary/20 blur-md rounded-full group-hover:bg-brand-primary/40 transition-colors" />
                  <ShieldCheck 
                    size={26} 
                    className="text-brand-primary relative z-10 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                  />
                </div>
                {!isCollapsed && (
                  <span className="text-white font-bold text-xl tracking-tighter animate-in fade-in slide-in-from-left-2 duration-500">
                    Axiom <span className="text-brand-primary/90">Engine</span>
                  </span>
                )}
             </div>
             {!isCollapsed && (
               <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em] pl-1 group-hover:text-zinc-400 transition-colors">
                 Sovereign Auditor
               </span>
             )}
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
          {/* SECTION: SYSTEM NAVIGATION */}
          <div>
            {!isCollapsed && <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em] px-3 mb-3">System</h3>}
            <NavItem 
              icon={LayoutDashboard} 
              label="Command Center" 
              active={pathname === "/dashboard" && contexts.length === 0} 
              onClick={() => handleNav("/dashboard", true)}
            />
            <NavItem 
              icon={Terminal} 
              label="Developer Settings" 
              active={pathname === "/dashboard/settings"} 
              onClick={() => handleNav("/dashboard/settings")}
            />
          </div>

          {/* SECTION: ACTIVE WORKSPACE */}
          {contexts.length > 0 && pathname === "/dashboard" && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              {!isCollapsed && <h3 className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.2em] px-3 mb-3 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-brand-primary animate-ping" />
                Live Session
              </h3>}
              <NavItem 
                icon={GitCompare} 
                label="Current Audit" 
                active={true} 
                onClick={() => setShowPanel(!showPanel)} 
              />
            </div>
          )}

          {/* SECTION: RECENT HISTORY */}
          <div className="pt-2">
            {!isCollapsed && <h3 className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em] px-3 mb-3">Recent Vault</h3>}
            <div className="space-y-1 px-1">
              {history.slice(0, 8).map((doc: any) => (
                <button
                  key={doc.created_at}
                  onClick={() => {
                    setContexts([doc.filename]);
                    if (pathname !== "/dashboard") router.push("/dashboard");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg text-[11px] transition-all duration-200 group",
                    contexts.includes(doc.filename) && pathname === "/dashboard"
                      ? "text-brand-primary bg-brand-primary/5 border-l-2 border-brand-primary pl-3" 
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                  )}
                >
                  <FileText size={14} className="shrink-0 opacity-60 group-hover:opacity-100" />
                  {!isCollapsed && <span className="truncate opacity-80 group-hover:opacity-100">{doc.filename}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Profile */}
        <div className="p-4 border-t border-white/5 mt-auto bg-zinc-950/80 backdrop-blur-md">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl transition-colors",
            !isCollapsed && "hover:bg-white/5"
          )}>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "h-8 w-8 border border-brand-primary/20 hover:border-brand-primary/50 transition-colors" }}} />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{user?.firstName || "Auditor"}</span>
                <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-tighter">Verified Identity</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.02),transparent)] pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
