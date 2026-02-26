"use client";

import Link from "next/link";
import { ShieldCheck, Github, Twitter, Linkedin, Globe } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#050505] border-t border-white/5 pt-20 pb-10 px-6 overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          
          {/* Brand Column */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-white font-bold tracking-tighter text-lg">
              <ShieldCheck className="text-brand-primary" size={24} />
              Axiom Engine
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              The world’s first Evidence-Gated Agentic Engine. Built for high-stakes auditing in regulated industries.
            </p>
            <div className="flex items-center gap-4 text-zinc-600">
              <Link href="#" className="hover:text-white transition-colors"><Twitter size={18} /></Link>
              <Link href="#" className="hover:text-white transition-colors"><Github size={18} /></Link>
              <Link href="#" className="hover:text-white transition-colors"><Linkedin size={18} /></Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">Platform</h5>
            <ul className="flex flex-col gap-3 text-sm text-zinc-500">
              <li><Link href="#architecture" className="hover:text-brand-primary transition-colors">The Engine</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-primary transition-colors">Workspace</Link></li>
              <li><Link href="#vault" className="hover:text-brand-primary transition-colors">Sovereign Vault</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">Company</h5>
            <ul className="flex flex-col gap-3 text-sm text-zinc-500">
              <li><Link href="#" className="hover:text-brand-primary transition-colors">About Lexpertz</Link></li>
              <li><Link href="#" className="hover:text-brand-primary transition-colors">Contact Sales</Link></li>
              <li><Link href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Compliance Badge Column */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">Compliance</h5>
            <div className="flex flex-col gap-2">
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 group hover:border-brand-primary/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200">SOC 2 TYPE II</span>
              </div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 group hover:border-brand-secondary/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
                <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200">GDPR COMPLIANT</span>
              </div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 group hover:border-purple-500/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200">ISO 27001</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
            Lexpertz AI Ecosystem © {currentYear} • Standard AI Guesses, Axiom Proves.
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
            <Globe size={12} /> Status: All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
      }
