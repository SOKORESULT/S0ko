import { adminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  return adminAuth.verifyIdToken(token);
}
