import { saveAs } from "file-saver";

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}
