import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { getVocabularyWords } from "@/lib/actions/vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const words = await getVocabularyWords();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Study"
        title="Vocabulary"
        highlight="bank"
        description="Store words with multiple meanings. Drag to reorder meanings when editing."
      >
        <LinkButton href="/vocabulary/new">
          <Plus className="size-4" />
          Add word
        </LinkButton>
      </PageHeader>

      {words.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted-foreground">No words yet.</p>
          <LinkButton href="/vocabulary/new" className="mt-4">
            Add your first word
          </LinkButton>
        </div>
      ) : (
        <div className="data-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Word</th>
                <th>Meanings</th>
                <th>POS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <tr key={word.id}>
                  <td>
                    <Link
                      href={`/vocabulary/${word.id}`}
                      className="font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {word.word}
                    </Link>
                  </td>
                  <td className="text-muted-foreground">
                    {word.meanings.map((m) => m.meaning).join(" · ")}
                  </td>
                  <td className="text-muted-foreground">
                    {word.partOfSpeech ?? "—"}
                  </td>
                  <td>
                    <Badge variant="secondary">{word.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
