"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Cpu, Database, Network } from "lucide-react";

export function DashboardShowcase() {
  return (
    <section id="architecture" className="py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
        
        {/* Left: Exploded View Text */}
        <div className="flex-1 space-y-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-[1.1]">
            A Sovereign <br/>
            <span className="text-brand-primary">Audit Infrastructure.</span>
          </h2>
          <p className="text-zinc-500 text-lg leading-relaxed">
            While others build wrappers, we built a physical logic gate. Every query travels through a dedicated multi-agent circuit.
          </p>
          
          <div className="space-y-4 pt-6">
            {[
              { icon: Database, label: "HNSW Vector Library", color: "text-brand-primary" },
              { icon: Cpu, label: "Llama 3.3 70B Reasoner", color: "text-brand-secondary" },
              { icon: Network, label: "Recursive Graph Routing", color: "text-purple-500" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-brand-primary/50 transition-colors">
                  <item.icon className={item.color} size={18} />
                </div>
                <span className="text-sm font-mono uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: The SVG Dashboard "X-Ray" */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-brand-primary/10 blur-[100px] rounded-full animate-pulse" />
          
          <motion.div 
            initial={{ rotateY: 10, rotateX: 5 }}
            whileInView={{ rotateY: -10, rotateX: -5 }}
            transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="relative perspective-1000"
          >
            <svg viewBox="0 0 600 400" className="w-full h-auto drop-shadow-2xl filter saturate-150">
              {/* Main Dashboard Frame */}
              <rect x="20" y="20" width="560" height="360" rx="20" fill="#0d0d0d" stroke="#333" strokeWidth="1" />
              
              {/* Sidebar Mask */}
              <rect x="20" y="20" width="140" height="360" rx="20" fill="#111" />
              <line x1="160" y1="20" x2="160" y2="380" stroke="#222" />
              
              {/* Simulated Sidebar Items */}
              <rect x="40" y="60" width="100" height="8" rx="4" fill="#333" />
              <rect x="40" y="80" width="100" height="8" rx="4" fill="#1a1a1a" />
              <rect x="40" y="100" width="80" height="8" rx="4" fill="#1a1a1a" />
              
              {/* The "Neural" Core Visualization (Animated Lines) */}
              <motion.path 
                d="M180 100 Q 300 100 350 200" 
                stroke="#10b981" fill="none" strokeWidth="2" strokeDasharray="10 10" 
                animate={{ strokeDashoffset: [-100, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              />
              <motion.path 
                d="M180 300 Q 300 300 350 220" 
                stroke="#0ea5e9" fill="none" strokeWidth="2" strokeDasharray="10 10" 
                animate={{ strokeDashoffset: [100, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              />
              
              {/* Central Processor Node */}
              <rect x="340" y="180" width="60" height="60" rx="12" fill="#10b981" fillOpacity="0.1" stroke="#10b981" />
              <ShieldCheck x="355" y="195" width="30" height="30" className="text-brand-primary" />
              
              {/* Floating Stat Cards */}
              <motion.rect 
                x="450" y="60" width="100" height="60" rx="12" fill="#111" stroke="#333"
                animate={{ y: [60, 50, 60] }} transition={{ repeat: Infinity, duration: 4 }}
              />
              <text x="465" y="85" fill="#555" fontSize="10" fontFamily="monospace">ACCURACY</text>
              <text x="465" y="105" fill="#10b981" fontSize="14" fontWeight="bold">100%</text>

              <motion.rect 
                x="450" y="150" width="100" height="60" rx="12" fill="#111" stroke="#333"
                animate={{ y: [150, 160, 150] }} transition={{ repeat: Infinity, duration: 5 }}
              />
              <text x="465" y="175" fill="#555" fontSize="10" fontFamily="monospace">LATENCY</text>
              <text x="465" y="195" fill="#0ea5e9" fontSize="14" fontWeight="bold">2.4s</text>
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
        }
