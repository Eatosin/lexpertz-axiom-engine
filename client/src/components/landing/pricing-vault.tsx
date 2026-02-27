"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert, Key } from "lucide-react";
import { cn } from "@/lib/utils";
// IMPORT THE SERVER ACTION
import { submitToWaitlist } from "@/app/actions/waitlist";
// IMPORT THE NEW SKEUOCARD
import { SkeuoCard } from "@/components/ui/skeuo-card";

export function PricingVault() {
  const[email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    
    setStatus("submitting");
    setErrorMessage("");

    try {
      const result = await submitToWaitlist(email);

      if (result.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage(result.error || "Encryption failed.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const dummyTiers =[
    { name: "Starter", price: "$499", desc: "For boutique audit firms." },
    { name: "Pro", price: "$999", desc: "For scaling compliance teams." },
    { name: "Enterprise", price: "Custom", desc: "Dedicated sovereign nodes." }
  ];

  return (
    <section id="pricing" className="relative py-32 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      
      <div className="text-center mb-16 relative z-20">
        <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-4">Commercial Deployment</h2>
        <h3 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Pricing & Licensing</h3>
      </div>

      {/* --- THE BACKGROUND: Blurred Pricing Tiers --- */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 opacity-30 blur-[6px] pointer-events-none select-none grayscale transition-all duration-1000">
        {dummyTiers.map((tier, i) => (
          <div key={i} className="h-[450px] bg-surface border border-white/10 rounded-[32px] p-8 flex flex-col shadow-2xl">
            <h4 className="text-2xl font-bold text-white mb-2">{tier.name}</h4>
            <p className="text-zinc-500 text-sm mb-8">{tier.desc}</p>
            <div className="text-5xl font-black text-white mb-8">{tier.price}<span className="text-lg text-zinc-600 font-normal">/mo</span></div>
            <div className="space-y-4 flex-1">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-4 w-full bg-zinc-800 rounded-md" />
              ))}
            </div>
            <div className="h-12 w-full bg-zinc-800 rounded-xl mt-auto" />
          </div>
        ))}
      </div>

      {/* --- THE FOREGROUND: Clearance Terminal (Now using SkeuoCard) --- */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 pt-32">
        <SkeuoCard 
          glowColor="rgba(16, 185, 129, 0.2)"
          className="w-full max-w-md bg-[#0A0A0A]/90 backdrop-blur-2xl p-0 flex flex-col"
        >
          {/* Danger Striping Top Border (Overlaying the SkeuoCard Bevel) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#10b981,#10b981_10px,#065f46_10px,#065f46_20px)] z-30" />

          <div className="p-8 space-y-8 flex-1">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Lock className="text-brand-primary" size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white tracking-tight">Commercial Access Restricted</h4>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Axiom V3.0 is currently restricted to select enterprise design partners. Request clearance to join the waitlist.
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-primary/10 border border-brand-primary/30 rounded-2xl p-6 text-center space-y-3">
                  <CheckCircle2 className="text-brand-primary mx-auto" size={32} />
                  <h5 className="text-brand-primary font-bold tracking-widest uppercase text-xs">Clearance Requested</h5>
                  <p className="text-zinc-400 text-xs">Your cryptographic signature has been securely logged. We will contact you shortly.</p>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-primary transition-colors" size={18} />
                    <input 
                      type="email" required placeholder="Enter corporate email..."
                      value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === "submitting"}
                      className={cn(
                        "w-full bg-[#111] border focus:border-brand-primary/50 rounded-xl py-4 pl-12 pr-4 text-white text-sm outline-none transition-all placeholder:text-zinc-600 shadow-inner disabled:opacity-50 relative z-40",
                        status === "error" ? "border-red-500/50" : "border-zinc-800"
                      )}
                    />
                  </div>
                  
                  {/* Error Feedback */}
                  {status === "error" && (
                    <p className="text-red-500 text-xs text-center font-mono">{errorMessage}</p>
                  )}

                  <button 
                    type="submit" disabled={status === "submitting" || !email}
                    className="w-full relative z-40 px-6 py-4 bg-brand-primary rounded-xl text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(16,185,129,0.2)]"
                  >
                    {status === "submitting" ? (
                      <span className="flex items-center gap-2 animate-pulse"><ShieldAlert size={16} /> Encrypting Payload...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Key size={16} /> Request Clearance <ArrowRight size={16} /></span>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          
          <div className="bg-[#050505] p-4 border-t border-zinc-800 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-auto">
            <Lock size={12} /> AES-256 Encrypted Waitlist
          </div>
        </SkeuoCard>
      </div>

    </section>
  );
            }
