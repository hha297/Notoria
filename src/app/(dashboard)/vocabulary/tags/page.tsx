import { redirect } from "next/navigation";

/** Legacy path — Tag Manager lives at `/tag`. */
export default async function VocabularyTagsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; from?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.tag) qs.set("tag", params.tag);
  if (params.from) qs.set("from", params.from);
  const query = qs.toString();
  redirect(query ? `/tag?${query}` : "/tag");
}
