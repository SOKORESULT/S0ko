import { verifyFirebaseToken } from "@/lib/auth/verify-token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

interface CurrentUser {
  firebaseUser: DecodedIdToken;
  profile: Profile | null;
}

export async function getCurrentUser(request: NextRequest): Promise<CurrentUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  let firebaseUser: DecodedIdToken;
  try {
    firebaseUser = await verifyFirebaseToken(token);
  } catch {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("firebase_uid", firebaseUser.uid)
    .single();

  return { firebaseUser, profile: profile as Profile | null };
}
