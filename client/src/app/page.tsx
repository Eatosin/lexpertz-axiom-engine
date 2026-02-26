"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Menu, X } from "lucide-react";
import Link from "next/link";

// COMPONENT IMPORTS
import { HeroSection } from "@/components/landing/hero-section";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { FeaturesBento } from "@/components/landing/features-bento";
import { DashboardShowcase } from "@/components/landing/dashboard-showcase";
import { PricingVault } from "@/components/landing/pricing-vault";
import { Footer } from "@/components/landing/footer";

export default function AxiomLandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-[#050505] text-zinc-300 font-sans overflow-x-hidden selection:bg-brand-primary/40 selection:text-white">
      
      {/* --- SKEUOMORPHIC ATMOSPHERE --- */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* --- INDUSTRIAL NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.08] bg-[#0A0A0A]/60 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 border-t border-white/[0.04] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-10">
          <Link href="/" className="flex items-center gap-3 text-white font-bold tracking-tighter text-lg group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700 shadow-lg flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
              <ShieldCheck className="text-brand-primary" size={16} strokeWidth={2.5} />
            </div>
            <span>Axiom</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-[12px] font-mono uppercase tracking-widest font-bold text-zinc-500">
            <Link href="#architecture" className="hover:text-brand-primary transition-colors">Architecture</Link>
            <Link href="#pricing" className="hover:text-brand-primary transition-colors">Waitlist</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="#pricing" className="relative px-5 py-2 rounded-full bg-gradient-to-b from-brand-primary to-[#065f46] text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all">
              Request Clearance
            </Link>
          </div>

          <button className="md:hidden text-zinc-400" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0A0A0A] border-b border-white/10 px-6 py-8 space-y-6"
            >
              <Link onClick={() => setIsMobileMenuOpen(false)} href="#architecture" className="block text-sm font-bold uppercase tracking-widest">Architecture</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="#pricing" className="block text-sm font-bold uppercase tracking-widest">Waitlist</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard" className="block text-sm font-bold uppercase tracking-widest text-brand-primary">Sign In</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* --- PAGE CONTENT --- */}
      <div className="relative z-10 pt-20">
        
        {/* Strike 1: Hero */}
        <HeroSection />

        {/* Strike 2: The Interactive Simulator (The one you're missing!) */}
        <InteractiveDemo />

        {/* Strike 3: Problem/Solution Callout */}
        <section className="py-24 bg-surface/30 border-y border-white/5 relative">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-6 leading-tight">
              Audit risk is a choice.<br/> <span className="text-brand-primary">Choose evidence.</span>
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed italic">
              &quot;Stop auditing your AI. Let your AI audit the data.&quot;
            </p>
          </div>
        </section>

        {/* Strike 4: Bento Grid */}
        <FeaturesBento />

        {/* Strike 5: Dashboard SVG Showcase */}
        <DashboardShowcase />

        {/* Strike 6: The Pricing/Waitlist Vault */}
        <PricingVault />

        {/* Strike 7: The Master Footer */}
        <Footer />
      </div>

    </main>
  );
}
