"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Tab = "email" | "phone";
type EmailMode = "signin" | "forgot";
type PhoneStage = "input" | "otp";

const ERRORS: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign in cancelled.",
  "auth/cancelled-popup-request": "Sign in cancelled.",
  "auth/account-exists-with-different-credential": "Email already linked to another sign-in method.",
  "auth/user-not-found": "No account with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "Email already registered.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-phone-number": "Enter a valid Kenyan number.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/invalid-verification-code": "Invalid code.",
  "auth/code-expired": "Code expired. Resend and try again.",
};
function errMsg(code: string) {
  return ERRORS[code] ?? "Something went wrong. Please try again.";
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="flex gap-2 justify-center my-5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={6}
          value={digit}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => { e.preventDefault(); handleInput(i, e.clipboardData.getData("text")); }}
          className="text-center text-xl text-white border rounded-lg focus:outline-none transition-colors duration-150 caret-transparent"
          style={{ width: 44, height: 52, background: "#252525", borderColor: digit ? "#00E676" : "#333", fontFamily: "var(--font-space-mono, monospace)" }}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab]               = useState<Tab>("email");
  const [emailMode, setEmailMode]   = useState<EmailMode>("signin");
  const [phoneStage, setPhoneStage] = useState<PhoneStage>("input");

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent]   = useState(false);

  const [phone, setPhone]           = useState("");
  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown]   = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [loading, setLoading]       = useState<string | null>(null);
  const [error, setError]           = useState("");

  const recaptchaRef  = useRef<RecaptchaVerifier | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      await handlePostAuth();
    }).catch((e) => setError(errMsg(e.code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearRecaptcha = useCallback(() => {
    if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null; }
  }, []);

  useEffect(() => {
    return () => { clearRecaptcha(); if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [clearRecaptcha]);

  async function handlePostAuth() {
    const token = await auth.currentUser?.getIdToken();
    const res   = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    router.push(data.profile ? "/markets" : "/signup/complete");
  }

  async function handleGoogle() {
    setError(""); setLoading("google");
    const provider = new GoogleAuthProvider();
    try {
      if (window.innerWidth < 768) { await signInWithRedirect(auth, provider); return; }
      await signInWithPopup(auth, provider);
      await handlePostAuth();
    } catch (e: unknown) { setError(errMsg((e as { code?: string }).code ?? "")); }
    finally { setLoading(null); }
  }

  async function handleEmailSignIn() {
    setError(""); setLoading("email");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await handlePostAuth();
    } catch (e: unknown) { setError(errMsg((e as { code?: string }).code ?? "")); }
    finally { setLoading(null); }
  }

  async function handleForgotPassword() {
    if (!resetEmail.trim()) return;
    setError(""); setLoading("reset");
    try { await sendPasswordResetEmail(auth, resetEmail); setResetSent(true); }
    catch (e: unknown) { setError(errMsg((e as { code?: string }).code ?? "")); }
    finally { setLoading(null); }
  }

  async function handleSendCode() {
    const cleaned = phone.replace(/\s/g, "");
    if (!/^7\d{8}$/.test(cleaned)) { setError("Enter a valid Kenyan number (9 digits starting with 7)."); return; }
    setError(""); setLoading("phone");
    try {
      clearRecaptcha();
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      recaptchaRef.current = verifier;
      const result = await signInWithPhoneNumber(auth, `+254${cleaned}`, verifier);
      setConfirmationResult(result); setPhoneStage("otp"); startCountdown();
    } catch (e: unknown) { setError(errMsg((e as { code?: string }).code ?? "")); clearRecaptcha(); }
    finally { setLoading(null); }
  }

  async function handleVerifyOtp() {
    if (!confirmationResult || otp.join("").length !== 6) return;
    setError(""); setLoading("verify");
    try { await confirmationResult.confirm(otp.join("")); await handlePostAuth(); }
    catch (e: unknown) { setError(errMsg((e as { code?: string }).code ?? "")); }
    finally { setLoading(null); }
  }

  function startCountdown() {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(countdownRef.current!); return 0; } return c - 1; });
    }, 1000);
  }

  // ─── Shared sub-components ────────────────────────────────────────────────

  function SocialBtn({ label, icon, onClick, busy }: {
    label: string; icon: React.ReactNode; onClick: () => void; busy: boolean;
  }) {
    return (
      <button
        onClick={onClick} disabled={!!loading}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 cursor-pointer disabled:opacity-60"
        style={{ height: 46, background: "#2A2A2A", color: "#E8E8F0", border: "1px solid #333" }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#323232"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#2A2A2A"; }}
      >
        {busy ? <Spinner /> : icon}
        {busy ? "Signing in…" : label}
      </button>
    );
  }

  function Input({ type, placeholder, value, onChange, onKeyDown, right }: {
    type: string; placeholder: string; value: string;
    onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
    right?: React.ReactNode;
  }) {
    return (
      <div className="relative">
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
          className="w-full px-4 py-3 text-[14px] text-white rounded-xl outline-none transition-colors duration-150"
          style={{ background: "#252525", border: "1px solid #333", color: "#E8E8F0" }}
          onFocus={(e) => { e.target.style.borderColor = "#444"; }}
          onBlur={(e) => { e.target.style.borderColor = "#333"; }}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    );
  }

  function ErrorMsg() {
    if (!error) return null;
    return <p className="text-[12px] mt-2" style={{ color: "#FF5252" }}>{error}</p>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ animation: "fadeUp 300ms ease-out both" }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <h1 className="text-white text-[22px] font-bold text-center mb-6">Log in</h1>

      {/* Social buttons */}
      <div className="flex flex-col gap-2.5 mb-5">
        <SocialBtn label="Continue with Google" icon={<GoogleIcon />}
          onClick={handleGoogle} busy={loading === "google"} />
        <SocialBtn label="Continue with Apple" icon={<AppleIcon />}
          onClick={() => {}} busy={false} />
      </div>

      {/* Divider */}
      <div className="relative flex items-center mb-5">
        <div className="flex-1 h-px" style={{ background: "#2A2A2A" }} />
        <span className="mx-3 text-[12px]" style={{ color: "#555" }}>or</span>
        <div className="flex-1 h-px" style={{ background: "#2A2A2A" }} />
      </div>

      {/* Tab toggle: Email / Phone */}
      <div className="flex gap-0 mb-4 rounded-xl overflow-hidden border border-[#2A2A2A]" style={{ background: "#252525" }}>
        {(["email", "phone"] as Tab[]).map((t) => (
          <button key={t} onClick={() => { if (t !== "phone") clearRecaptcha(); setTab(t); setError(""); }}
            className="flex-1 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer capitalize"
            style={{ background: tab === t ? "#333" : "transparent", color: tab === t ? "#fff" : "#666" }}>
            {t === "phone" ? "Phone" : "Email"}
          </button>
        ))}
      </div>

      {/* Email tab */}
      {tab === "email" && emailMode === "signin" && (
        <div style={{ animation: "fadeUp 150ms ease-out both" }} className="flex flex-col gap-2.5">
          <Input type="email" placeholder="Email" value={email}
            onChange={(v) => { setEmail(v); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailSignIn()} />
          <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
            onChange={(v) => { setPassword(v); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailSignIn()}
            right={
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="cursor-pointer transition-colors" style={{ color: "#555" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#999"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}>
                <EyeIcon open={showPassword} />
              </button>
            }
          />

          {/* Legal text */}
          <p className="text-[11px] leading-relaxed" style={{ color: "#555" }}>
            By continuing, you acknowledge and agree to SokoResult&apos;s{" "}
            <Link href="/terms" className="underline" style={{ color: "#777" }}>legal terms</Link>
            , which we recommend reviewing.
          </p>

          <ErrorMsg />

          <button onClick={handleEmailSignIn} disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[#0A0A12] cursor-pointer disabled:opacity-60 transition-all duration-200 mt-1"
            style={{ height: 48, background: "#00E676" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = "brightness(1.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}>
            {loading === "email" && <Spinner />}
            {loading === "email" ? "Signing in…" : "Log in"}
          </button>

          <button onClick={() => { setEmailMode("forgot"); setResetEmail(email); setError(""); }}
            className="w-full text-center text-[13px] font-medium transition-colors cursor-pointer"
            style={{ color: "#00E676" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            Forgot password?
          </button>
        </div>
      )}

      {/* Forgot password */}
      {tab === "email" && emailMode === "forgot" && (
        <div style={{ animation: "fadeUp 150ms ease-out both" }} className="flex flex-col gap-3">
          {!resetSent ? (
            <>
              <p className="text-[13px]" style={{ color: "#888" }}>
                Enter your email and we&apos;ll send a reset link.
              </p>
              <Input type="email" placeholder="Email" value={resetEmail}
                onChange={(v) => { setResetEmail(v); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()} />
              <ErrorMsg />
              <button onClick={handleForgotPassword} disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[#0A0A12] cursor-pointer disabled:opacity-60 transition-all"
                style={{ height: 48, background: "#00E676" }}>
                {loading === "reset" && <Spinner />}
                {loading === "reset" ? "Sending…" : "Send Reset Link"}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-[14px]" style={{ color: "#00E676" }}>Reset link sent to your email.</p>
            </div>
          )}
          <button onClick={() => { setEmailMode("signin"); setResetSent(false); setError(""); }}
            className="text-center text-[13px] cursor-pointer transition-colors" style={{ color: "#555" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#999"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}>
            ← Back to sign in
          </button>
        </div>
      )}

      {/* Phone tab */}
      {tab === "phone" && phoneStage === "input" && (
        <div style={{ animation: "fadeUp 150ms ease-out both" }} className="flex flex-col gap-3">
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "#252525", border: "1px solid #333" }}>
            <span className="pl-4 text-[14px] whitespace-nowrap select-none" style={{ color: "#888" }}>🇰🇪 +254</span>
            <input type="tel" inputMode="numeric" placeholder="712 345 678" value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, "")); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              maxLength={11}
              className="flex-1 bg-transparent px-3 py-3 text-[14px] text-white placeholder-[#555] focus:outline-none"
              style={{ fontFamily: "var(--font-space-mono, monospace)" }} />
          </div>
          <ErrorMsg />
          <button onClick={handleSendCode} disabled={!!loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[#0A0A12] cursor-pointer disabled:opacity-60 transition-all"
            style={{ height: 48, background: "#00E676" }}>
            {loading === "phone" ? <><Spinner /> Sending…</> : "Continue"}
          </button>
        </div>
      )}

      {tab === "phone" && phoneStage === "otp" && (
        <div style={{ animation: "fadeUp 200ms ease-out both" }}>
          <p className="text-[13px] text-center mb-2" style={{ color: "#888" }}>
            Enter the 6-digit code sent to +254 {phone}
          </p>
          <OtpBoxes value={otp} onChange={setOtp} />
          <button onClick={handleVerifyOtp} disabled={!!loading || otp.join("").length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-[#0A0A12] cursor-pointer disabled:opacity-60 transition-all"
            style={{ height: 48, background: "#00E676" }}>
            {loading === "verify" ? <><Spinner /> Verifying…</> : "Verify Code"}
          </button>
          <div className="text-center mt-4">
            {countdown > 0 ? (
              <p className="text-[12px]" style={{ color: "#555" }}>
                Resend code in <span style={{ fontFamily: "var(--font-space-mono, monospace)" }}>{countdown}s</span>
              </p>
            ) : (
              <p className="text-[12px]" style={{ color: "#555" }}>
                Didn&apos;t get it?{" "}
                <button onClick={() => { setOtp(["","","","","",""]); setPhoneStage("input"); setError(""); }}
                  className="cursor-pointer" style={{ color: "#00E676" }}>Resend</button>
              </p>
            )}
          </div>
          <ErrorMsg />
        </div>
      )}

      {/* Bottom link */}
      <p className="text-center text-[13px] mt-6" style={{ color: "#555" }}>
        No account?{" "}
        <Link href="/signup" className="font-medium transition-colors" style={{ color: "#00E676" }}>
          Create one
        </Link>
      </p>

      <div id="recaptcha-container" className="absolute invisible" />
    </div>
  );
}
