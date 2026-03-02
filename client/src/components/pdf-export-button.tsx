"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// The Firewall: Strict ssr: false stops Vercel's serverless bundler crash
const PdfExportButtonInner = dynamic(
  () => import("./pdf-export-button-inner"),
  { 
    ssr: false,
    loading: () => (
      <button disabled className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-bold uppercase tracking-widest text-brand-primary opacity-50">
        <Loader2 size={14} className="animate-spin" /> Compiling Engine...
      </button>
    )
  }
);

// We define the props here so TypeScript is happy
interface PdfExportProps {
  filename: string;
  query: string;
  answer: string;
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

export function PdfExportButton(props: PdfExportProps) {
  return <PdfExportButtonInner {...props} />;
}
