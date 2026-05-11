import React from "react";
import { StrategistArena } from "@/components/workspace/strategist-arena";

export const metadata = {
  title: "Strategist Node | Axiom Engine",
  description: "Comparative multi-document risk analysis.",
};

export default function ComparePage() {
  return (
    <main className="flex-1 flex flex-col h-full w-full bg-zinc-950 relative overflow-hidden">
      {/* Background ambient glow for Strategist Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-500/5 blur-[120px] pointer-events-none rounded-full" />
      
      <StrategistArena />
    </main>
  );
}
