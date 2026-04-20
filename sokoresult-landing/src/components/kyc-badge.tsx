interface KycBadgeProps {
  tier: 0 | 1 | 2;
  size?: "sm" | "md";
}

const TIERS = {
  0: { label: "Unverified", color: "#8888A0", bg: "rgba(136,136,160,0.12)", border: "rgba(136,136,160,0.2)" },
  1: { label: "Verified", color: "#00E676", bg: "rgba(0,230,118,0.1)", border: "rgba(0,230,118,0.25)" },
  2: { label: "Enhanced", color: "#FFB300", bg: "rgba(255,179,0,0.1)", border: "rgba(255,179,0,0.25)" },
};

export function KycBadge({ tier, size = "md" }: KycBadgeProps) {
  const t = TIERS[tier];
  const isSmall = size === "sm";

  return (
    <span
      className="inline-flex items-center gap-1 font-semibold rounded-full"
      style={{
        color: t.color,
        background: t.bg,
        border: `1px solid ${t.border}`,
        fontSize: isSmall ? 11 : 12,
        padding: isSmall ? "2px 8px" : "3px 10px",
      }}
    >
      {tier === 1 && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {tier === 2 && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      )}
      {t.label}
    </span>
  );
}
