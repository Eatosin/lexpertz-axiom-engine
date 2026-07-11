"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Architecture", href: "#architecture", description: "5-node MoE orchestrator" },
  { title: "Pricing", href: "#pricing", description: "Plans, waitlist, and API keys" },
  { title: "Sign In", href: "/dashboard", description: "Sovereign Workspace", primary: true },
  { title: "Live Demo", href: "#demo", primary: true, description: "Run a sample audit" },
];

interface GroupOptions {
  maxPrimary?: number;
}

export function groupNavItems(items: NavItem[] = [], options: GroupOptions = {}): {
  primary: NavItem[];
  overflow: NavItem[];
} {
  const maxPrimary = options.maxPrimary ?? 4;
  const explicitPrimary = items.filter((i) => i.primary);
  const explicitOverflow = items.filter((i) => i.primary === false);
  const remaining = items.filter((i) => i.primary === undefined);

  const visible: NavItem[] = [];
  const hidden: NavItem[] = [...explicitOverflow];

  for (const item of remaining) {
    if (visible.length + explicitPrimary.length < maxPrimary) {
      visible.push(item);
    } else {
      hidden.push(item);
    }
  }

  return {
    primary: [...explicitPrimary, ...visible],
    overflow: hidden,
  };
}

export function LandingNav({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const { primary, overflow } = groupNavItems(items);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0A0A0A]/60 backdrop-blur-xl shadow-2xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-bold tracking-tighter text-white sm:gap-3 sm:text-lg"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-lg transition-shadow group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="text-emerald-500" size={16} strokeWidth={2.5} />
          </div>
          <span className="hidden xs:inline sm:inline">Axiom</span>
        </Link>

        <div className="hidden items-center gap-6 text-[12px] font-mono uppercase tracking-widest text-zinc-500 md:flex lg:gap-8">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors",
                item.primary
                  ? "relative px-5 py-2 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700 text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all font-bold tracking-widest"
                  : "hover:text-emerald-400"
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-white/10 bg-[#0A0A0A] md:hidden"
          >
            <ul className="space-y-1 px-4 py-6 sm:px-6">
              {[...items].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-widest transition",
                      item.primary
                        ? "bg-gradient-to-b from-emerald-500 to-emerald-700 text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_15px_rgba(16,185,129,0.4)]"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {item.title}
                    {item.description && (
                      <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                        {item.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

LandingNav.displayName = "LandingNav";

export default LandingNav;
