'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Shield, Search, FileText, Landmark } from 'lucide-react';

export default function Home() {
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');

  const t = {
    hero_title: language === 'hi' ? 'सरकारी योजनाओं की खोज, अब आसान' : 'Find Government Schemes, Made Simple',
    hero_sub: language === 'hi'
      ? 'अपनी पात्रता जांचें और 2 मिनट में सही कल्याणकारी योजनाएं खोजें।'
      : 'Check your eligibility and discover the right welfare schemes in 2 minutes.',
    cta_start: language === 'hi' ? 'अभी जांचें' : 'Check Now',
    cta_whatsapp: language === 'hi' ? 'WhatsApp पर बात करें' : 'Chat on WhatsApp',
    feat1_title: language === 'hi' ? 'त्वरित पात्रता जांच' : 'Instant Eligibility Check',
    feat1_desc: language === 'hi' ? 'अपनी जानकारी दर्ज करें और तुरंत जानें कि आप किन योजनाओं के लिए पात्र हैं।' : 'Enter your details and instantly find out which schemes you qualify for.',
    feat2_title: language === 'hi' ? 'दस्तावेज़ मार्गदर्शन' : 'Document Guidance',
    feat2_desc: language === 'hi' ? 'हर योजना के लिए ज़रूरी कागजात की पूरी सूची और आवेदन प्रक्रिया।' : 'Complete list of required documents and step-by-step application process.',
    feat3_title: language === 'hi' ? 'सुरक्षित और विश्वसनीय' : 'Safe & Secure',
    feat3_desc: language === 'hi' ? 'आपकी जानकारी पूरी तरह सुरक्षित है। हम कोई आधार नंबर स्टोर नहीं करते।' : 'Your data is fully protected. We never store Aadhaar numbers.',
    categories_title: language === 'hi' ? 'हम किसकी मदद करते हैं' : 'Who We Help',
    cat1: language === 'hi' ? 'किसान' : 'Farmers',
    cat2: language === 'hi' ? 'महिलाएं' : 'Women',
    cat3: language === 'hi' ? 'छात्र' : 'Students',
    cat4: language === 'hi' ? 'वरिष्ठ नागरिक' : 'Senior Citizens',
    cat5: language === 'hi' ? 'श्रमिक' : 'Workers',
    cat6: language === 'hi' ? 'उद्यमी' : 'Entrepreneurs',
    login: language === 'hi' ? 'लॉगिन करें' : 'Login',
    pricing_title: language === 'hi' ? 'सरल मूल्य निर्धारण' : 'Simple Pricing',
    pricing_sub: language === 'hi' ? 'पहली खोज मुफ्त। अधिक के लिए अपग्रेड करें।' : 'First search is free. Upgrade for more.',
    free: language === 'hi' ? 'मुफ्त' : 'Free',
    pro: language === 'hi' ? 'प्रो' : 'Pro',
    free_f1: language === 'hi' ? '1 पात्रता खोज' : '1 eligibility search',
    free_f2: language === 'hi' ? 'चैट सहायक' : 'Chat assistant',
    pro_f1: language === 'hi' ? 'असीमित खोज' : 'Unlimited searches',
    pro_f2: language === 'hi' ? 'अनुस्मारक और ट्रैकिंग' : 'Reminders & tracking',
    pro_f3: language === 'hi' ? 'प्राथमिकता सहायता' : 'Priority support',
    try_free: language === 'hi' ? 'मुफ्त शुरू करें' : 'Start Free',
    upgrade: language === 'hi' ? 'अपग्रेड करें' : 'Upgrade',
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">

      {/* Tricolour stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-saffron via-white to-tricolorgreen shrink-0" />

      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5 text-saffron" />
            </div>
            <div>
              <span className="font-bold text-lg text-navy block leading-tight">Sarthi Kalyan</span>
              <span className="text-[9px] text-slate-400 font-medium block">सार्थी कल्याण</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full transition-all ${language === 'en' ? 'bg-white shadow-sm text-navy' : 'text-slate-400'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 rounded-full transition-all ${language === 'hi' ? 'bg-white shadow-sm text-navy' : 'text-slate-400'}`}
              >
                हिं
              </button>
            </div>
            <Link
              href="/auth"
              className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:bg-navy-light transition-colors"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h1 className="text-3xl sm:text-5xl font-bold text-navy leading-tight tracking-tight">
            {t.hero_title}
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            {t.hero_sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center px-6 py-3 bg-saffron text-white font-semibold rounded-xl shadow-sm hover:bg-saffron-dark transition-colors"
            >
              {t.cta_start}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <a
              href="https://wa.me/918080808080"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-200 text-navy font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2 text-tricolorgreen" />
              {t.cta_whatsapp}
            </a>
          </div>
        </div>
      </section>

      {/* Features — 3 clean cards */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-saffron" />
            </div>
            <h3 className="font-semibold text-sm text-navy">{t.feat1_title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.feat1_desc}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-tricolorgreen/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-tricolorgreen" />
            </div>
            <h3 className="font-semibold text-sm text-navy">{t.feat2_title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.feat2_desc}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm text-navy">{t.feat3_title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.feat3_desc}</p>
          </div>
        </div>
      </section>

      {/* Categories — simple pill tags */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-xl font-bold text-navy">{t.categories_title}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[t.cat1, t.cat2, t.cat3, t.cat4, t.cat5, t.cat6].map((cat, i) => (
              <span
                key={i}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-navy hover:border-saffron hover:text-saffron transition-colors cursor-default"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — 2 cards side by side */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-navy">{t.pricing_title}</h2>
            <p className="text-sm text-slate-500">{t.pricing_sub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase">{t.free}</span>
                <div className="text-3xl font-bold text-navy">₹0</div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-tricolorgreen mr-2.5 shrink-0" />{t.free_f1}</li>
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-tricolorgreen mr-2.5 shrink-0" />{t.free_f2}</li>
                </ul>
              </div>
              <Link href="/auth" className="mt-8 w-full py-2.5 text-center text-sm font-semibold border border-slate-200 rounded-xl text-navy hover:bg-slate-50 transition-colors block">
                {t.try_free}
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl p-6 border-2 border-saffron flex flex-col justify-between relative">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-saffron uppercase">{t.pro}</span>
                <div className="text-3xl font-bold text-navy">₹299</div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-tricolorgreen mr-2.5 shrink-0" />{t.pro_f1}</li>
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-tricolorgreen mr-2.5 shrink-0" />{t.pro_f2}</li>
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-tricolorgreen mr-2.5 shrink-0" />{t.pro_f3}</li>
                </ul>
              </div>
              <Link href="/auth" className="mt-8 w-full py-2.5 text-center text-sm font-semibold bg-saffron text-white rounded-xl hover:bg-saffron-dark transition-colors block">
                {t.upgrade}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 space-y-3 sm:space-y-0">
          <span className="font-medium text-slate-500">Sarthi Kalyan © {new Date().getFullYear()}</span>
          <div className="flex items-center space-x-4">
            <a href="https://myscheme.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-navy transition-colors">myscheme.gov.in</a>
            <span>•</span>
            <span>XPRIZE Build with Gemini 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
