import { toast } from "sonner";
import { exportAccountBackup } from "@/lib/actions/account";

/** Downloads the signed-in user's account backup JSON via the existing server action. */
export async function downloadAccountBackupJson(messages: {
  success: string;
  failed: string;
}) {
  try {
    const backup = await exportAccountBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `notoria-backup-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(messages.success);
  } catch {
    toast.error(messages.failed);
    throw new Error("BACKUP_FAILED");
  }
}
