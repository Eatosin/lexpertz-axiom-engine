"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

// We will build these modular components in the next steps
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesBento } from "@/components/landing/features-bento";
import { PricingVault } from "@/components/landing/pricing-vault";
import { Footer } from "@/components/landing/footer";

export default function AxiomLandingPage() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch on physics-based elements
  useEffect(() => {
    setMounted(true);
  },[]);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-[#050505] text-zinc-300 font-sans overflow-x-hidden selection:bg-brand-primary/40 selection:text-white">
      
      {/* --- THE SKEUOMORPHIC ATMOSPHERE --- */}
      {/* 1. SVG Noise Texture (Grain) */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* 2. Retro-Futuristic CRT Scanlines */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* 3. Deep Ambient Glows */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_60%)] z-[1]" />

      {/* --- INDUSTRIAL NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.08] bg-[#0A0A0A]/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {/* Inner Top Bevel for the Nav Bar */}
        <div className="absolute inset-0 border-t border-white/[0.04] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-10">
          <Link href="/" className="flex items-center gap-3 text-white font-bold tracking-tighter text-lg group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:shadow-[inset_0_1px_1px_rgba(16,185,129,0.4),0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300">
              <ShieldCheck className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={16} strokeWidth={2.5} />
            </div>
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Axiom</span>
          </Link>
          
          <div className="flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            <Link href="#architecture" className="hover:text-white drop-shadow-md transition-colors hidden md:block">Architecture</Link>
            <Link href="#pricing" className="hover:text-white drop-shadow-md transition-colors hidden md:block">Pricing</Link>
            <Link href="/sign-in" className="hover:text-white drop-shadow-md transition-colors">Sign In</Link>
            
            {/* Skeuomorphic Button */}
            <Link href="/dashboard" className="relative px-5 py-2 rounded-full bg-gradient-to-b from-brand-primary to-[#065f46] text-black font-bold tracking-wide shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_15px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_0_25px_rgba(16,185,129,0.6)] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] transition-all duration-200">
              Deploy Audit
            </Link>
          </div>
        </div>
      </nav>

      {/* --- PAGE CONTENT (Z-Index 10 puts it above the noise/scanlines) --- */}
      <div className="relative z-10 pt-24">
        {/* We will mount the modular sections here */}
        <HeroSection />
        <FeaturesBento />
        <PricingVault />
        <Footer />
      </div>

    </main>
  );
}
