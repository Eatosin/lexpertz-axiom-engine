"use client";

// Adapted from 21st.dev Magic: Command Palette (id: 2075) by rafa-porto
// Source: https://21st.dev/r/rafa-porto/command-palette
// Adapted for Axiom Engine: cmdk primitive, dark zinc theme, sessionStorage history.

import * as React from "react";
import { Command } from "./command";
import { Command as CommandPrimitive } from "cmdk";
import { Search, CornerDownLeft, Command as CommandIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const { useState, useEffect, useRef, useCallback, useMemo } = React;

export type CommandCategory =
  | "Navigation"
  | "Audit"
  | "System"
  | "Utility"
  | "Settings"
  | "Tools";

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: CommandCategory;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  href?: string;
  action?: () => void;
}

interface CommandHistoryEntry {
  id: string;
  timestamp: number;
  count: number;
}

export interface ParsedQuery {
  query: string;
  category: CommandCategory | null;
}

export function parseQuery(input: string): ParsedQuery {
  const trimmed = input.trim();
  if (!trimmed) return { query: "", category: null };

  const categoryMatch = trimmed.match(/^[:>]\s*([A-Za-z]+)/);
  if (categoryMatch) {
    const raw = categoryMatch[1];
    const category = (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()) as CommandCategory;
    const allowed: CommandCategory[] = ["Navigation", "Audit", "System", "Utility", "Settings", "Tools"];
    if (allowed.includes(category)) {
      return {
        query: trimmed.replace(/^[:>]\s*[A-Za-z]+\s*/, "").toLowerCase(),
        category,
      };
    }
  }

  return { query: trimmed.toLowerCase(), category: null };
}

export function parseSearchCommand(
  input: string,
  corpus: CommandItem[] = DEFAULT_COMMAND_ITEMS
): CommandItem[] {
  const { query, category } = parseQuery(input);

  if (!query && !category) return [];

  return corpus.filter((item) => {
    if (category && item.category !== category) return false;
    if (!query && category) return true;
    const inTitle = item.title.toLowerCase().includes(query);
    const inDesc = item.description.toLowerCase().includes(query);
    const inKw = item.keywords?.some((k) => k.toLowerCase().includes(query));
    return inTitle || inDesc || inKw;
  });
}

const DEFAULT_COMMAND_ITEMS: CommandItem[] = [
  {
    id: "nav-dashboard",
    title: "Go to Dashboard",
    description: "Open the Sovereign Workspace",
    category: "Navigation",
    shortcut: "G D",
    keywords: ["dashboard", "workspace", "home", "vault"],
    href: "/dashboard",
  },
  {
    id: "nav-settings",
    title: "Go to Settings",
    description: "API Keys and preferences",
    category: "Navigation",
    shortcut: "G S",
    keywords: ["settings", "preferences", "keys"],
    href: "/dashboard/settings",
  },
  {
    id: "nav-landing",
    title: "Go to Landing",
    description: "Marketing home page",
    category: "Navigation",
    shortcut: "G H",
    keywords: ["landing", "home", "marketing"],
    href: "/",
  },
  {
    id: "audit-quick",
    title: "Quick Audit",
    description: "Ask AI a single-document question",
    category: "Audit",
    shortcut: "Q",
    keywords: ["audit", "ask", "question"],
  },
  {
    id: "audit-deep",
    title: "Deep Audit",
    description: "Multi-node verification with citations",
    category: "Audit",
    shortcut: "A",
    keywords: ["audit", "deep", "verify"],
  },
  {
    id: "audit-rebuild",
    title: "Rebuild Context",
    description: "Refresh chat history from DB",
    category: "Audit",
    keywords: ["refresh", "reload", "reset"],
  },
  {
    id: "upload",
    title: "Upload Document",
    description: "Send PDF to Vault",
    category: "Utility",
    shortcut: "U",
    keywords: ["upload", "pdf", "vault"],
  },
  {
    id: "search",
    title: "Search Vault",
    description: "Hybrid semantic + keyword search",
    category: "Utility",
    shortcut: "/",
    keywords: ["search", "find", "vault"],
  },
  {
    id: "save",
    title: "Save to Vault",
    description: "Pin current document",
    category: "Utility",
    keywords: ["save", "pin", "favorite"],
  },
  {
    id: "delete",
    title: "Delete Document",
    description: "Permanently remove from Vault",
    category: "Utility",
    keywords: ["delete", "remove", "trash"],
  },
  {
    id: "toggle-orchestrator",
    title: "Toggle Agent Graph",
    description: "Show/hide the live orchestrator panel",
    category: "Tools",
    keywords: ["graph", "orchestrator", "agent"],
  },
  {
    id: "theme",
    title: "Toggle Theme",
    description: "Sovereign stays dark — theme tokens: emerald + zinc",
    category: "System",
    shortcut: "T",
    keywords: ["theme", "dark", "light"],
  },
  {
    id: "sign-out",
    title: "Sign Out",
    description: "Clear Clerk session",
    category: "System",
    keywords: ["sign out", "logout", "exit"],
  },
];

export function formatShortcut(shortcut: string, platform?: "win" | "mac"): string {
  if (!shortcut) return "";
  const isMac =
    platform === "mac" ||
    (typeof window !== "undefined" && /Mac/i.test(navigator.platform));
  if (isMac) return shortcut.replace(/Ctrl/gi, "Cmd");
  return shortcut.replace(/Cmd/gi, "Ctrl");
}

export function getRecentCommands<T extends { id: string }>(
  history: T[],
  limit: number
): T[] {
  if (!Array.isArray(history)) return [];
  return history.slice(0, Math.max(0, limit));
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items?: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open: controlledOpen,
  onOpenChange,
  items,
}) => {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("axiom:commandHistory");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (_) {
        /* ignore malformed payload */
      }
    }
  }, []);

  const record = useCallback((id: string) => {
    setHistory((prev) => {
      const now = Date.now();
      const existing = prev.find((h) => h.id === id);
      const next: CommandHistoryEntry[] = existing
        ? prev.map((h) =>
            h.id === id ? { ...h, timestamp: now, count: h.count + 1 } : h
          )
        : [...prev, { id, timestamp: now, count: 1 }];
      next.sort((a, b) => b.count - a.count || b.timestamp - a.timestamp);
      const trimmed = next.slice(0, 10);
      if (typeof window !== "undefined") {
        localStorage.setItem("axiom:commandHistory", JSON.stringify(trimmed));
      }
      return trimmed;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const commandItems = items ?? DEFAULT_COMMAND_ITEMS;

  const filtered = useMemo(() => parseSearchCommand(search, commandItems), [search, commandItems]);

  const recentlyUsedIds = history.map((h) => h.id);
  const recentItems = useMemo(
    () =>
      recentlyUsedIds
        .map((id) => commandItems.find((c) => c.id === id))
        .filter((c): c is CommandItem => Boolean(c))
        .slice(0, 3),
    [recentlyUsedIds, commandItems]
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      record(item.id);
      setOpen(false);
      if (item.href) {
        router.push(item.href);
        return;
      }
      if (item.action) {
        item.action();
        return;
      }
      window.dispatchEvent(new CustomEvent("axiom:command", { detail: item.id }));
    },
    [record, router]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[12vh] sm:pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          <motion.div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]"
          >
            <Command label="Command Palette">
              <div className="flex items-center border-b border-white/10 px-3 sm:px-4">
                <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search Axiom Engine… try 'audit', 'settings', or '>:navigation'"
                  className="flex h-12 w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                  aria-label="Search commands"
                />
                <kbd className="ml-2 hidden rounded border border-white/10 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline-block">
                  ESC
                </kbd>
              </div>
              <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto py-2 sm:max-h-[55vh]">
                <CommandPrimitive.Empty className="py-12 text-center text-sm text-zinc-500">
                  No commands found.
                </CommandPrimitive.Empty>
                {recentItems.length > 0 && !search && (
                  <CommandPrimitive.Group heading="Recent" className="px-2 pb-1">
                    {recentItems.map((item) => (
                      <CommandRow key={item.id} item={item} onSelect={handleSelect} />
                    ))}
                  </CommandPrimitive.Group>
                )}
                <CommandPrimitive.Group heading="Commands" className="px-2 pb-1">
                  {filtered.map((item) => (
                    <CommandRow key={item.id} item={item} onSelect={handleSelect} />
                  ))}
                </CommandPrimitive.Group>
              </CommandPrimitive.List>
              <div className="hidden items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-zinc-500 sm:flex">
                <div className="flex items-center gap-2">
                  <CommandIcon className="h-3 w-3" aria-hidden />
                  <span>Axiom Command Palette</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="h-3 w-3" aria-hidden /> select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-white/10 bg-zinc-900 px-1">↑↓</kbd> navigate
                  </span>
                </div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

CommandPalette.displayName = "CommandPalette";

interface CommandRowProps {
  item: CommandItem;
  onSelect: (item: CommandItem) => void;
}

const CommandRow: React.FC<CommandRowProps> = React.memo(({ item, onSelect }) => {
  return (
    <CommandPrimitive.Item
      value={`${item.title} ${item.description} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={() => onSelect(item)}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-zinc-200 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 aria-selected:border-emerald-500/40 aria-selected:text-emerald-400">
          {item.icon}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px]">{item.title}</span>
          <span className="truncate text-[11px] text-zinc-500">{item.description}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden rounded border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500 sm:inline-block">
          {item.category}
        </span>
        {item.shortcut && (
          <kbd className="rounded border border-white/10 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            {formatShortcut(item.shortcut)}
          </kbd>
        )}
      </div>
    </CommandPrimitive.Item>
  );
});

CommandRow.displayName = "CommandRow";

export default CommandPalette;
