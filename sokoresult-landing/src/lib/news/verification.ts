export type VerificationTier = "auto_verified" | "correspondent_verified" | "pending_review";

export interface VerificationResult {
  tier:        VerificationTier;
  status:      "verified" | "pending" | "disputed";
  verifiedBy?: string;
  reason:      string;
}

// Tier 1 — auto-verified (wire services + major Kenyan outlets)
const AUTO_VERIFY = [
  "BBC Africa", "Africanews", "Reuters", "AFP", "AP",
  "Nation Africa", "The Standard", "Capital FM", "Kenya News Agency",
  "Business Daily",
];

export function determineVerificationTier(
  sourceName:       string,
  _sourceType:      string,
  correspondentId?: string,
): VerificationResult {
  // TIER 1 — trusted sources
  if (AUTO_VERIFY.some((s) => sourceName.includes(s))) {
    return {
      tier:       "auto_verified",
      status:     "verified",
      verifiedBy: "system",
      reason:     `Auto-verified: ${sourceName} is a trusted source`,
    };
  }

  // TIER 2 — approved correspondent
  if (correspondentId) {
    return {
      tier:       "correspondent_verified",
      status:     "verified",
      verifiedBy: correspondentId,
      reason:     "Verified by approved SokoResult correspondent",
    };
  }

  // TIER 3 — pending editorial review
  return {
    tier:   "pending_review",
    status: "pending",
    reason: "Awaiting correspondent or editorial review",
  };
}
