import React from "react";
import { TerminalSquare } from "lucide-react";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";

export const metadata = {
  title: "Developer Settings | Axiom Engine",
  description: "Manage your Sovereign MCP API Keys.",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="space-y-2 border-b border-white/5 pb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <TerminalSquare className="text-brand-secondary" size={32} />
            Developer Settings
          </h1>
          <p className="text-zinc-400 text-sm">
            Manage your Sovereign Personal Access Tokens (PATs). Use these keys to connect local IDEs (Claude Desktop, Cursor) to your Axiom Cloud Vault via the Universal MCP Bridge.
          </p>
        </div>

        {/* THE MANAGER */}
        <ApiKeysManager />
        
      </div>
    </div>
  );
}
