"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Tab = "email" | "phone";
type PhoneStage = "input" | "otp";

const ERRORS: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign up cancelled.",
  "auth/cancelled-popup-request": "Sign up cancelled.",
  "auth/account-exists-with-different-credential": "Email already linked to another sign-in method.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-phone-number": "Enter a valid Kenyan number.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/invalid-verification-code": "Invalid code.",
  "auth/code-expired": "Code expired. Resend and try again.",
};
function err(code: string) {
  return ERRORS[code] ?? "Something went wrong. Please try again.";
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg px-4 py-2.5 mt-3 text-[13px] text-[#FF5252]"
      style={{ background: "rgba(255,82,82,0.1)" }}>
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center my-6">
      <div className="flex-1 h-px bg-[#2A2A3E]" />
      <span className="mx-3 text-[13px] font-medium text-[#8888A0] bg-[#1A1A2E] px-1">OR</span>
      <div className="flex-1 h-px bg-[#2A2A3E]" />
    </div>
  );
}

function TabToggle({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex w-full mb-5 border-b border-[#2A2A3E]">
      {(["email", "phone"] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="flex-1 pb-2.5 text-[14px] font-medium capitalize transition-colors duration-200 cursor-pointer"
          style={{
            color: active === t ? "#ffffff" : "#8888A0",
            borderBottom: active === t ? "2px solid #7B2FBE" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          {t === "email" ? "Email" : "Phone"}
        </button>
      ))}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function OtpBoxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleInput(i: number, raw: string) {
    if (raw.length > 1) {
      const digits = raw.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...value];
      digits.forEach((d, j) => { if (i + j < 6) next[i + j] = d; });
      onChange(next);
      refs.current[Math.min(i + digits.length, 5)]?.focus();
      return;
    }
    const d = raw.replace(/\D/g, "");
    const next = [...value];
    next[i] = d;
    onChange(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  }

  return (
    <div className="flex gap-[10px] justify-center my-5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => { e.preventDefault(); handleInput(i, e.clipboardData.getData("text")); }}
          className="text-center text-2xl text-white bg-[#12121E] border border-[#2A2A3E] rounded-[10px] focus:outline-none focus:border-[#7B2FBE] transition-colors duration-150 caret-transparent"
          style={{ width: "clamp(44px, 13vw, 52px)", height: 60, fontFamily: "var(--font-space-mono, monospace)" }}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("email");
  const [phoneStage, setPhoneStage] = useState<PhoneStage>("input");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      router.push("/signup/complete");
    }).catch((e) => setError(err(e.code)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearRecaptcha = useCallback(() => {
    if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null; }
  }, []);

  useEffect(() => {
    return () => {
      clearRecaptcha();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [clearRecaptcha]);

  function startCountdown() {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleGoogle() {
    setError("");
    setLoading("google");
    const provider = new GoogleAuthProvider();
    try {
      if (window.innerWidth < 768) {
        await signInWithRedirect(auth, provider);
        return;
      }
      await signInWithPopup(auth, provider);
      router.push("/signup/complete");
    } catch (e: unknown) {
      setError(err((e as { code?: string }).code ?? ""));
    } finally {
      setLoading(null);
    }
  }

  async function handleEmailSignup() {
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading("email");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user).catch(() => {});
      router.push("/signup/complete");
    } catch (e: unknown) {
      setError(err((e as { code?: string }).code ?? ""));
    } finally {
      setLoading(null);
    }
  }

  async function handleSendCode() {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^7\d{8}$/.test(cleaned)) {
      setError("Enter a valid Kenyan number (9 digits starting with 7).");
      return;
    }
    setError("");
    setLoading("phone");
    try {
      clearRecaptcha();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      recaptchaRef.current = verifier;
      const result = await signInWithPhoneNumber(auth, `+254${cleaned}`, verifier);
      setConfirmationResult(result);
      setPhoneStage("otp");
      startCountdown();
    } catch (e: unknown) {
      setError(err((e as { code?: string }).code ?? ""));
      clearRecaptcha();
    } finally {
      setLoading(null);
    }
  }

  async function handleVerifyOtp() {
    if (!confirmationResult || otp.join("").length !== 6) return;
    setError("");
    setLoading("verify");
    try {
      await confirmationResult.confirm(otp.join(""));
      router.push("/signup/complete");
    } catch (e: unknown) {
      setError(err((e as { code?: string }).code ?? ""));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ animation: "authFadeIn 400ms ease-out both" }}>
      <style>{`@keyframes authFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <h1
        className="text-white text-center font-bold mb-7"
        style={{ fontSize: 28, fontFamily: "var(--font-dm-sans, sans-serif)" }}
      >
        Create your account
      </h1>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-3 font-semibold text-[16px] text-[#0A0A12] rounded-xl cursor-pointer disabled:opacity-60 transition-all duration-200"
        style={{ height: 56, background: "linear-gradient(135deg, #00E676, #00C853)" }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
      >
        {loading === "google" ? <Spinner /> : <GoogleIcon />}
        {loading === "google" ? "Signing up…" : "Continue with Google"}
      </button>

      <Divider />
      <TabToggle active={tab} onChange={(t) => { if (t !== "phone") clearRecaptcha(); setTab(t); setError(""); }} />

      {/* Email Tab */}
      {tab === "email" && (
        <div style={{ animation: "authFadeIn 200ms ease-out both" }}>
          <div className="border border-[#2A2A3E] rounded-xl overflow-hidden mb-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full bg-transparent px-4 py-4 text-[16px] text-white placeholder-[#555555] focus:outline-none"
            />
            <div className="h-px bg-[#2A2A3E]" />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-transparent px-4 py-4 pr-12 text-[16px] text-white placeholder-[#555555] focus:outline-none"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8888A0] hover:text-white transition-colors cursor-pointer" tabIndex={-1}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <div className="h-px bg-[#2A2A3E]" />
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSignup()}
                className="w-full bg-transparent px-4 py-4 pr-12 text-[16px] text-white placeholder-[#555555] focus:outline-none"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8888A0] hover:text-white transition-colors cursor-pointer" tabIndex={-1}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          <button
            onClick={handleEmailSignup}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 font-semibold text-[16px] text-white rounded-xl cursor-pointer disabled:opacity-60 transition-colors duration-200"
            style={{ height: 48, background: "#7B2FBE" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#9B4FDE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7B2FBE"; }}
          >
            {loading === "email" && <Spinner />}
            {loading === "email" ? "Creating account…" : "Create Account"}
          </button>

          <ErrorBanner message={error} />
        </div>
      )}

      {/* Phone Tab */}
      {tab === "phone" && (
        <div style={{ animation: "authFadeIn 200ms ease-out both" }}>
          {phoneStage === "input" && (
            <>
              <div className="flex items-center border border-[#2A2A3E] rounded-xl overflow-hidden">
                <span className="pl-4 text-[15px] text-[#8888A0] whitespace-nowrap select-none">🇰🇪 +254</span>
                <input
                  type="tel" inputMode="numeric" placeholder="712 345 678"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, "")); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                  maxLength={11}
                  className="flex-1 bg-transparent px-3 py-4 text-[16px] text-white placeholder-[#555555] focus:outline-none"
                  style={{ fontFamily: "var(--font-space-mono, monospace)" }}
                />
                <button
                  onClick={handleSendCode} disabled={!!loading}
                  className="flex items-center gap-1.5 font-semibold text-[14px] text-white cursor-pointer disabled:opacity-60 transition-colors duration-200 whitespace-nowrap"
                  style={{ background: "#7B2FBE", padding: "12px 20px", margin: 6, borderRadius: 8 }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#9B4FDE"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#7B2FBE"; }}
                >
                  {loading === "phone" ? <><Spinner /> Sending…</> : "Continue"}
                </button>
              </div>
              <ErrorBanner message={error} />
            </>
          )}

          {phoneStage === "otp" && (
            <div style={{ animation: "authFadeIn 300ms ease-out both" }}>
              <p className="text-[14px] text-[#8888A0] text-center">
                Enter the code sent to +254 {phone}
              </p>
              <OtpBoxes value={otp} onChange={setOtp} />
              <button
                onClick={handleVerifyOtp}
                disabled={!!loading || otp.join("").length !== 6}
                className="w-full flex items-center justify-center gap-2 font-semibold text-[16px] text-[#0A0A12] rounded-xl cursor-pointer disabled:opacity-60 transition-all duration-200"
                style={{ height: 52, background: "linear-gradient(135deg, #00E676, #00C853)" }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
              >
                {loading === "verify" ? <><Spinner /> Verifying…</> : "Verify"}
              </button>
              <div className="text-center mt-4">
                {countdown > 0 ? (
                  <p className="text-[13px] text-[#8888A0]">
                    Resend code in <span style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{countdown}s</span>
                  </p>
                ) : (
                  <p className="text-[13px] text-[#8888A0]">
                    Didn&apos;t get a code?{" "}
                    <button onClick={() => { setOtp(["","","","","",""]); setPhoneStage("input"); setError(""); }}
                      className="text-[#7B2FBE] hover:text-[#9B4FDE] cursor-pointer transition-colors">
                      Resend
                    </button>
                  </p>
                )}
              </div>
              <ErrorBanner message={error} />
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[14px] text-[#8888A0] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#7B2FBE] hover:text-[#9B4FDE] transition-colors">
          Sign in
        </Link>
      </p>

      <div id="recaptcha-container" className="absolute invisible" />
    </div>
  );
}
