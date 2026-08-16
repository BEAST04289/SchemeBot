'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, Landmark as GovernmentIcon, Languages } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');

  const t = {
    govt: language === 'hi' ? '🇮🇳 भारत सरकार (GOVERNMENT OF INDIA)' : '🇮🇳 GOVERNMENT OF INDIA (भारत सरकार)',
    title: language === 'hi' ? 'पहचान सत्यापित करें' : 'Verify Identity',
    subtitle: language === 'hi'
      ? 'सरकारी योजनाओं का लाभ उठाने के लिए अपना मोबाइल दर्ज करें।'
      : 'Enter your mobile to access welfare benefits.',
    phoneLabel: language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number',
    phonePlaceholder: language === 'hi' ? '98765 43210' : '98765 43210',
    loginBtn: language === 'hi' ? 'लॉगिन करें' : 'Login',
    errorMsg: language === 'hi'
      ? 'कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।'
      : 'Please enter a valid 10-digit phone number.',
    disclaimer: language === 'hi'
      ? 'आगे बढ़कर आप नियमों से सहमत होते हैं। सुरक्षित डेटा एन्क्रिप्शन मानकों द्वारा समर्थित।'
      : 'By continuing, you agree to secure data security guidelines.',
    secure: language === 'hi' ? 'सुरक्षित प्रवेश' : 'Secure Entry',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      setOtpSent(true);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const cleaned = phoneNumber.replace(/\D/g, '');
      if (cleaned.length < 10) {
        throw new Error(language === 'hi' ? 'कृपया एक वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid mobile number.');
      }

      // Dev mode fast-path: if Firebase isn't configured, bypass Turnstile
      const devRes = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, otp: otp }),
      });

      if (devRes.ok) {
        router.push('/dashboard');
        return;
      }

      // If dev-login is disabled (production), fall back to Firebase session
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: cleaned,
          turnstile_token: 'mock_turnstile_dev',
        }),
      });

      const data = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(data.detail?.error || (language === 'hi' ? 'लॉगिन विफल रहा।' : 'Login failed.'));
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || (language === 'hi' ? 'एक त्रुटि हुई।' : 'An error occurred.'));
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
            <div className="p-3.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-[10px] font-bold text-navy uppercase block mb-1">
                {t.phoneLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-semibold text-sm">+91</span>
                  <div className="h-4 w-[1px] bg-slate-200 ml-2"></div>
                </div>
                <input
                  type="tel"
                  placeholder={t.phonePlaceholder}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSent}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-sm font-semibold transition-all text-navy bg-white disabled:opacity-50"
                  autoComplete="tel"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {otpSent && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="text-[10px] font-bold text-navy uppercase tracking-wider block">
                  {language === 'hi' ? 'OTP दर्ज करें / ENTER OTP' : 'ENTER OTP'}
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-sm font-mono font-bold transition-all text-navy bg-white"
                  inputMode="numeric"
                  required
                />
              </div>
            )}

            {/* Security Badge (replaces Turnstile in dev) */}
            <div className="flex items-center justify-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-tricolorgreen" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {t.secure}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center py-3 px-4 text-xs font-bold text-white bg-saffron hover:bg-saffron-dark rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...'}
                </>
              ) : (
                <>
                  {otpSent ? (language === 'hi' ? 'लॉगिन करें' : 'Verify & Login') : t.loginBtn}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center border-t border-slate-100 pt-4">
            <p className="text-slate-400 text-[9px] leading-relaxed font-medium">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
