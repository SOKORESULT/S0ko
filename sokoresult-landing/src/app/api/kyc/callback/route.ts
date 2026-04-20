import { NextRequest } from "next/server";

// TODO: Smile Identity webhook callback
// 1. Verify HMAC signature from Smile using SMILE_WEBHOOK_SECRET env var
// 2. Parse result_code from body (1220 = ID verified, 1221 = ID not verified, etc.)
// 3. Look up kyc_documents by smile_job_id
// 4. Update profiles: kyc_tier, kyc_status, kyc_approved_at
// 5. If approved: trigger welcome airdrop via /api/airdrop/claim

export async function POST(_request: NextRequest) {
  return Response.json({ received: true }, { status: 200 });
}
