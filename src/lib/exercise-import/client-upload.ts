export type ImportUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type ImportUploadSignPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "raw";
};

export class ImportUploadCancelledError extends Error {
  constructor() {
    super("UPLOAD_CANCELLED");
    this.name = "ImportUploadCancelledError";
  }
}

/**
 * Direct client → Cloudinary upload with real XHR upload progress + abort support.
 */
export function uploadImportFileWithProgress(
  file: File,
  sign: ImportUploadSignPayload,
  options: {
    onProgress: (progress: ImportUploadProgress) => void;
    signal?: AbortSignal;
  },
): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new ImportUploadCancelledError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;

    const onAbort = () => {
      xhr.abort();
    };

    options.signal?.addEventListener("abort", onAbort);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const total = event.total || file.size;
      const loaded = event.loaded;
      options.onProgress({
        loaded,
        total,
        percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
      });
    };

    xhr.onload = () => {
      options.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            secure_url?: string;
            public_id?: string;
          };
          if (!data.secure_url || !data.public_id) {
            reject(new Error("PROCESSING_FAILED"));
            return;
          }
          options.onProgress({
            loaded: file.size,
            total: file.size,
            percent: 100,
          });
          resolve({ secureUrl: data.secure_url, publicId: data.public_id });
        } catch {
          reject(new Error("PROCESSING_FAILED"));
        }
        return;
      }
      reject(new Error("PROCESSING_FAILED"));
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new Error("PROCESSING_FAILED"));
    };

    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new ImportUploadCancelledError());
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sign.apiKey);
    formData.append("timestamp", String(sign.timestamp));
    formData.append("signature", sign.signature);
    formData.append("folder", sign.folder);
    formData.append("use_filename", "true");
    formData.append("unique_filename", "true");

    xhr.open("POST", endpoint);
    xhr.send(formData);
  });
}
