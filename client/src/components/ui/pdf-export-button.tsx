"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

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

// Next.js 16 SSR Firewall to protect React-PDF
const PdfExportButtonInner = dynamic(
  () => import("./pdf-export-button-inner"),
  { 
    ssr: false,
    loading: () => (
      <button disabled className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-bold uppercase tracking-widest text-brand-primary opacity-50 cursor-not-allowed">
        <Loader2 size={14} className="animate-spin" /> Initializing PDF Engine...
      </button>
    )
  }
);

export function PdfExportButton(props: PdfExportProps) {
  return <PdfExportButtonInner {...props} />;
}
