import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { classifyStory } from "@/lib/ai/classify-story";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

const STORY_PAYMENT_CENTS = 5_000; // KES 50

export async function POST(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result?.profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: correspondent } = await sb
    .from("correspondents")
    .select("*")
    .eq("user_id", result.profile.id)
    .single();

  if (!correspondent) return Response.json({ error: "No correspondent record found" }, { status: 404 });
  if (correspondent.verification_status !== "approved") {
    return Response.json({ error: "Correspondent not approved" }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: storyBody, source_url, image_url, keywords } = body;

  if (!title?.trim()) return Response.json({ error: "Title required" }, { status: 400 });
  if (!storyBody?.trim() || storyBody.trim().length < 100) {
    return Response.json({ error: "Story body must be at least 100 characters" }, { status: 400 });
  }

  // AI classification
  const classification = await classifyStory(title, storyBody);

  // Insert news story
  const { data: story, error } = await sb
    .from("news_stories")
    .insert({
      title: title.trim(),
      body: storyBody.trim(),
      source_name: correspondent.publication_name,
      source_type: "correspondent",
      source_url: source_url ?? null,
      image_url: image_url ?? null,
      category: classification.category,
      urgency: classification.urgency,
      verification_status: "verified",
      verified_by: result.profile.id,
      verified_at: new Date().toISOString(),
      entities: classification.entities,
      published_at: new Date().toISOString(),
      keywords: keywords ?? classification.keywords,
      correspondent_id: correspondent.id,
    })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Increment story count
  await sb
    .from("correspondents")
    .update({ story_count: (correspondent.story_count ?? 0) + 1 })
    .eq("id", correspondent.id);

  // Create payment record
  await sb.from("correspondent_payments").insert({
    correspondent_id: correspondent.id,
    amount: STORY_PAYMENT_CENTS,
    reason: `Story published: ${title.trim().slice(0, 80)}`,
    news_story_id: story.id,
    status: "pending",
  });

  return Response.json({ story_id: story.id, earned: STORY_PAYMENT_CENTS });
}
