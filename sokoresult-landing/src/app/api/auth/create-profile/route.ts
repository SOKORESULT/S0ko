import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth/verify-token";
import { supabaseAdmin } from "@/lib/supabase/admin";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const { data } = await supabaseAdmin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!data) return code;
  }
  return generateReferralCode() + Date.now().toString(36).toUpperCase().slice(-2);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseToken(authHeader.slice(7));
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const { uid } = decoded;

  // Determine auth_provider from sign_in_provider
  const signInProvider = (decoded.firebase as { sign_in_provider?: string }).sign_in_provider ?? "phone";
  let authProvider: "phone" | "google" | "email" = "phone";
  if (signInProvider === "google.com") authProvider = "google";
  else if (signInProvider === "password") authProvider = "email";

  // Extract email and phone from token
  const email = decoded.email ?? null;
  const phone = decoded.phone_number ?? null;

  // Return existing profile
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (existing) return Response.json({ profile: existing });

  let body: { display_name?: string; referral_code?: string; is_over_18?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { display_name, referral_code: inputCode } = body;
  if (!display_name || display_name.trim().length < 2 || display_name.trim().length > 50) {
    return Response.json({ error: "Display name must be 2–50 characters." }, { status: 400 });
  }

  // Resolve referrer
  let referred_by: string | null = null;
  if (inputCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referrer } = await supabaseAdmin.from("profiles").select("id").eq("referral_code", inputCode.toUpperCase()).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (referrer) referred_by = (referrer as any).id;
  }

  const referralCode = await uniqueReferralCode();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (supabaseAdmin as any)
    .from("profiles")
    .insert({
      firebase_uid: uid,
      phone,
      email,
      display_name: display_name.trim(),
      auth_provider: authProvider,
      referral_code: referralCode,
      referred_by,
      is_over_18: true,
      kyc_tier: 0,
      kyc_status: "none",
      kes_balance: 1000000,
    })
    .select("*")
    .single();

  if (error) return Response.json({ error: "Failed to create profile." }, { status: 500 });
  return Response.json({ profile }, { status: 201 });
}
