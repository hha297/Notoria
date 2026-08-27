import type {
  ExerciseImportSource,
  ExerciseImportStatus,
} from "@/db/schema";
import type { TheoryExercise } from "@/lib/theory-exercises/types";

export type ExerciseImportListItem = {
  id: string;
  title: string;
  sourceType: ExerciseImportSource;
  status: ExerciseImportStatus;
  errorCode: string | null;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string | null;
  originalFilename: string | null;
};

export type ExerciseImportDetail = ExerciseImportListItem & {
  fileUrl: string | null;
  mimeType: string | null;
  /** Internal only — not shown in UI. */
  extractedText: string | null;
  exercises: TheoryExercise[];
};

export type ExtractedContent = {
  text: string;
  method: "vision" | "url_html" | "plain_text" | "parser";
};

export type ImportSourceInput =
  | {
      kind: "image" | "file";
      fileUrl: string;
      /** Cloudinary public_id — preferred for authenticated download. */
      filePublicId?: string | null;
      mimeType: string | null;
      originalFilename: string | null;
    }
  | {
      kind: "url";
      sourceUrl: string;
    };
