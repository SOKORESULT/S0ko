import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SUBCATEGORY_TAGS: Record<string, string[]> = {
  politics:      ["Kenya Elections", "AU Politics", "Global"],
  sports:        ["Football", "Athletics", "Rugby"],
  entertainment: ["Music", "Film", "TV"],
  fashion:       ["Fashion Week", "Brands", "Awards"],
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category    = searchParams.get("category");
  const sort        = searchParams.get("sort") ?? "volume";
  const search      = searchParams.get("search");
  const page        = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit       = Math.min(50, parseInt(searchParams.get("limit") ?? "30", 10));
  const offset      = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any;

  let query = sb
    .from("markets")
    .select("id,slug,question,description,category,status,yes_price,no_price,total_volume,total_trades,participant_count,resolution_deadline,created_at", { count: "exact" })
    .eq("status", "open");

  if (category && category !== "all") {
    if (category === "trending") {
      query = query.order("total_volume", { ascending: false });
    } else if (category === "new") {
      const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
      query = query.gte("created_at", cutoff);
    } else if (category === "breaking") {
      // Breaking: high-volume markets updated recently — approximate with highest volume
      query = query.order("total_volume", { ascending: false });
    } else {
      query = query.eq("category", category);
    }
  }

  if (search) {
    query = query.ilike("question", `%${search}%`);
  }

  if (sort === "volume" || category === "trending") {
    query = query.order("total_volume", { ascending: false });
  } else if (sort === "newest" || category === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "trades") {
    query = query.order("total_trades", { ascending: false });
  } else {
    query = query.order("total_volume", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Category counts for sidebar
  const cats = ["politics", "sports", "entertainment", "fashion"];
  const countResults = await Promise.all(
    cats.map((cat) =>
      sb.from("markets").select("*", { count: "exact", head: true }).eq("status", "open").eq("category", cat)
        .then(({ count: c }: { count: number }) => ({ category: cat, count: c ?? 0 }))
    )
  );
  const totalCount: { count: number } = await sb.from("markets").select("*", { count: "exact", head: true }).eq("status", "open").then(({ count: c }: { count: number }) => ({ count: c ?? 0 }));

  const categoryCounts = [
    { id: "all", label: "All", count: totalCount.count },
    ...countResults.map((r: { category: string; count: number }) => ({ id: r.category, label: r.category.charAt(0).toUpperCase() + r.category.slice(1), count: r.count })),
  ];

  const subcategories = category && SUBCATEGORY_TAGS[category]
    ? SUBCATEGORY_TAGS[category].map((label) => ({ id: label.toLowerCase().replace(/ /g, "-"), label, count: 0 }))
    : [];

  return Response.json({
    markets: data ?? [],
    total: count ?? 0,
    page,
    limit,
    has_more: offset + limit < (count ?? 0),
    category_counts: categoryCounts,
    subcategories,
  });
}
