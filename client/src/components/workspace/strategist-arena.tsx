"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2 } from "lucide-react";

const StrategistArena = () => {
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
    <div className="flex flex-col h-full w-full items-center justify-center relative z-10 text-zinc-500 text-sm font-mono uppercase tracking-widest">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
          <Scale size={20} />
        </div>
        <Loader2 size={18} className="animate-spin text-orange-500" />
        Routing to Sovereign Strategist…
      </div>
    </div>
  );
};

export { StrategistArena };
export default StrategistArena;
