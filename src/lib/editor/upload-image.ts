import { uploadEditorImage } from "@/lib/actions/editor-images";
import {
  isAllowedEditorImageFile,
  withClipboardImageType,
  type EditorImageErrorCode,
} from "@/lib/editor/images";

export async function uploadEditorImageFile(
  file: File,
): Promise<{ url: string } | { error: EditorImageErrorCode }> {
  const prepared = withClipboardImageType(file);
  const invalid = isAllowedEditorImageFile(prepared);
  if (invalid) {
    return { error: invalid };
  }

  const formData = new FormData();
  formData.set("image", prepared);

  const result = await uploadEditorImage(formData);
  if (!result.ok) {
    return { error: result.code };
  }

  return { url: result.url };
}
