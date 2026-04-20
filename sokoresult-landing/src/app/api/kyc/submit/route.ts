import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MOCK_MODE = process.env.KYC_MOCK_MODE === "true";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { firebaseUser, profile } = result;

  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  if (profile.kyc_status === "approved") {
    return Response.json({ error: "KYC already approved" }, { status: 400 });
  }

  let body: {
    document_type?: string;
    id_number?: string;
    first_name?: string;
    last_name?: string;
    country?: string;
    selfie_path?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { document_type, id_number, first_name, last_name, country = "KE", selfie_path } = body;

  // Validate
  if (!document_type || !["national_id", "passport"].includes(document_type)) {
    return Response.json({ error: "Invalid document_type" }, { status: 400 });
  }
  if (!id_number?.trim()) return Response.json({ error: "id_number is required" }, { status: 400 });
  if (!first_name?.trim()) return Response.json({ error: "first_name is required" }, { status: 400 });
  if (!last_name?.trim()) return Response.json({ error: "last_name is required" }, { status: 400 });
  if (country !== "KE") return Response.json({ error: "Only KE supported" }, { status: 400 });

  // Create kyc_documents record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any).from("kyc_documents").insert({
    user_id: profile.id,
    document_type,
    document_url: selfie_path ?? null,
  });

  if (MOCK_MODE) {
    // Simulate processing delay
    await delay(3000);

    // Auto-approve
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("profiles").update({
      kyc_tier: 1,
      kyc_status: "approved",
      is_over_18: true,
      kyc_approved_at: new Date().toISOString(),
      kyc_submitted_at: new Date().toISOString(),
    }).eq("id", profile.id);

    return Response.json({ status: "approved", mock: true });
  }

  // REAL MODE — TODO: integrate Smile Identity
  // 1. Call SmileIdentity.submit_job({ partner_id, id_info: { id_number, id_type, first_name, last_name, country }, job_type: 5 })
  // 2. Store smile_job_id on the kyc_documents record
  // 3. Return pending status, wait for webhook at /api/kyc/callback

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any).from("profiles").update({
    kyc_status: "pending",
    kyc_submitted_at: new Date().toISOString(),
  }).eq("firebase_uid", firebaseUser.uid);

  return Response.json({ status: "pending" });
}
