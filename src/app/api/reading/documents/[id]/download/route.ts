import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { loadOwnedReadingDocument } from "@/lib/reading/document-upload";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Stream a private Reading original. Returns 404 for missing or non-owned docs
 * so existence of another user's document is not revealed.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id: documentId } = await context.params;
  const document = await loadOwnedReadingDocument({ documentId, userId });

  if (
    !document ||
    document.uploadStatus !== "ready" ||
    !document.storagePath ||
    document.storageProvider !== "vercel-blob"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(document.storagePath, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename =
    document.sourceFilename?.replace(/[^\w.\- ()[\]]+/g, "_") || "document";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type":
        document.mimeType ||
        result.blob.contentType ||
        "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
