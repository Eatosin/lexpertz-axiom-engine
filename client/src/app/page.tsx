import { UserButton } from "@clerk/nextjs";
import { VerificationDashboard } from "@/components/verification-dashboard";

export default function DashboardHome() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 space-y-12 relative overflow-hidden">
      
      {/* 1. Subtle Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-cyan-500/5 rounded-full blur-[120px] -z-10" />

      {/* 2. Professional Identity Header (Top Right) */}
      <div className="absolute top-8 right-8 z-50">
        <UserButton 
          afterSignOutUrl="/" 
          appearance={{
            elements: {
              userButtonAvatarBox: "border border-brand-cyan/40 hover:border-brand-cyan transition-colors"
            }
          }}
        />
      </div>

      {/* 3. Logic Hub Title */}
      <div className="text-center space-y-2 z-10">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
          Command Center
        </h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em]">
          Axiom Engine • Edge Node 01
        </p>
      </div>

      {/* 4. The Agentic Reasoning Engine */}
      <div className="w-full max-w-5xl z-10">
        <VerificationDashboard />
      </div>
      
      <footer className="fixed bottom-8 text-[10px] font-mono text-zinc-700 tracking-widest uppercase">
        Enterprise Governance Protocol v1.0.4-Stable
      </footer>
    </main>
  );
}
