import { notFound } from "next/navigation";
import { ReadingPracticeView } from "@/components/reading/reading-practice-view";
import { getReadingPassage } from "@/lib/actions/reading";
import { getActiveWorkspace } from "@/lib/workspace";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ set?: string }>;
};

export default async function ReadingPracticePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { set } = await searchParams;
  if (!set) notFound();

  const workspace = await getActiveWorkspace();
  if (!workspace) notFound();

  let passage;
  try {
    passage = await getReadingPassage(id);
  } catch {
    notFound();
  }

  const setExists = passage.questionSets.some((item) => item.id === set);
  if (!setExists) notFound();

  return (
    <ReadingPracticeView
      passageId={id}
      setId={set}
      passageTitle={passage.title}
      passageBody={passage.body}
    />
  );
}
