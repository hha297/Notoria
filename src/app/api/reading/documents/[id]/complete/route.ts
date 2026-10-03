import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteReadingBlob } from "@/lib/reading/blob";
import { completeReadingDocumentUpload } from "@/lib/reading/document-upload";
import { ReadingError } from "@/lib/reading/errors";
import { MAX_READING_FILE_SIZE_BYTES } from "@/lib/reading/storage";

export const runtime = "nodejs";

const bodySchema = z.object({
  storagePath: z.string().min(1).max(500),
  url: z.string().url().optional(),
  sizeBytes: z.number().int().positive().max(MAX_READING_FILE_SIZE_BYTES),
  mimeType: z.string().min(1).max(200).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id: documentId } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  try {
    const result = await completeReadingDocumentUpload({
      documentId,
      userId,
      storagePath: parsed.data.storagePath,
      sizeBytes: parsed.data.sizeBytes,
      mimeType: parsed.data.mimeType,
    });

    revalidatePath("/reading");
    revalidatePath(`/reading/${documentId}`);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReadingError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "PASSAGE_NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(
        { error: error.code, code: error.code },
        { status },
      );
    }

    // Unexpected Neon/persistence failure after Blob upload — clean the object.
    await deleteReadingBlob(parsed.data.storagePath);

    return NextResponse.json(
      { error: "STORAGE_FAILED", code: "STORAGE_FAILED" },
      { status: 500 },
    );
  }
}
