"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Landmark as GovernmentIcon } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("hi");

  useEffect(() => {
    // Initialize Firebase Recaptcha (invisible) for Phone Auth
    if (typeof window !== "undefined" && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      } catch (e) {
        console.error("Recaptcha init failed", e);
      }
    }
  }, []);

  const t = {
    govt: language === 'hi' ? '🇮🇳 भारत सरकार (GOVERNMENT OF INDIA)' : '🇮🇳 GOVERNMENT OF INDIA (भारत सरकार)',
    title: language === 'hi' ? 'पहचान सत्यापित करें' : 'Verify Identity',
    subtitle: language === 'hi'
      ? 'सरकारी योजनाओं का लाभ उठाने के लिए अपना मोबाइल दर्ज करें।'
      : 'Enter your mobile to access welfare benefits.',
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      setError("Please complete the security check.");
      return;
    }
    
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Dev login bypass if we are running locally without Firebase keys
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'YOUR_FIREBASE_API_KEY') {
        console.log("Using Dev Login Bypass");
        const devRes = await fetch('/api/auth/dev-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleaned }),
        });

        if (devRes.ok) {
          router.push('/dashboard');
          return;
        }
      }

      const formattedPhone = `+91${cleaned}`;
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      // POST to our backend to create a session
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          turnstile_token: turnstileToken || "mock_token",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail?.error || "Authentication failed on server.");
      }

      // Success, redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid OTP or session failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* Top Government Bar */}
      <div className="bg-[#0a192f] text-slate-300 text-[10px] py-2 px-8 flex flex-col md:flex-row justify-between items-center border-b border-navy-dark shrink-0 gap-2 md:gap-0">
        <div className="flex items-center space-x-2 font-semibold text-center md:text-left">
          <span>{t.govt}</span>
          <span className="text-slate-500 hidden md:inline">|</span>
          <span className="text-saffron hidden md:inline uppercase tracking-wider">Secure Data Compliance</span>
        </div>
        {/* Language Toggle */}
        <div className="flex items-center bg-white/5 rounded-full p-0.5 border border-white/10">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-0.5 rounded-full transition-all text-[10px] font-bold cursor-pointer ${
              language === 'en' ? 'bg-saffron text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`px-3 py-0.5 rounded-full transition-all text-[10px] font-bold cursor-pointer ${
              language === 'hi' ? 'bg-saffron text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Tricolour Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-saffron via-white to-tricolorgreen shrink-0" />

      {/* Auth Card Container */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-8">
          {/* Branding header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center space-x-2 justify-center">
              <GovernmentIcon className="w-6 h-6 text-saffron" />
              <span className="font-black text-2xl text-navy">Sarthi Kalyan</span>
            </Link>
            <h2 className="text-lg font-bold text-navy">
              {t.title}
            </h2>
            <p className="text-slate-400 text-xs font-semibold">
              {t.subtitle}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-semibold">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="absolute inset-y-0 left-10 flex items-center text-slate-500 font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="99999 99999"
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-saffron focus:border-saffron outline-none transition text-navy font-semibold text-sm"
                    disabled={loading}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex justify-center my-4 min-h-[65px]">
                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== '1x00000000000000000000AA' && (
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setError("Security check failed. Please refresh.")}
                  />
                )}
                {(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA') && (
                   <div className="flex items-center justify-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200 w-full">
                     <ShieldCheck className="w-4 h-4 text-tricolorgreen" />
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                       Dev Mode Auth Bypass Active
                     </span>
                   </div>
                )}
              </div>
              
              <div id="recaptcha-container"></div>

              <button
                type="submit"
                disabled={loading || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== '1x00000000000000000000AA' && !turnstileToken)}
                className="w-full bg-saffron text-white py-3 px-4 rounded-lg font-bold hover:bg-saffron-dark transition flex justify-center items-center gap-2 disabled:opacity-50 uppercase tracking-wider text-xs"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Sending OTP..." : "Get OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600">
                  Enter the 6-digit code sent to <br />
                  <span className="font-bold text-navy">+91 {phone}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase mb-2 text-center">One Time Password</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.5em] text-2xl py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-saffron focus:border-saffron outline-none transition text-navy"
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-saffron text-white py-3 rounded-lg font-bold hover:bg-saffron-dark transition flex justify-center items-center gap-2 disabled:opacity-50 uppercase tracking-wider text-xs"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setStep("phone"); setOtp(""); }}
                  className="text-xs font-semibold text-slate-500 hover:text-navy transition"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}

          <div className="text-center border-t border-slate-100 pt-4">
            <p className="text-slate-400 text-[9px] leading-relaxed font-medium">
              By continuing, you agree to secure data security guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
