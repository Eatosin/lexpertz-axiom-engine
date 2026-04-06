"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Re-declare interface to maintain strict typing across the dynamic boundary
export interface PdfExportProps {
  filename: string;
  query: string;
  answer: string;
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

// The Firewall: Strict ssr: false stops Vercel's Node.js bundler from crashing on Browser-only Blob APIs.
const PdfExportButtonInner = dynamic(
  () => import("./pdf-export-button-inner"),
  { 
    ssr: false,
    loading: () => (
      <button 
        disabled 
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-600 opacity-50 cursor-not-allowed"
      >
        <Loader2 size={14} className="animate-spin" /> 
        Initializing PDF Engine...
      </button>
    )
  }
);

export function PdfExportButton(props: PdfExportProps) {
  return <PdfExportButtonInner {...props} />;
}
