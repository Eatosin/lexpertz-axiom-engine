"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Drawer } from "vaul"; // Mobile Magic
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  Cpu, 
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Command Center", icon: LayoutDashboard, href: "/" },
  { label: "Evidence Vault", icon: FileText, href: "/vault" }, // Future page
  { label: "Settings", icon: Settings, href: "/settings" },    // Future page
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  // --- The Navigation List ---
  const NavList = () => (
    <div className="flex flex-col gap-2 p-4">
      {/* New Audit Button */}
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center gap-2 bg-brand-cyan text-black font-bold px-4 py-3 rounded-xl mb-6 hover:opacity-90 transition"
      >
        <Plus size={18} /> New Audit
      </button>

      {/* Links */}
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );

  // --- The Identity Footer (Linear Style Refactor) ---
  const UserFooter = () => (
    <div className="p-4 border-t border-sidebar-border mt-auto">
      {/* 
         Wrapping the entire block in a relative container 
         The UserButton is now invisible but expands to cover the whole row
      */}
      <div className="relative flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group">
        <div className="relative z-0">
          <UserButton 
            appearance={{
              elements: {
                rootBox: "w-full",
                userButtonTrigger: "opacity-0 absolute inset-0 w-full h-full z-10", // Invisible overlay
                userButtonAvatarBox: "h-8 w-8 opacity-100 z-0 border border-brand-cyan/20" // Visible avatar
              }
            }}
          />
        </div>
        
        <div className="flex flex-col overflow-hidden pointer-events-none">
          <span className="text-sm font-semibold text-white truncate">
            {user?.fullName || "Axiom Engineer"}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 truncate uppercase tracking-tighter">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-2 text-brand-cyan font-bold text-xl">
            <Cpu size={24} /> Axiom
          </div>
        </div>
        <NavList />
        <UserFooter />
      </aside>

      {/* --- MOBILE HEADER & CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2 text-brand-cyan font-bold">
            <Cpu size={20} /> Axiom
          </div>
          
          <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
            <Drawer.Trigger asChild>
              <button className="p-2 text-zinc-400 hover:text-white">
                <Menu size={24} />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/80 z-50" />
              <Drawer.Content className="bg-sidebar flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border">
                <div className="p-4 bg-sidebar-border/50 rounded-t-[10px] flex justify-center">
                  <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
                </div>
                <div className="flex-1 overflow-auto">
                  <NavList />
                </div>
                <UserFooter />
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
      }
