import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  const result = await getCurrentUser(request);

  if (!result) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // DEBUG: confirm is_admin is included in the response for this uid
  console.log("[/api/auth/me] profile lookup", {
    firebase_uid: result.firebaseUser.uid,
    email: result.firebaseUser.email,
    profile_id: result.profile?.id,
    is_admin: result.profile?.is_admin,
    is_admin_type: typeof result.profile?.is_admin,
    has_profile: !!result.profile,
  });

  return Response.json({ profile: result.profile });
}
