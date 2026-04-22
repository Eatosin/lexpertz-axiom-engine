import React from "react";
import { DashboardProviders } from "@/components/providers";
import { AppSidebar } from "@/components/layout/app-sidebar";

export const metadata = {
  title: "Axiom Engine | Sovereign Workspace",
  description: "Enterprise-grade evidence auditing.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        
        {/* THE SIDEBAR IS OFFICIALLY WIRED HERE */}
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {children}
        </div>
      </div>
    </DashboardProviders>
  );
}
