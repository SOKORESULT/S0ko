import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);
  if (!result) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = result;
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  return Response.json({
    kyc_tier: profile.kyc_tier,
    kyc_status: profile.kyc_status,
    kyc_submitted_at: profile.kyc_submitted_at,
    kyc_approved_at: profile.kyc_approved_at,
    is_over_18: profile.is_over_18,
  });
}
