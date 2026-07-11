"use client";

import { useEffect, useState } from "react";
import { Inter } from "next/font/google";

import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { AgentGraphSection } from "@/components/landing/agent-graph";
import { FeaturesBento } from "@/components/landing/features-bento";
import { DashboardShowcase } from "@/components/landing/dashboard-showcase";
import { PricingVault } from "@/components/landing/pricing-vault";
import { Footer } from "@/components/landing/footer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function AxiomLandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main
      className={`relative min-h-screen overflow-x-hidden bg-[#050505] font-sans text-zinc-300 selection:bg-emerald-500/40 selection:text-white ${inter.className}`}
    >
      <SovereignAtmosphere />
      <LandingNav />

      <div className="relative z-10 pt-20 sm:pt-24">
        <HeroSection />
        <InteractiveDemo />
        <AgentGraphSection />
        <Callout />
        <FeaturesBento />
        <DashboardShowcase />
        <PricingVault />
        <Footer />
        <TerminalFooter />
      </div>
    </main>
  );
}

const SovereignAtmosphere = () => (
  <>
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"
    />
  </>
);

const Callout = () => (
  <section className="relative border-y border-white/5 bg-zinc-950/30 py-16 sm:py-20 md:py-24">
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
      <h2 className="mb-4 text-2xl font-black leading-tight tracking-tighter text-white sm:mb-6 sm:text-4xl md:text-5xl">
        Audit risk is a choice.{" "}
        <span className="text-emerald-500">Choose evidence.</span>
      </h2>
      <p className="mx-auto max-w-2xl text-sm italic leading-relaxed text-zinc-500 sm:text-base md:text-lg">
        "Stop auditing your AI. Let your AI audit the data."
      </p>
    </div>
  </section>
);

const TerminalFooter = () => (
  <footer className="flex h-8 w-full shrink-0 items-center justify-between border-t border-white/5 bg-zinc-950 px-4 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600 sm:px-6 sm:text-[10px]">
    <span className="truncate">Axiom OS v4.6.0 · Sovereign Agentic</span>
    <div className="flex items-center gap-3 sm:gap-4">
      <span className="flex items-center gap-1.5 text-emerald-500/70">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        Logic: Active
      </span>
      <span className="hidden md:inline">Node: EDGE-01-NG</span>
    </div>
  </footer>
);
