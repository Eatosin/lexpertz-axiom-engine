"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Cpu, Sparkles } from "lucide-react";

import { N8nWorkflowBlock } from "@/components/ui/n8n-workflow-block";

const ACTIVE_NODES = [
  { id: "agent-1", name: "Librarian" },
  { id: "agent-2", name: "Editor" },
  { id: "agent-3", name: "Strategist" },
  { id: "agent-4", name: "Architect" },
  { id: "agent-5", name: "Prosecutor" },
] as const;

export function AgentGraphSection() {
  const [activeIdx, setActiveIdx] = useState(2); // Start at Strategist

  return (
    <section
      id="architecture"
      className="relative w-full bg-gradient-to-b from-zinc-950 via-zinc-900/40 to-zinc-950 py-16 sm:py-20 md:py-32"
      aria-label="Agent orchestrator visualization"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400 sm:text-[11px]">
            <Sparkles size={12} aria-hidden /> Live Orchestrator
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tighter text-white sm:text-4xl md:text-5xl">
            Watch 5 agents reason together
          </h2>
          <p className="mx-auto mt-3 max-w-2xl px-2 text-sm leading-relaxed text-zinc-400 sm:mt-4 sm:text-base">
            Each query flows through our mixture-of-experts graph:{" "}
            <span className="text-emerald-400">Librarian → Editor → Strategist → Architect → Prosecutor</span>.
            Click any node to highlight it on the live graph.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {ACTIVE_NODES.map((node, idx) => (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all sm:gap-4 sm:px-4 sm:py-4 ${
                activeIdx === idx
                  ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)]"
                  : "border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-zinc-900/60"
              }`}
              aria-label={`Highlight ${node.name}`}
              aria-pressed={activeIdx === idx}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                  activeIdx === idx
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/5 text-zinc-400 group-hover:text-white"
                }`}
              >
                <Brain size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 sm:text-[10px]">
                  Step {idx + 1}
                </div>
                <div className="truncate text-sm font-bold text-white sm:text-base">
                  {node.name}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 sm:mt-12">
          <N8nWorkflowBlock
            variant="agent"
            activeNodeId={ACTIVE_NODES[activeIdx]?.id ?? null}
            readonly
            className="shadow-[0_0_80px_-25px_rgba(16,185,129,0.5)]"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4">
          <Stat icon={Cpu} title="5-Node MoE" hint="RDR + LangGraph orchestrated" />
          <Stat
            icon={Sparkles}
            title="<3.2s median latency"
            hint="Streaming SSE — first token arrives pre-render"
          />
          <Stat
            icon={Brain}
            title="RAGAS 1.00"
            hint="Faithfulness, precision, and relevance gated"
          />
        </div>
      </div>
    </section>
  );
}

AgentGraphSection.displayName = "AgentGraphSection";

interface StatProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint?: string;
}

const Stat: React.FC<StatProps> = ({ icon: Icon, title, hint }) => (
  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-emerald-400">
      <Icon size={14} />
      <span className="text-[10px] font-mono uppercase tracking-[0.25em]">{title}</span>
    </div>
    <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{hint}</p>
  </div>
);
