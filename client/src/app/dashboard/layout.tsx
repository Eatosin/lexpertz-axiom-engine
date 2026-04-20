import React from "react";
import { DashboardProviders } from "@/components/providers";

export const metadata = {
  title: "Axiom Engine | Sovereign Workspace",
  description: "Enterprise-grade evidence auditing and reconciliation.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      {/* SOTA: This wrapper ensures the dashboard never scrolls the body, 
          only the internal chat and document panels scroll. */}
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        {children}
      </div>
    </DashboardProviders>
  );
}
