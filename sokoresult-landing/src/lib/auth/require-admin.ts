import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { Profile } from "@/lib/types/database";
import type { NextRequest } from "next/server";

export async function requireAdmin(request: NextRequest): Promise<Profile> {
  const result = await getCurrentUser(request);
  if (!result || !result.profile) {
    throw new Error("Unauthorized");
  }
  if (!(result.profile as Profile & { is_admin?: boolean }).is_admin) {
    throw new Error("Forbidden: Admin access required");
  }
  return result.profile;
}
