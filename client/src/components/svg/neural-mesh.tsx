"use client";

import { motion } from "framer-motion";

export function NeuralMesh({ className }: { className?: string }) {
  // Animation for the "Data Packets" flowing through the lines
  const pulseTransition = {
    duration: 3,
    repeat: Infinity,
    ease: "linear",
  };

  return (
    <div className={className}>
      <svg
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto filter drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
      >
        {/* --- THE BACKBONE (Skeuomorphic Wires) --- */}
        <path d="M50 150 H350" stroke="#1e1e20" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M200 50 V250" stroke="#1e1e20" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* --- ACTIVE CIRCUIT PATHS --- */}
        {/* Librarian to Architect */}
        <motion.path
          d="M80 150 Q 200 150 200 80"
          stroke="url(#gradient-emerald)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
        
        {/* Editor to Prosecutor */}
        <motion.path
          d="M200 220 Q 200 150 320 150"
          stroke="url(#gradient-sky)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* --- NODE HUBS (The Agent Logic Gates) --- */}
        {/* Top: Architect */}
        <circle cx="200" cy="70" r="12" fill="#0A0A0A" stroke="#333" />
        <motion.circle 
          cx="200" cy="70" r="4" fill="#0ea5e9"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={pulseTransition}
        />

        {/* Bottom: Editor */}
        <circle cx="200" cy="230" r="12" fill="#0A0A0A" stroke="#333" />
        <motion.circle 
          cx="200" cy="230" r="4" fill="#10b981"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ ...pulseTransition, delay: 1 }}
        />

        {/* Left: Librarian */}
        <circle cx="70" cy="150" r="12" fill="#0A0A0A" stroke="#333" />
        <motion.rect 
          x="67" y="147" width="6" height="6" fill="#10b981"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Right: Prosecutor */}
        <circle cx="330" cy="150" r="12" fill="#0A0A0A" stroke="#333" />
        <motion.path 
          d="M326 150 L330 154 L334 146" stroke="#0ea5e9" strokeWidth="2"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* --- DEFINITIONS --- */}
        <defs>
          <linearGradient id="gradient-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-sky" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
