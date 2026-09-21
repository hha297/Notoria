import { SettingsView } from "@/components/settings/settings-view";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function SettingsPage() {
  const workspace = await getActiveWorkspace();
  return <SettingsView workspaceId={workspace?.id ?? null} />;
}
