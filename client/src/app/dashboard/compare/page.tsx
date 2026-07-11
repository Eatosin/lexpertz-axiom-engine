"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2 } from "lucide-react";

export const metadata = {
  title: "Strategist Node | Axiom Engine",
  description: "Comparative multi-document risk analysis.",
};

export default function ComparePage() {
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("strategist:contexts");
    let query = "/dashboard";

    if (stored) {
      try {
        const contexts = JSON.parse(stored) as string[];
        if (Array.isArray(contexts) && contexts.length >= 2) {
          const params = new URLSearchParams();
          contexts.forEach((c) => params.append("contexts", c));
          params.set("panel", "1");
          query = `/dashboard?${params.toString()}`;
        }
      } catch (_) {
        /* ignore malformed sessionStorage payload */
      }
    }

    const timeout = window.setTimeout(() => router.replace(query), 50);
    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <main className="flex-1 flex flex-col h-full w-full bg-zinc-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-500/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="flex flex-1 items-center justify-center gap-3 text-zinc-500 text-sm font-mono uppercase tracking-widest">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
          <Scale size={20} />
        </div>
        <Loader2 size={18} className="animate-spin text-orange-500" />
        Routing to Strategist Node…
      </div>
    </main>
  );
}
