"use client";

// Adapted from 21st.dev Magic: N8N Workflow Block (id: 10645) by moumensoliman
// Source: https://21st.dev/r/moumensoliman/n8n-workflow-block-shadcnui
// Adapted for Axiom Engine: dark zinc theme, agent-node palette tied to backend's 5-node MoE.

import * as React from "react";
import { motion, type PanInfo } from "framer-motion";
import { flushSync } from "react-dom";
import {
  ArrowRight,
  Database,
  Mail,
  Plus,
  Settings,
  Webhook,
  Zap,
  Brain,
  GitBranch,
  Gavel,
  ShieldAlert,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeColorClasses {
  icon: string;
  iconBackground: string;
  card: string;
  pulse: string;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 110;

const colorClasses: Record<string, NodeColorClasses> = {
  emerald: {
    icon: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
    iconBackground: "border-emerald-400/40 bg-emerald-400/10",
    card: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    pulse: "bg-emerald-400",
  },
  blue: {
    icon: "border-blue-400/40 bg-blue-400/10 text-blue-400",
    iconBackground: "border-blue-400/40 bg-blue-400/10",
    card: "border-blue-400/30 bg-blue-400/10 text-blue-400",
    pulse: "bg-blue-400",
  },
  amber: {
    icon: "border-amber-400/40 bg-amber-400/10 text-amber-400",
    iconBackground: "border-amber-400/40 bg-amber-400/10",
    card: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    pulse: "bg-amber-400",
  },
  purple: {
    icon: "border-purple-400/40 bg-purple-400/10 text-purple-400",
    iconBackground: "border-purple-400/40 bg-purple-400/10",
    card: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    pulse: "bg-purple-400",
  },
  indigo: {
    icon: "border-indigo-400/40 bg-indigo-400/10 text-indigo-400",
    iconBackground: "border-indigo-400/40 bg-indigo-400/10",
    card: "border-indigo-400/30 bg-indigo-400/10 text-indigo-400",
    pulse: "bg-indigo-400",
  },
  orange: {
    icon: "border-orange-400/40 bg-orange-400/10 text-orange-400",
    iconBackground: "border-orange-400/40 bg-orange-400/10",
    card: "border-orange-400/30 bg-orange-400/10 text-orange-400",
    pulse: "bg-orange-400",
  },
  red: {
    icon: "border-red-400/40 bg-red-400/10 text-red-400",
    iconBackground: "border-red-400/40 bg-red-400/10",
    card: "border-red-400/30 bg-red-400/10 text-red-400",
    pulse: "bg-red-400",
  },
};

export interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "agent";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof colorClasses;
  position: { x: number; y: number };
  status?: "idle" | "active" | "complete" | "error";
}

export interface WorkflowConnection {
  from: string;
  to: string;
}

const agentNodeTemplates: Array<Omit<WorkflowNode, "id" | "position">> = [
  {
    type: "agent",
    title: "Librarian",
    description: "RDR retrieval & context assembly",
    icon: Library,
    color: "blue",
    status: "idle",
  },
  {
    type: "agent",
    title: "Editor",
    description: "Distill & compress evidence",
    icon: GitBranch,
    color: "indigo",
    status: "idle",
  },
  {
    type: "agent",
    title: "Strategist",
    description: "Comparative deltas across contexts",
    icon: Brain,
    color: "orange",
    status: "idle",
  },
  {
    type: "agent",
    title: "Architect",
    description: "Draft grounded generation",
    icon: Zap,
    color: "purple",
    status: "idle",
  },
  {
    type: "agent",
    title: "Prosecutor",
    description: "Hallucination & faithfulness gate",
    icon: Gavel,
    color: "red",
    status: "idle",
  },
];

const utilityNodeTemplates: Array<Omit<WorkflowNode, "id" | "position">> = [
  {
    type: "trigger",
    title: "Document Upload",
    description: "Receive PDF from the Vault",
    icon: Webhook,
    color: "emerald",
    status: "idle",
  },
  {
    type: "action",
    title: "Embed to pgvector",
    description: "Persist embedding to Supabase",
    icon: Database,
    color: "blue",
    status: "idle",
  },
  {
    type: "action",
    title: "Notify User",
    description: "Push notification with verdict",
    icon: Mail,
    color: "indigo",
    status: "idle",
  },
];

interface N8nWorkflowBlockProps {
  variant?: "agent" | "utility";
  initialNodes?: WorkflowNode[];
  initialConnections?: WorkflowConnection[];
  activeNodeId?: string | null;
  readonly?: boolean;
  className?: string;
}

export const N8nWorkflowBlock: React.FC<N8nWorkflowBlockProps> = ({
  variant = "agent",
  initialNodes,
  initialConnections,
  activeNodeId,
  readonly = false,
  className,
}) => {
  const seedNodes = useSeedGraph(variant, initialNodes);
  const seedConnections = initialConnections ?? defaultConnections(seedNodes);
  const [nodes, setNodes] = React.useState<WorkflowNode[]>(seedNodes);
  const [connections, setConnections] =
    React.useState<WorkflowConnection[]>(seedConnections);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const dragStartPosition = React.useRef<{ x: number; y: number } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNodes(seedNodes);
    setConnections(seedConnections);
  }, [seedNodes, seedConnections]);

  const displayNodes = React.useMemo(() => {
    if (!activeNodeId) return nodes;
    return nodes.map((n) =>
      n.id === activeNodeId ? { ...n, status: "active" as const } : n
    );
  }, [nodes, activeNodeId]);

  const contentSize = React.useMemo(() => {
    const maxX = Math.max(...displayNodes.map((n) => n.position.x + NODE_WIDTH));
    const maxY = Math.max(...displayNodes.map((n) => n.position.y + NODE_HEIGHT));
    return { width: maxX + 60, height: maxY + 60 };
  }, [displayNodes]);

  const handleDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      dragStartPosition.current = { x: node.position.x, y: node.position.y };
    }
  };

  const handleDrag = (nodeId: string, info: PanInfo) => {
    if (draggingNodeId !== nodeId || !dragStartPosition.current) return;
    const newX = Math.max(
      0,
      dragStartPosition.current.x + info.offset.x + (info.point?.x ?? 0) *
        0
    );
    void newX;
    const constrainedX = Math.max(
      0,
      Math.min(
        50000,
        dragStartPosition.current.x + info.delta.x
      )
    );
    const constrainedY = Math.max(
      0,
      Math.min(
        50000,
        dragStartPosition.current.y + info.delta.y
      )
    );

    flushSync(() => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, position: { x: constrainedX, y: constrainedY } }
            : node
        )
      );
    });
  };

  const handleDragEnd = () => {
    setDraggingNodeId(null);
    dragStartPosition.current = null;
  };

  const addNode = () => {
    if (readonly) return;
    const pool = variant === "agent" ? utilityNodeTemplates : agentNodeTemplates;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const last = nodes[nodes.length - 1];
    const newPosition = last
      ? { x: last.position.x + 240, y: last.position.y }
      : { x: 50, y: 100 };

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      ...template,
      position: newPosition,
    };

    flushSync(() => {
      setNodes((prev) => [...prev, newNode]);
      if (last) {
        setConnections((prev) => [...prev, { from: last.id, to: newNode.id }]);
      }
    });

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollTo({
        left: newPosition.x + NODE_WIDTH - canvas.clientWidth + 100,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur p-3 sm:p-4 md:p-6",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-emerald-400 sm:px-3 sm:py-1 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
            {variant === "agent" ? "Agents Online" : "Workflow Online"}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.25em] text-zinc-500 sm:inline">
            {variant === "agent" ? "5-Node MoE Orchestrator" : "Workflow Builder"}
          </span>
        </div>
        {!readonly && (
          <button
            onClick={addNode}
            type="button"
            aria-label="Add new node"
            className="flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:bg-white/10 hover:text-white sm:px-3"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Add Node</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      <div
        ref={canvasRef}
        className="relative h-[320px] w-full overflow-auto rounded-xl border border-white/5 bg-zinc-950/40 sm:h-[420px] md:h-[520px]"
        role="region"
        aria-label="Workflow canvas"
        tabIndex={0}
        style={{ minHeight: 320 }}
      >
        <div
          className="relative"
          style={{
            minWidth: contentSize.width,
            minHeight: contentSize.height,
          }}
        >
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={contentSize.width}
            height={contentSize.height}
            style={{ overflow: "visible" }}
            aria-hidden
          >
            {connections.map((c) => (
              <WorkflowConnectionLine
                key={`${c.from}-${c.to}`}
                from={c.from}
                to={c.to}
                nodes={displayNodes}
              />
            ))}
          </svg>
          {displayNodes.map((node) => {
            const Icon = node.icon;
            const isDragging = draggingNodeId === node.id;
            const isActive = node.status === "active";
            const palette = colorClasses[node.color];
            return (
              <motion.div
                key={node.id}
                drag={!readonly && (("deltaX" in node) as never)}
                dragMomentum={false}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(_, info) => handleDrag(node.id, info)}
                onDragEnd={handleDragEnd}
                style={{
                  x: node.position.x,
                  y: node.position.y,
                  width: NODE_WIDTH,
                  transformOrigin: "0 0",
                }}
                className="absolute cursor-grab"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileDrag={{ scale: 1.05, zIndex: 50 }}
                aria-grabbed={isDragging}
                aria-label={`${node.type} node: ${node.title}`}
              >
                <div
                  className={cn(
                    "group/node relative w-full overflow-hidden rounded-xl border bg-zinc-950/70 p-2.5 backdrop-blur transition-all hover:shadow-lg sm:p-3",
                    isActive
                      ? `${palette.icon.replace("text-", "ring-2 ")} shadow-2xl`
                      : `${palette.card}`
                  )}
                  role="article"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/node:opacity-100" />
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border sm:h-8 sm:w-8",
                          palette.iconBackground
                        )}
                        aria-hidden
                      >
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="mb-0.5 inline-block truncate rounded-full border border-white/10 bg-zinc-950/80 px-1.5 py-0 text-[9px] uppercase tracking-[0.15em] text-zinc-500">
                          {node.status === "active"
                            ? "⚡ Active"
                            : node.type}
                        </span>
                        <h3 className="truncate text-xs font-semibold tracking-tight text-white">
                          {node.title}
                        </h3>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-400">
                      {node.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <ArrowRight className="h-2.5 w-2.5" aria-hidden />
                      <span className="uppercase tracking-[0.1em]">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 backdrop-blur sm:mt-4 sm:px-4 sm:py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", colorClasses.emerald.pulse)} aria-hidden />
            <span className="uppercase tracking-[0.15em]">
              {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", colorClasses.blue.pulse)}
              aria-hidden
            />
            <span className="uppercase tracking-[0.15em]">
              {connections.length}{" "}
              {connections.length === 1 ? "Connection" : "Connections"}
            </span>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {variant === "agent" ? "Live SSE updates drive graph" : "Drag nodes to reposition"}
        </p>
      </div>
    </div>
  );
};

N8nWorkflowBlock.displayName = "N8nWorkflowBlock";

const WorkflowConnectionLine: React.FC<{
  from: string;
  to: string;
  nodes: WorkflowNode[];
}> = ({ from, to, nodes }) => {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;
  const isActiveEdge = fromNode.status === "active";
  const palette = colorClasses[fromNode.color];

  const startX = fromNode.position.x + NODE_WIDTH;
  const startY = fromNode.position.y + NODE_HEIGHT / 2;
  const endX = toNode.position.x;
  const endY = toNode.position.y + NODE_HEIGHT / 2;

  const cp1X = startX + (endX - startX) * 0.5;
  const cp2X = endX - (endX - startX) * 0.5;

  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isActiveEdge ? "#10b981" : "currentColor"}
        strokeWidth={isActiveEdge ? 3 : 2}
        strokeDasharray={isActiveEdge ? undefined : "8,6"}
        strokeLinecap="round"
        opacity={isActiveEdge ? 0.8 : 0.35}
        className={cn("text-zinc-600", palette.pulse, isActiveEdge && "drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]")}
      />
      {isActiveEdge && (
        <circle r="4" fill="#10b981">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={path}
          />
        </circle>
      )}
    </g>
  );
};

WorkflowConnectionLine.displayName = "WorkflowConnectionLine";

export function defaultConnections(nodes: WorkflowNode[]): WorkflowConnection[] {
  const out: WorkflowConnection[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    out.push({ from: nodes[i].id, to: nodes[i + 1].id });
  }
  return out;
}

function useSeedGraph(
  variant: "agent" | "utility",
  overrides?: WorkflowNode[]
): WorkflowNode[] {
  return React.useMemo(() => {
    if (overrides) return overrides;
    if (variant === "agent") {
      return buildAgentSeedGraph();
    }
    return buildUtilitySeedGraph();
  }, [variant, overrides]);
}

export function buildAgentSeedGraph(): WorkflowNode[] {
  return agentNodeTemplates.map((tpl, idx) => ({
    ...tpl,
    id: `agent-${idx + 1}`,
    position: { x: 50 + idx * (NODE_WIDTH + 60), y: 100 },
  }));
}

export function buildUtilitySeedGraph(): WorkflowNode[] {
  return [
    { ...utilityNodeTemplates[0], id: "util-1", position: { x: 50, y: 100 } },
    { ...utilityNodeTemplates[1], id: "util-2", position: { x: 310, y: 100 } },
    { ...utilityNodeTemplates[2], id: "util-3", position: { x: 570, y: 100 } },
  ];
}

export default N8nWorkflowBlock;
