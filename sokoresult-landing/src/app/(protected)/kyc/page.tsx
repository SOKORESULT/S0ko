"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DocType = "national_id" | "passport";
type Step = 1 | 2 | 3 | 4 | 5;
type ResultStatus = "approved" | "pending" | "rejected" | null;

const DOC_PLACEHOLDER: Record<DocType, string> = {
  national_id: "e.g. 12345678",
  passport: "e.g. A12345678",
};

// ── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: "bounceIn 500ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const total = 4; // steps 1–4 shown in bar (5 is result)
  const pct = Math.min(((step - 1) / (total - 1)) * 100, 100);
  return (
    <div className="w-full h-1 rounded-full mb-8" style={{ background: "#2A2A3E" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7B2FBE, #9B4FDE)" }}
      />
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent px-4 py-3.5 text-[15px] text-white placeholder-[#555555] focus:outline-none border border-[#2A2A3E] rounded-xl focus:border-[#7B2FBE] transition-colors duration-200"
    />
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 font-semibold text-[15px] text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all duration-200"
      style={{ height: 50, background: disabled ? "#3A2A5E" : "#7B2FBE" }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#9B4FDE"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = "#7B2FBE"; }}
    >
      {children}
    </button>
  );
}

function GreenBtn({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 font-semibold text-[15px] text-[#0A0A12] rounded-xl cursor-pointer disabled:opacity-50 transition-all duration-200"
      style={{ height: 50, background: "linear-gradient(135deg, #00E676, #00C853)" }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KycPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [docType, setDocType] = useState<DocType>("national_id");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState("");

  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [resultStatus, setResultStatus] = useState<ResultStatus>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }
      const token = await user.getIdToken();
      setAuthToken(token);
    });
    return unsub;
  }, [router]);

  // Camera setup
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available on this device");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setCameraError("Camera access was denied. You can skip the selfie for now.");
      } else if (name === "NotFoundError") {
        setCameraError("No camera found on this device. You can skip the selfie for now.");
      } else {
        setCameraError("Unable to access camera. You can skip the selfie for now.");
      }
    }
  }, []);

  useEffect(() => {
    if (step === 3 && !selfiePreview) startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selfiePreview]);

  // Ensure camera is fully released on unmount (e.g. navigation away)
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfiePreview(dataUrl);
    stopCamera();
  }

  function retake() {
    setSelfiePreview(null);
    setSelfiePath(null);
    startCamera();
  }

  async function uploadSelfie(): Promise<string | null> {
    if (!selfiePreview || !authToken) return null;
    try {
      const blob = await (await fetch(selfiePreview)).blob();
      const filename = `kyc-selfies/${auth.currentUser?.uid}-${Date.now()}.jpg`;
      // Upload to Supabase storage using service key is not available client-side,
      // so we upload via the supabase client with anon key (bucket must allow uploads from authenticated users)
      const { data, error } = await supabase.storage
        .from("kyc-documents")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
      if (error) return null;
      return data.path;
    } catch {
      return null;
    }
  }

  async function handleSubmit() {
    stopCamera();
    setStep(4);
    setError("");

    const path = await uploadSelfie();
    if (selfiePreview) setSelfiePath(path);

    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          document_type: docType,
          id_number: idNumber.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country: "KE",
          selfie_path: path,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResultStatus("rejected");
        setError(data.error ?? "Verification failed.");
      } else {
        setResultStatus(data.status as ResultStatus);
      }
    } catch {
      setResultStatus("rejected");
      setError("Network error. Please try again.");
    }
    setStep(5);
  }

  function goToStep(s: Step) {
    setError("");
    setStep(s);
  }

  // ── Step renders ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center px-4 py-10">
      <style>{`
        @keyframes bounceIn { 0% { opacity:0; transform:scale(0.4); } 60% { transform:scale(1.1); } 80% { transform:scale(0.95); } 100% { opacity:1; transform:scale(1); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div className="w-full bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl" style={{ maxWidth: 480, padding: "36px 40px" }}>

        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-[18px] font-bold" style={{ fontFamily: "var(--font-space-mono, monospace)" }}>
            <span className="text-[#00E676]">$OKO</span><span className="text-white">RESULT</span>
          </span>
        </div>

        {step < 5 && <ProgressBar step={step} />}

        {/* ── Step 1: Choose document ── */}
        {step === 1 && (
          <div style={{ animation: "fadeSlide 300ms ease-out both" }}>
            <h2 className="text-white text-[22px] font-bold text-center mb-2">Verify your identity</h2>
            <p className="text-[14px] text-[#8888A0] text-center mb-7 leading-relaxed">
              We need to verify your identity to comply with financial regulations. Your data is encrypted and never shared.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {([
                { type: "national_id" as DocType, label: "National ID", desc: "Kenyan National ID card" },
                { type: "passport" as DocType, label: "Passport", desc: "International passport" },
              ] as const).map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setDocType(type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer"
                  style={{
                    background: docType === type ? "rgba(123,47,190,0.12)" : "#12121E",
                    borderColor: docType === type ? "#7B2FBE" : "#2A2A3E",
                    boxShadow: docType === type ? "0 0 16px rgba(123,47,190,0.25)" : "none",
                  }}
                >
                  <span className="text-3xl">{type === "national_id" ? "🪪" : "🛂"}</span>
                  <span className="text-[14px] font-semibold text-white">{label}</span>
                  <span className="text-[12px] text-[#8888A0] text-center">{desc}</span>
                </button>
              ))}
            </div>

            <PrimaryBtn onClick={() => goToStep(2)}>Continue</PrimaryBtn>
          </div>
        )}

        {/* ── Step 2: Enter details ── */}
        {step === 2 && (
          <div style={{ animation: "fadeSlide 300ms ease-out both" }}>
            <button onClick={() => goToStep(1)} className="flex items-center gap-1.5 text-[13px] text-[#8888A0] hover:text-white transition-colors mb-5 cursor-pointer">
              <BackArrow /> Back
            </button>
            <h2 className="text-white text-[22px] font-bold mb-2">Enter your details</h2>
            <p className="text-[14px] text-[#8888A0] mb-6">
              Enter your details exactly as they appear on your {docType === "national_id" ? "National ID" : "passport"}.
            </p>

            <div className="space-y-3 mb-5">
              <Input placeholder="First name" value={firstName} onChange={(v) => { setFirstName(v); setError(""); }} />
              <Input placeholder="Last name" value={lastName} onChange={(v) => { setLastName(v); setError(""); }} />
              <Input
                placeholder={DOC_PLACEHOLDER[docType]}
                value={idNumber}
                onChange={(v) => { setIdNumber(v); setError(""); }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-2.5 mb-4 text-[13px] text-[#FF5252]" style={{ background: "rgba(255,82,82,0.1)" }}>
                {error}
              </div>
            )}

            <PrimaryBtn
              onClick={() => {
                if (!firstName.trim() || !lastName.trim() || !idNumber.trim()) {
                  setError("All fields are required."); return;
                }
                goToStep(3);
              }}
            >
              Continue
            </PrimaryBtn>
          </div>
        )}

        {/* ── Step 3: Selfie ── */}
        {step === 3 && (
          <div style={{ animation: "fadeSlide 300ms ease-out both" }}>
            <button onClick={() => { stopCamera(); goToStep(2); }} className="flex items-center gap-1.5 text-[13px] text-[#8888A0] hover:text-white transition-colors mb-5 cursor-pointer">
              <BackArrow /> Back
            </button>
            <h2 className="text-white text-[22px] font-bold mb-2">Take a selfie</h2>
            <p className="text-[14px] text-[#8888A0] mb-5">
              Look straight at the camera in good lighting. Make sure your face is clearly visible.
            </p>

            {/* Camera error */}
            {cameraError && (
              <div className="rounded-xl border border-[#2A2A3E] bg-[#12121E] p-6 text-center mb-5">
                <div className="text-3xl mb-3">📷</div>
                <p className="text-[13px] text-[#FF5252] mb-4">{cameraError}</p>
                <p className="text-[12px] text-[#8888A0] mb-4">
                  The selfie is optional — you can complete verification without it.
                </p>
                <div className="space-y-2">
                  <PrimaryBtn onClick={() => { setSelfiePreview(null); handleSubmit(); }}>
                    Skip Selfie
                  </PrimaryBtn>
                  <button onClick={startCamera} className="w-full text-[13px] text-[#7B2FBE] hover:underline cursor-pointer py-2">
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Live camera */}
            {!cameraError && !selfiePreview && (
              <div className="relative mb-5 overflow-hidden rounded-2xl bg-[#12121E] border border-[#2A2A3E]"
                style={{ aspectRatio: "4/3" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {/* Oval overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="rounded-full border-2 border-[#7B2FBE]/70"
                    style={{ width: "55%", aspectRatio: "3/4", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {/* Preview */}
            {selfiePreview && (
              <div className="relative mb-5 overflow-hidden rounded-2xl border border-[#2A2A3E]"
                style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex gap-3">
              {selfiePreview ? (
                <>
                  <button
                    onClick={retake}
                    className="flex-1 h-12 rounded-xl border border-[#2A2A3E] text-[14px] font-medium text-[#8888A0] hover:text-white hover:border-white/30 transition-all cursor-pointer"
                  >
                    Retake
                  </button>
                  <div className="flex-1">
                    <GreenBtn onClick={() => { setCapturing(false); handleSubmit(); }} disabled={capturing}>
                      Use Photo
                    </GreenBtn>
                  </div>
                </>
              ) : (
                !cameraError && (
                  <PrimaryBtn onClick={() => { setCapturing(true); capture(); }} disabled={capturing}>
                    {capturing ? "Capturing…" : "Take Photo"}
                  </PrimaryBtn>
                )
              )}
            </div>

            {/* Selfie is optional for MVP */}
            {!selfiePreview && !cameraError && (
              <button
                onClick={() => { setSelfiePreview(null); handleSubmit(); }}
                className="w-full text-center text-[12px] text-[#555555] hover:text-[#8888A0] transition-colors mt-4 cursor-pointer"
              >
                Skip selfie (optional)
              </button>
            )}
          </div>
        )}

        {/* ── Step 4: Verifying ── */}
        {step === 4 && (
          <div className="flex flex-col items-center py-8" style={{ animation: "fadeSlide 300ms ease-out both" }}>
            <div className="relative w-16 h-16 mb-6">
              <div
                className="absolute inset-0 rounded-full border-4 border-[#7B2FBE]/20"
              />
              <svg className="absolute inset-0 w-full h-full" style={{ animation: "spin 1s linear infinite" }} viewBox="0 0 64 64" fill="none">
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <circle cx="32" cy="32" r="28" stroke="#7B2FBE" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray="44 132" />
              </svg>
            </div>
            <h2 className="text-white text-[20px] font-bold mb-2">Verifying…</h2>
            <p className="text-[14px] text-[#8888A0] text-center">
              Checking your identity. This usually takes a few seconds.
            </p>
          </div>
        )}

        {/* ── Step 5: Result ── */}
        {step === 5 && resultStatus && (
          <div className="flex flex-col items-center py-6 text-center" style={{ animation: "fadeSlide 300ms ease-out both" }}>
            {resultStatus === "approved" && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(0,230,118,0.12)", border: "2px solid rgba(0,230,118,0.3)" }}>
                  <CheckIcon />
                </div>
                <h2 className="text-white text-[22px] font-bold mb-2">You&apos;re verified!</h2>
                <p className="text-[14px] text-[#8888A0] mb-8">
                  Your identity has been confirmed. You can now trade on SokoResult.
                </p>
                <GreenBtn onClick={() => router.push("/markets")}>Start Trading</GreenBtn>
              </>
            )}

            {resultStatus === "pending" && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(255,179,0,0.1)", border: "2px solid rgba(255,179,0,0.25)" }}>
                  <ClockIcon />
                </div>
                <h2 className="text-white text-[22px] font-bold mb-2">Under review</h2>
                <p className="text-[14px] text-[#8888A0] mb-8 leading-relaxed">
                  Your verification is being reviewed. This usually takes 1–2 business days. We&apos;ll notify you when it&apos;s done.
                </p>
                <PrimaryBtn onClick={() => router.push("/markets")}>Back to Markets</PrimaryBtn>
              </>
            )}

            {resultStatus === "rejected" && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(255,82,82,0.1)", border: "2px solid rgba(255,82,82,0.2)" }}>
                  <XIcon />
                </div>
                <h2 className="text-white text-[22px] font-bold mb-2">Verification failed</h2>
                <p className="text-[14px] text-[#8888A0] mb-3 leading-relaxed">
                  We couldn&apos;t verify your identity. Please check your details and try again.
                </p>
                {error && (
                  <p className="text-[13px] text-[#FF5252] mb-6">{error}</p>
                )}
                <PrimaryBtn onClick={() => { setError(""); setResultStatus(null); setSelfiePath(null); setSelfiePreview(null); goToStep(1); }}>
                  Try Again
                </PrimaryBtn>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
