import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabaseAdmin as any;

const PERSONAL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];

export async function POST(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result?.profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const profile = result.profile;
  if ((profile.kyc_tier ?? 0) < 1) {
    return Response.json({ error: "KYC verification required" }, { status: 403 });
  }

  const body = await request.json();
  const { publication_name, publication_type, business_email, x_handle, portfolio_url, bio, beat } = body;

  if (!publication_name?.trim()) return Response.json({ error: "Publication name required" }, { status: 400 });
  if (!bio?.trim() || bio.trim().split(/\s+/).length < 50) {
    return Response.json({ error: "Bio must be at least 50 words" }, { status: 400 });
  }

  // Email OR X handle required
  if (!business_email && !x_handle) {
    return Response.json({ error: "Business email or X handle required" }, { status: 400 });
  }

  if (business_email) {
    const domain = business_email.split("@")[1]?.toLowerCase();
    if (PERSONAL_DOMAINS.includes(domain)) {
      return Response.json({ error: "Use a work email, not a personal address" }, { status: 400 });
    }
  }

  // Check for existing application
  const { data: existing } = await sb
    .from("correspondents")
    .select("id, verification_status")
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    return Response.json({ error: "Application already submitted", status: existing.verification_status }, { status: 409 });
  }

  await sb.from("correspondents").insert({
    user_id: profile.id,
    publication_name: publication_name.trim(),
    publication_type: publication_type ?? "freelance",
    business_email: business_email ?? null,
    x_handle: x_handle ?? null,
    portfolio_url: portfolio_url ?? null,
    bio: bio.trim(),
    beat: beat ?? "general",
    verification_status: "pending",
  });

  return Response.json({ status: "pending" });
}
