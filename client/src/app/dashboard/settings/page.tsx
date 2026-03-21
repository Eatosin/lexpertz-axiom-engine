import { ApiKeysManager } from "@/components/api-keys-manager";

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-background custom-scrollbar">
      <ApiKeysManager />
    </div>
  );
}
