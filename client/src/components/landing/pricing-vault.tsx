"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert, Key, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
// IMPORT THE SERVER ACTION
import { submitToWaitlist } from "@/app/actions/waitlist";
// IMPORT THE SKEUOCARD
import { SkeuoCard } from "@/components/landing/ui/skeuo-card";

export function PricingVault() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialRotation, setDialRotation] = useState(0);

  // Rotate combination dial based on length of input text for tactile feedback
  useEffect(() => {
    setDialRotation(email.length * 15);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    
    setStatus("submitting");
    setErrorMessage("");

    try {
      const result = await submitToWaitlist(email);

      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.error || "Encryption failed.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("Secure uplink failed.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const dummyTiers = [
    { name: "Sovereign Starter", price: "$499", desc: "For boutique audit firms needing automated compliance.", nodes: "1 Dedicated Node" },
    { name: "Enterprise Pro", price: "$999", desc: "For scaling teams with continuous legal checks.", nodes: "4 Dedicated Nodes" },
    { name: "Custom Infrastructure", price: "Custom", desc: "Complete localized hybrid deployment.", nodes: "Sovereign Mainframe cluster" }
  ];

  return (
    <section id="pricing" className="relative py-32 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[90vh]">
      
      <div className="text-center mb-16 relative z-20">
        <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-4">Commercial Deployment</h2>
        <h3 className="text-4xl md:text-5xl font-black tracking-tight text-white">Pricing & Licensing</h3>
      </div>

      {/* --- THE BACKGROUND: Tiers decrypt/unblur dynamically upon submission success --- */}
      <div className={cn(
        "w-full grid grid-cols-1 md:grid-cols-3 gap-6 select-none transition-all duration-1000",
        status === "success" 
          ? "opacity-100 blur-0 grayscale-0 pointer-events-auto" 
          : "opacity-[0.18] blur-[8px] pointer-events-none grayscale"
      )}>
        {dummyTiers.map((tier, i) => (
          <div 
            key={i} 
            className="h-[460px] bg-magnesium-deck border-beveled rounded-[24px] p-8 flex flex-col shadow-2xl relative"
          >
            <div className="absolute top-3 right-3 opacity-20">
              <span className="text-[8px] font-mono">CHASSIS_SLOT_0{i + 1}</span>
            </div>

            <h4 className="text-2xl font-black text-white mb-2 tracking-tight">{tier.name}</h4>
            <p className="text-zinc-500 text-[11px] font-mono mb-8 h-10 leading-relaxed">{tier.desc}</p>
            
            <div className="text-5xl font-black text-white mb-8 tracking-tighter">
              {tier.price}
              {tier.price !== "Custom" && <span className="text-sm text-zinc-500 font-mono tracking-normal">/mo</span>}
            </div>
            
            <div className="space-y-4 flex-1 border-t border-white/[0.03] pt-6">
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase">
                <ShieldCheck size={12} className="text-brand-primary" />
                <span>{tier.nodes}</span>
              </div>
              <div className="h-[1px] w-full bg-zinc-900" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span className="text-[10px] font-mono text-zinc-500">Telemetry diagnostics channel {item}</span>
                </div>
              ))}
            </div>

            <button className="h-12 w-full rounded-xl mt-auto border-beveled bg-black text-brand-primary font-mono text-[10px] uppercase tracking-widest hover:bg-zinc-900 transition-colors">
              Access Granted
            </button>
          </div>
        ))}
      </div>

      {/* --- THE FOREGROUND: Clearance Terminal --- */}
      <AnimatePresence mode="wait">
        {status !== "success" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 pt-16">
            <SkeuoCard 
              glowColor="rgba(16, 185, 129, 0.15)"
              className="w-full max-w-md bg-magnesium-deck border-beveled p-0 flex flex-col overflow-hidden"
            >
              {/* Danger Striping Top Bevel Overlay */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#10b981,#10b981_10px,#053e2e_10px,#053e2e_20px)] z-30" />

              <div className="p-8 space-y-6 flex-1 relative z-10">
                <div className="flex flex-col items-center text-center space-y-4">
                  
                  {/* Dynamic Physical Combination Lock Dial */}
                  <div className="w-24 h-24 rounded-full bg-black border-beveled flex items-center justify-center shadow-groove relative overflow-hidden">
                    <div className="absolute inset-0 screen-glare pointer-events-none" />
                    
                    <svg 
                      className="w-20 h-20 transition-transform duration-150 ease-out"
                      style={{ transform: `rotate(${dialRotation}deg)` }}
                      viewBox="0 0 100 100"
                    >
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="2" />
                      {/* Combination ticks */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        return (
                          <line 
                            key={i}
                            x1={50 + 34 * Math.sin(angle)}
                            y1={50 - 34 * Math.cos(angle)}
                            x2={50 + 38 * Math.sin(angle)}
                            y2={50 - 38 * Math.cos(angle)}
                            stroke="#3f3f46"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                      <circle cx="50" cy="18" r="2.5" fill="#ef4444" /> {/* Align pin */}
                    </svg>

                    <div className="absolute w-8 h-8 rounded-full bg-[#181a1b] border border-zinc-800 shadow-inner flex items-center justify-center">
                      <Lock className="text-zinc-500" size={12} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-white tracking-wide uppercase">Commercial Access Restricted</h4>
                    <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed font-mono">
                      Axiom is restricted to authorized design partners. Request clearance below to submit credentials [1].
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-primary transition-colors" size={16} />
                    <input 
                      type="email" 
                      required 
                      placeholder="ENTER SECURE EMAIL..."
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      disabled={status === "submitting"}
                      className={cn(
                        "w-full bg-black border focus:border-brand-primary/40 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-xs outline-none transition-all placeholder:text-zinc-700 shadow-groove disabled:opacity-50 relative z-40",
                        status === "error" ? "border-red-500/50 text-red-500" : "border-zinc-800"
                      )}
                    />
                  </div>
                  
                  {status === "error" && (
                    <p className="text-red-500 text-[10px] text-center font-mono tracking-widest uppercase">{errorMessage}</p>
                  )}

                  {/* 3D Depress Button */}
                  <button 
                    type="submit" 
                    disabled={status === "submitting" || !email}
                    className="w-full relative z-40 px-6 py-4 bg-gradient-to-b from-brand-primary to-[#065f46] text-black font-black uppercase tracking-widest text-[10px] border-beveled rounded-xl shadow-[0_4px_0_#044e37,inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(16,185,129,0.15)] hover:translate-y-[2px] hover:shadow-[0_2px_0_#044e37,0_8px_15px_rgba(16,185,129,0.2)] active:translate-y-[4px] active:shadow-[0_0_0_#044e37,inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {status === "submitting" ? (
                      <span className="flex items-center gap-2 animate-pulse">
                        <ShieldAlert size={14} /> Encrypting Link...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Key size={14} /> Request Clearance <ArrowRight size={14} />
                      </span>
                    )}
                  </button>
                </form>
              </div>
              
              <div className="bg-black/50 p-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[8px] font-mono text-zinc-600 uppercase tracking-[0.2em] mt-auto">
                <Lock size={10} /> AES-256 System Encryption [1]
              </div>
            </SkeuoCard>
          </div>
        ) : (
          /* SUCCESS DISPLAY Panel: Prompts user to explore decrypted tiers */
          <motion.div 
            key="success" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 pt-16 pointer-events-none"
          >
            <div className="w-full max-w-sm bg-black/90 backdrop-blur-md border-beveled p-8 rounded-2xl shadow-2xl text-center space-y-4 pointer-events-auto">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto shadow-groove">
                <CheckCircle2 className="text-brand-primary filter drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" size={24} />
              </div>
              
              <div className="space-y-1">
                <h5 className="text-brand-primary font-black tracking-widest uppercase text-xs">
                  Access Granted // Decrypted
                </h5>
                <p className="text-zinc-500 text-[10px] font-mono leading-relaxed">
                  Credentials verified [1]. Structural barriers are offline. You can now inspect commercial tier allocations below [1].
                </p>
              </div>

              <div className="text-[9px] font-mono text-zinc-600 uppercase border-t border-zinc-900 pt-3">
                Mainframe Link Active
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
