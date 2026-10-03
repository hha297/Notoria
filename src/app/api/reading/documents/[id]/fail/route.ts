import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { failReadingDocumentUpload } from "@/lib/reading/document-upload";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id: documentId } = await context.params;
  await failReadingDocumentUpload({ documentId, userId });
  return NextResponse.json({ ok: true });
}
