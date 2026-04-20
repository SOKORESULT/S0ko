"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface KycGateProps {
  requiredTier?: 1 | 2;
  children: React.ReactNode;
}

export function KycGate({ requiredTier = 1, children }: KycGateProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  const currentTier = (profile?.kyc_tier ?? 0) as 0 | 1 | 2;
  const blocked = currentTier < requiredTier;

  if (!blocked) return <>{children}</>;

  return (
    <>
      {/* Blurred children behind overlay */}
      <div className="relative">
        <div className="pointer-events-none select-none" style={{ filter: "blur(4px)", opacity: 0.4 }}>
          {children}
        </div>

        {/* Modal overlay */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ backdropFilter: "blur(2px)" }}>
          <div
            className="flex flex-col items-center text-center rounded-2xl border"
            style={{
              background: "#1A1A2E",
              borderColor: "#2A2A3E",
              padding: "32px 28px",
              maxWidth: 320,
              width: "90%",
            }}
          >
            {/* Lock icon */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(123,47,190,0.12)", border: "1px solid rgba(123,47,190,0.3)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h3 className="text-white text-[18px] font-bold mb-2">Verification required</h3>
            <p className="text-[13px] text-[#8888A0] leading-relaxed mb-6">
              You need to verify your identity to access this feature.
              It only takes a minute.
            </p>

            <button
              onClick={() => router.push("/kyc")}
              className="w-full h-11 rounded-xl font-semibold text-[14px] text-white cursor-pointer transition-colors duration-200"
              style={{ background: "#7B2FBE" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#9B4FDE"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#7B2FBE"; }}
            >
              Verify Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
