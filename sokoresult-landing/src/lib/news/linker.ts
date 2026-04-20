// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Link a story to relevant markets by matching entities + keywords against market keywords/questions. */
export async function linkStoryToMarkets(
  entities: { name: string; type: string }[],
  keywords: string[],
  title: string,
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;
  const { data: markets } = await sb
    .from("markets")
    .select("id, slug, question, keywords")
    .eq("status", "open");

  if (!markets) return [];

  const titleLower = title.toLowerCase();
  const allTerms = [
    ...entities.map((e) => e.name.toLowerCase()),
    ...keywords.map((k) => k.toLowerCase()),
  ];

  const linked: string[] = [];
  for (const market of markets) {
    const qLower        = (market.question ?? "").toLowerCase();
    const mKeywords: string[] = (market.keywords ?? []).map((k: string) => k.toLowerCase());

    const matched = allTerms.some((term) =>
      mKeywords.some((mk) => mk.includes(term) || term.includes(mk)) ||
      qLower.includes(term) ||
      (titleLower.includes(term) && mKeywords.some((mk) => titleLower.includes(mk)))
    );
    if (matched) linked.push(market.id as string);
  }
  return linked;
}
