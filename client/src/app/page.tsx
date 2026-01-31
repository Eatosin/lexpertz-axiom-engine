import { Activity, ShieldCheck, Server } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Axiom Engine</h1>
            <p className="text-xs text-zinc-500 font-mono">System Status: ONLINE</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Server size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300">Vector Database</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300">Inference Node</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-600">Enterprise Monorepo • Client v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
