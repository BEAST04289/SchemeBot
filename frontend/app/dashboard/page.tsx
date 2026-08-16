'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MessageSquare, UserCircle, Calendar, LineChart, LogOut, Send, 
  Trash2, RefreshCw, Layers, Sparkles, Landmark as GovernmentIcon, ArrowRight, Languages, Check,
  Menu, X, HelpCircle, AlertTriangle, ShieldCheck, HeartHandshake, Eye, Award, CheckCircle2, ChevronRight, Phone, Search, UploadCloud
} from 'lucide-react';
import SchemeCard, { Scheme } from '@/components/scheme/SchemeCard';
import PaywallModal from '@/components/scheme/PaywallModal';
import schemesData from '@/data/schemes_seed.json';

// All Indian States & Union Territories
const INDIAN_STATES = [
  { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' },
  { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश' },
  { en: 'Assam', hi: 'असम' },
  { en: 'Bihar', hi: 'बिहार' },
  { en: 'Chhattisgarh', hi: 'छत्तीसगढ़' },
  { en: 'Goa', hi: 'गोवा' },
  { en: 'Gujarat', hi: 'गुजरात' },
  { en: 'Haryana', hi: 'हरियाणा' },
  { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश' },
  { en: 'Jharkhand', hi: 'झारखंड' },
  { en: 'Karnataka', hi: 'कर्नाटक' },
  { en: 'Kerala', hi: 'केरल' },
  { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' },
  { en: 'Maharashtra', hi: 'महाराष्ट्र' },
  { en: 'Manipur', hi: 'मणिपुर' },
  { en: 'Meghalaya', hi: 'मेघालय' },
  { en: 'Mizoram', hi: 'मिज़ोरम' },
  { en: 'Nagaland', hi: 'नागालैंड' },
  { en: 'Odisha', hi: 'ओडिशा' },
  { en: 'Punjab', hi: 'पंजाब' },
  { en: 'Rajasthan', hi: 'राजस्थान' },
  { en: 'Sikkim', hi: 'सिक्किम' },
  { en: 'Tamil Nadu', hi: 'तमिलनाडु' },
  { en: 'Telangana', hi: 'तेलंगाना' },
  { en: 'Tripura', hi: 'त्रिपुरा' },
  { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
  { en: 'Uttarakhand', hi: 'उत्तराखंड' },
  { en: 'West Bengal', hi: 'पश्चिम बंगाल' },
  { en: 'Delhi', hi: 'दिल्ली' },
  { en: 'Jammu & Kashmir', hi: 'जम्मू और कश्मीर' },
  { en: 'Ladakh', hi: 'लद्दाख' },
  { en: 'Puducherry', hi: 'पुडुचेरी' },
  { en: 'Chandigarh', hi: 'चंडीगढ़' },
  { en: 'Andaman & Nicobar', hi: 'अंडमान और निकोबार' },
  { en: 'Dadra & Nagar Haveli', hi: 'दादरा और नगर हवेली' },
  { en: 'Lakshadweep', hi: 'लक्षद्वीप' },
];

// All occupation categories matching scheme data
const OCCUPATIONS = [
  { id: 'farmer', en: 'Farmer', hi: 'किसान', icon: '🌾' },
  { id: 'student', en: 'Student', hi: 'छात्र', icon: '📚' },
  { id: 'artisan', en: 'Artisan / Craftsman', hi: 'कारीगर / शिल्पकार', icon: '🔨' },
  { id: 'small_business', en: 'Small Business Owner', hi: 'लघु व्यापारी', icon: '🏪' },
  { id: 'daily_wage', en: 'Daily Wage Worker', hi: 'दिहाड़ी मजदूर', icon: '👷' },
  { id: 'self_employed', en: 'Self Employed', hi: 'स्वरोजगारी', icon: '💼' },
  { id: 'salaried', en: 'Salaried / Govt Employee', hi: 'वेतनभोगी / सरकारी कर्मचारी', icon: '🏢' },
  { id: 'unemployed', en: 'Unemployed / Job Seeker', hi: 'बेरोजगार / नौकरी की तलाश', icon: '🔍' },
  { id: 'homemaker', en: 'Homemaker / Women', hi: 'गृहिणी / महिला', icon: '🏠' },
  { id: 'senior_citizen', en: 'Retired / Senior Citizen', hi: 'सेवानिवृत्त / वरिष्ठ नागरिक', icon: '🧓' },
  { id: 'entrepreneur', en: 'Startup / Entrepreneur', hi: 'स्टार्टअप / उद्यमी', icon: '🚀' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  chips?: string[];
}

type ActiveTab = 'chat' | 'profile' | 'plans' | 'notifications' | 'tracker' | 'impact' | 'quiz' | 'success' | 'details' | 'guide';

export default function Dashboard() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<ActiveTab>('tracker');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [matchedSchemes, setMatchedSchemes] = useState<Scheme[]>([]);
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Form States (Image 1)
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  // Direct Eligibility Checker Form State
  const [formAge, setFormAge] = useState<number | ''>('');
  const [formState, setFormState] = useState('');
  const [formOccupation, setFormOccupation] = useState('');
  const [formIncome, setFormIncome] = useState<number | ''>('');
  const [formCategory, setFormCategory] = useState('');
  const [formAadhaar, setFormAadhaar] = useState<boolean>(true);
  const [formAadhaarNumber, setFormAadhaarNumber] = useState('');
  const [aadhaarStatus, setAadhaarStatus] = useState<'idle' | 'otp_sent' | 'verified'>('idle');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [stateSearch, setStateSearch] = useState('');

  // Quiz States (Image 7)
  const [quizStep, setQuizStep] = useState(1);
  const [quizState, setQuizState] = useState('');
  const [appStep, setAppStep] = useState(1);

  // Checkout Promos & Options (Image 5)
  const [checkoutPromo, setCheckoutPromo] = useState('SARTHI20');
  const [paymentTab, setPaymentTab] = useState<'card' | 'upi' | 'banking' | 'wallet'>('card');
  const [cardNumber, setCardNumber] = useState('');

  // Selected Scheme Detail View State (Image 10)
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [successSchemeName, setSuccessSchemeName] = useState('');
  const [successReferenceId, setSuccessReferenceId] = useState('SK-2024-10-12345');
  const [successDate, setSuccessDate] = useState('15 Oct 2024');

  useEffect(() => {
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const randomId = Math.floor(10000 + Math.random() * 90000);
    setSuccessDate(formattedDate);
    setSuccessReferenceId(`SK-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${randomId}`);
  }, []);

  // Paywall & Billing State
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [userTier, setUserTier] = useState<string>('free');
  const [reportsRemaining, setReportsRemaining] = useState<number>(1);
  const [trialUsed, setTrialUsed] = useState<boolean>(false);

  // Tracker State
  const [trackedSchemes, setTrackedSchemes] = useState<any[]>([]);
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);

  // Public Stats State
  const [stats, setStats] = useState<any>(null);
  const [richStats, setRichStats] = useState<any>(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tl = (hi: string, en: string) => language === 'hi' ? hi : en;

  // Toast notification state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getSchemeDetails = (schemeId: string): Scheme => {
    const seed = schemesData.find((s: any) => s.id === schemeId);
    if (seed) {
      return {
        scheme_id: seed.id,
        name: seed.name || seed.id,
        name_hi: seed.name_hindi || seed.name || seed.id,
        ministry: seed.ministry || 'Government Welfare',
        benefit_amount: seed.benefit || seed.plain_language_summary || '',
        documents_required: seed.documents || [],
        application_url: seed.apply_url || '',
        annual_value: seed.annual_value || 0,
        confidence_score: 100
      };
    }
    return {
      scheme_id: schemeId,
      name: schemeId.replace(/_/g, ' ').toUpperCase(),
      name_hi: schemeId,
      ministry: 'Government Welfare',
      benefit_amount: 'Determined on Apply',
      documents_required: [],
      application_url: '',
      annual_value: 0,
      confidence_score: 100
    };
  };

  useEffect(() => {
    const checkSessionAndTier = async () => {
      try {
        const trackerRes = await fetch('/api/tracker/status');
        if (trackerRes.status === 401) {
          router.push('/auth');
          return;
        }
        
        const adminRes = await fetch('/api/admin/dashboard');
        if (adminRes.ok) {
          setUserTier('ngo');
          setReportsRemaining(-1);
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    };

    checkSessionAndTier();
    startNewChat();
    fetchTrackedStatus();
    fetchStats();
  }, []);

  const startNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'नमस्ते! मैं सार्थी कल्याण असिस्टेंट हूँ। आइए आपके लिए योग्य योजनाओं का पता लगाएं।\n\nसबसे पहले, कृपया अपनी उम्र बताएं:',
        chips: ['18', '25', '45', '60']
      }
    ]);
  };

  const fetchTrackedStatus = async () => {
    setIsTrackerLoading(true);
    try {
      const res = await fetch('/api/tracker/status');
      if (res.ok) {
        const data = await res.json();
        setTrackedSchemes(data.schemes || []);
      }
    } catch (err) {
      console.error('Failed to load tracker status:', err);
    } finally {
      setIsTrackerLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsImpactLoading(true);
    try {
      const res = await fetch('/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
      const summaryRes = await fetch('/api/impact/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setRichStats(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsImpactLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {}
    router.push('/');
  };

  const handleUpgradeSuccess = (newTier: string) => {
    setUserTier(newTier);
    setReportsRemaining(-1);
    setError(null);
    showToast(`Success! Upgraded to ${newTier.toUpperCase()} tier.`);
  };

  const handleMatchSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: 35, // default since not asked in quiz
          state: quizState,
          occupation: formOccupation.includes('(') ? formOccupation.split(' (')[0].toLowerCase() : formOccupation.toLowerCase(),
          annual_income_inr: formIncome || 0,
          social_category: 'General',
          has_aadhaar: true,
          language: language
        })
      });
      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatchedSchemes(data.matches || []);
        if (!trialUsed) {
          setTrialUsed(true);
        } else if (userTier === 'free') {
          showToast('Free trial exhausted. Please upgrade to continue.', 'error');
          return;
        }
        setQuizStep(4);
      } else if (matchRes.status === 402) {
         showToast('Free trial exhausted. Please upgrade to continue.', 'error');
         setActivePanel('plans');
      } else {
        const errorData = await matchRes.json();
        setError(errorData.detail?.error || 'Failed to fetch matches');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-xs font-bold animate-in fade-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-tricolorgreen' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Top Government Slogan Bar */}
      <div className="bg-gradient-to-r from-[#0a192f] via-[#0f2942] to-[#0a192f] text-slate-300 text-[10px] py-2 px-8 flex flex-col md:flex-row justify-between items-center border-b border-navy/40 shrink-0 gap-3 md:gap-0 shadow-sm z-30">
        <div className="flex items-center space-x-2 font-semibold text-center md:text-left tracking-wide">
          <span className="flex items-center space-x-1.5">
            <span className="text-xs">🇮🇳</span>
            <span className="bg-gradient-to-r from-saffron via-white to-tricolorgreen bg-clip-text text-transparent font-black">भारत सरकार</span>
            <span className="text-slate-400 font-normal">(GOVERNMENT OF INDIA)</span>
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-saffron/90 hidden md:inline uppercase font-bold tracking-wider text-[8px]">Secure Welfare Compliance</span>
        </div>
        <div className="flex items-center space-x-5 flex-wrap justify-center font-bold text-[9px]">
          <div className="flex items-center bg-white/5 rounded-full p-0.5 border border-white/10 shadow-inner">
            <button 
              onClick={() => {
                setLanguage('en');
                const gtSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
                if (gtSelect) { gtSelect.value = 'en'; gtSelect.dispatchEvent(new Event('change')); }
              }} 
              className={`px-3 py-0.5 rounded-full transition-all cursor-pointer ${language === 'en' ? 'bg-saffron text-white shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'}`}
            >
              English
            </button>
            <button 
              onClick={() => {
                setLanguage('hi');
                const gtSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
                if (gtSelect) { gtSelect.value = 'hi'; gtSelect.dispatchEvent(new Event('change')); }
              }} 
              className={`px-3 py-0.5 rounded-full transition-all cursor-pointer ${language === 'hi' ? 'bg-saffron text-white shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'}`}
            >
              हिन्दी
            </button>
        </div>
      </div>
    </div>

      {/* Tricolour Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-saffron via-white to-tricolorgreen shrink-0 z-30" />

      {/* Dashboard Header */}
      <header className="bg-[#0a192f] border-b border-navy-dark px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md z-20 text-white">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            {/* Tricolour Flag */}
            <div className="w-8 h-5 bg-gradient-to-r from-saffron via-white to-tricolorgreen rounded flex items-center justify-center border border-white/20 shadow-sm overflow-hidden text-[8px] font-bold">
              🇮🇳
            </div>
            
            {/* Logo Emblem & Sarthi Kalyan */}
            <div className="flex items-center space-x-2 border-l border-white/20 pl-3">
              <GovernmentIcon className="w-5 h-5 text-saffron" />
              <div>
                <span className="font-black text-xs tracking-wider block uppercase leading-none">SARTHI KALYAN</span>
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">GOVERNMENT OF INDIA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Profile dropdown exactly like screen */}
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-90">
          <span className="text-[10px] font-bold text-slate-200">
            {profileName}
          </span>
          <div className="w-7 h-7 rounded-full bg-slate-200 border border-white/20 flex items-center justify-center text-slate-700 text-xs font-bold overflow-hidden shadow-inner">
            👤
          </div>
          <span className="text-[8px] text-slate-400">▼</span>
        </div>
      </header>

      {/* Main Panel layout */}
      <div className="flex-1 flex overflow-hidden bg-slate-50">
        
        {/* Left Navigation Sidebar - Light grey bg exactly like screen */}
        <aside className={`w-[240px] shrink-0 bg-slate-50 border-r border-slate-200/80 flex flex-col justify-between z-40 transition-all duration-300 absolute md:static inset-y-0 left-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex flex-col flex-1 min-h-0">
            
            {/* Mobile close */}
            <div className="md:hidden p-4 border-b border-slate-200 flex justify-end">
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="py-6 space-y-1.5 flex-1 overflow-y-auto">
              <button
                onClick={() => { setActivePanel('chat'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold transition-all text-left border-l-4 ${
                  activePanel === 'chat' || activePanel === 'tracker'
                    ? 'bg-[#000080]/5 text-[#000080] border-l-[#000080]' 
                    : 'border-l-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat Assistant</span>
              </button>

              <button
                onClick={() => { setActivePanel('profile'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold transition-all text-left border-l-4 ${
                  activePanel === 'profile'
                    ? 'bg-[#000080]/5 text-[#000080] border-l-[#000080]' 
                    : 'border-l-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                <span>Personal Information</span>
              </button>

              <button
                onClick={() => { setActivePanel('plans'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold transition-all text-left border-l-4 ${
                  activePanel === 'plans'
                    ? 'bg-[#000080]/5 text-[#000080] border-l-[#000080]' 
                    : 'border-l-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Subscription Plans</span>
              </button>

              <button
                onClick={() => { setActivePanel('notifications'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold transition-all text-left border-l-4 ${
                  activePanel === 'notifications'
                    ? 'bg-[#000080]/5 text-[#000080] border-l-[#000080]' 
                    : 'border-l-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Notifications</span>
              </button>
            </nav>
          </div>

          {/* Log Out button at the bottom */}
          <div className="p-4 border-t border-slate-200">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Dashboard Content Workspace */}
        <main className="flex-1 flex overflow-hidden relative">
          
          <section className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
            
            {/* OVERVIEW DASHBOARD */}
            {(activePanel === 'tracker' || activePanel === 'profile') && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-bold text-sm text-navy">{tl(`नमस्ते, ${profileName}!`, `Hello, ${profileName}!`)}</h3>
                    <p className="text-[10px] text-slate-400">{tl('सार्थी कल्याण डेटा रिपोर्ट एवं प्रगति ट्रैकर', 'Welfare report and progress tracker')}</p>
                  </div>
                  <button 
                    onClick={() => { setActivePanel('quiz'); setQuizStep(1); }}
                    className="py-1.5 px-3.5 bg-saffron hover:bg-saffron-dark text-white font-bold rounded-lg text-[10px] uppercase tracking-wider shadow flex items-center cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {tl('नई योजना खोजें', 'New Scheme Search')}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Top Stats Tiles */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between">
                      <span className="text-3xl font-black text-navy leading-none">12</span>
                      <div>
                        <span className="text-[10px] font-black text-navy block">{tl('योजनाएं मिलीं', 'Schemes Matched')}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{tl('Schemes Matched', 'Total Discovered')}</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between">
                      <span className="text-3xl font-black text-saffron leading-none">03</span>
                      <div>
                        <span className="text-[10px] font-black text-navy block">{tl('सक्रिय आवेदन', 'Active Applications')}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{tl('Active Applications', 'Currently Processing')}</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between">
                      <span className="text-3xl font-black text-tricolorgreen leading-none">02</span>
                      <div>
                        <span className="text-[10px] font-black text-navy block">{tl('स्वीकृत लाभ', 'Approved Benefits')}</span>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase block mt-0.5">{tl('Approved Benefits', 'Ready to Claim')}</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 flex flex-col justify-between">
                      <span className="text-3xl font-black text-slate-500 leading-none">05</span>
                      <div>
                        <span className="text-[10px] font-black text-navy block">{tl('सूचनाएं', 'Alerts Received')}</span>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase block mt-0.5">{tl('Alerts Received', 'Recent Updates')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Recent Applications */}
                    <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5 text-left">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-black text-navy uppercase tracking-wider block">{tl('हाल के आवेदन', 'Recent Applications')}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block mt-0.5">{tl('Recent Applications', 'Your Activity')}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase cursor-pointer hover:underline">{tl('सभी देखें', 'View All')}</span>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-navy leading-snug">{tl('पीएम किसान सम्मान निधि', 'PM Kisan Samman Nidhi')}</h4>
                              <p className="text-[9px] text-slate-400 font-medium">{tl('कृषि मंत्रालय', 'Agriculture Ministry')}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">AGRICULTURE MINISTRY</p>
                            </div>
                            <span className="px-2 py-0.5 bg-green-50 text-tricolorgreen border border-green-200 text-[8px] font-black uppercase rounded-full">APPROVED</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-bold text-slate-400">
                              <span>{tl('प्रगति', 'Progress')}</span>
                              <span className="text-tricolorgreen font-black">90%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-tricolorgreen h-full rounded-full" style={{ width: '90%' }} />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-navy leading-snug">{tl('पीएम फसल बीमा योजना', 'PM Fasal Bima Yojana')}</h4>
                              <p className="text-[9px] text-slate-400 font-medium">{tl('फसल बीमा विभाग', 'Crop Insurance Department')}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">CROP INSURANCE DEPARTMENT</p>
                            </div>
                            <span className="px-2 py-0.5 bg-yellow-50 text-saffron border border-yellow-200 text-[8px] font-black uppercase rounded-full">UNDER REVIEW</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-bold text-slate-400">
                              <span>{tl('प्रगति', 'Progress')}</span>
                              <span className="text-saffron font-black">45%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-saffron h-full rounded-full" style={{ width: '45%' }} />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-navy leading-snug">{tl('राष्ट्रीय छात्रवृत्ति पोर्टल', 'National Scholarship Portal')}</h4>
                              <p className="text-[9px] text-slate-400 font-medium">{tl('छात्रवृत्ति विभाग', 'Scholarship Department')}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">SCHOLARSHIP DEPARTMENT</p>
                            </div>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[8px] font-black uppercase rounded-full">IN PROGRESS</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-bold text-slate-400">
                              <span>{tl('प्रगति', 'Progress')}</span>
                              <span className="text-blue-600 font-black">60%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: '60%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Latest Notifications */}
                    <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5 text-left">
                      <div className="pb-3 border-b border-slate-100">
                        <span className="text-xs font-black text-navy uppercase tracking-wider block">{tl('नवीनतम सूचनाएं', 'Latest Notifications')}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mt-0.5">{tl('Latest Notifications', 'Recent Updates')}</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 border-l-4 border-red-500 bg-red-50/10 rounded-r-2xl space-y-2.5">
                          <div className="flex justify-between items-center text-[8px] font-bold text-red-500">
                            <span>{tl('अत्यावश्यक • आज', 'URGENT • TODAY')}</span>
                            <span>3:40 PM</span>
                          </div>
                          <h5 className="font-bold text-xs text-navy leading-snug">{tl('PM Kisan - आवेदन तिथि समाप्त होने वाली है!', 'PM Kisan - Registration deadline closing!')}</h5>
                          <p className="text-[10px] text-slate-400 font-semibold">{tl('PM Kisan पंजीकरण की समय सीमा 2 दिन में समाप्त हो रही है।', 'PM Kisan registration deadline closes in 2 days.')}</p>
                          <p className="text-[9px] text-slate-500 leading-normal">Please submit your Aadhaar linking configuration to claim current cycle benefit.</p>
                          <button 
                            onClick={() => { setSuccessSchemeName(tl('पीएम किसान सम्मान निधि', 'PM Kisan Samman Nidhi')); setActivePanel('guide'); setAppStep(1); }}
                            className="py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow cursor-pointer transition-colors"
                          >
                            {tl('अभी पूर्ण करें', 'Complete Now')}
                          </button>
                        </div>

                        <div className="p-4 border-l-4 border-tricolorgreen bg-green-50/10 rounded-r-2xl space-y-1.5">
                          <div className="flex justify-between items-center text-[8px] font-bold text-tricolorgreen">
                            <span>{tl('स्वीकृत • कल', 'APPROVED • YESTERDAY')}</span>
                            <span>10:15 AM</span>
                          </div>
                          <h5 className="font-bold text-xs text-navy leading-snug">{tl('PM Kisan - आधार आवेदन स्वीकृत!', 'PM Kisan - Aadhaar application approved!')}</h5>
                          <p className="text-[10px] text-slate-400 font-semibold">{tl('आपका आधार आवेदन सफलतापूर्वक स्वीकृत हो गया है।', 'Your Aadhaar application has been approved.')}</p>
                          <p className="text-[9px] text-slate-400">Your profile data is synchronized with secure state records.</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>


                {/* WhatsApp feature disabled until business account approved
                <a 
                  href="https://wa.me/918080808080" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="fixed bottom-6 right-6 w-12 h-12 bg-tricolorgreen hover:bg-tricolorgreen-dark text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 z-50 shrink-0"
                >
                  <WhatsAppIcon className="w-6 h-6 fill-current" />
                </a>
                */}
              </div>
            )}

            {/* QUIZ (Image 7 Replica) */}
            {activePanel === 'quiz' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <div className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex justify-between items-center text-[9px] font-black text-navy mb-1.5 uppercase">
                    <span>चरण {quizStep} / STEP {quizStep} OF 4</span>
                    <span className="text-saffron">जनसांख्यिकी / DEMOGRAPHICS</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-saffron h-full transition-all duration-300" style={{ width: `${(quizStep / 4) * 100}%` }} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 flex flex-col justify-center items-center">
                  {quizStep === 1 && (
                    <div className="max-w-4xl w-full text-center space-y-8">
                      <h4 className="text-xl font-black text-navy leading-normal">
                        बताइए, आप किस राज्य से हैं? <br />
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block mt-1">Please select the state you belong to</span>
                      </h4>
                      
                      <div className="max-w-xl mx-auto relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search your state... / अपना राज्य खोजें..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-saffron text-sm font-semibold text-navy shadow-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {INDIAN_STATES.filter(s => 
                          s.en.toLowerCase().includes(stateSearch.toLowerCase()) || 
                          s.hi.includes(stateSearch)
                        ).map((state) => (
                          <button
                            key={state.en}
                            onClick={() => { setQuizState(state.en); setQuizStep(2); setStateSearch(''); }}
                            className={`p-4 bg-white border rounded-xl shadow-sm text-xs font-bold text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all ${
                              quizState === state.en 
                                ? 'border-saffron border-2 shadow-md relative' 
                                : 'border-slate-200 hover:border-saffron hover:shadow text-navy'
                            }`}
                          >
                            {quizState === state.en && (
                              <div className="absolute top-1.5 right-1.5 bg-tricolorgreen text-white rounded-full p-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                            <GovernmentIcon className={`w-6 h-6 ${quizState === state.en ? 'text-saffron' : 'text-slate-400'}`} />
                            <span className={quizState === state.en ? 'text-navy' : ''}>{state.hi}</span>
                            <span className={`text-[9px] uppercase ${quizState === state.en ? 'text-slate-500' : 'text-slate-400'}`}>{state.en}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quizStep === 2 && (
                    <div className="max-w-4xl w-full text-center space-y-8">
                      <h4 className="text-xl font-black text-navy leading-normal">
                        आपकी मुख्य श्रेणी क्या है? <br />
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block mt-1">What is your main occupation?</span>
                      </h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {OCCUPATIONS.map((occ) => (
                          <button
                            key={occ.id}
                            onClick={() => { setFormOccupation(occ.id); setQuizStep(3); }}
                            className={`p-4 bg-white border rounded-xl shadow-sm text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                              formOccupation === occ.id 
                                ? 'border-saffron border-2 shadow-md relative' 
                                : 'border-slate-200 hover:border-saffron hover:shadow text-navy'
                            }`}
                          >
                            <span className="text-2xl mb-1">{occ.icon}</span>
                            <span className={formOccupation === occ.id ? 'text-navy' : ''}>{occ.hi}</span>
                            <span className={`text-[9px] uppercase ${formOccupation === occ.id ? 'text-slate-500' : 'text-slate-400'}`}>{occ.en}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quizStep === 3 && (
                    <div className="max-w-md w-full text-center space-y-6 bg-white p-8 border border-slate-200 rounded-3xl shadow-md">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-navy uppercase tracking-wider">अंतिम विवरण / Final Details</h4>
                        <p className="text-[10px] text-slate-400 font-bold">सही योजनाएं खोजने के लिए यह आवश्यक है।</p>
                      </div>
                      
                      <div className="space-y-5">
                        <div className="text-left space-y-1.5">
                          <label className="text-[10px] font-bold text-navy uppercase">उम्र / Age (Years)</label>
                          <input
                            type="number"
                            placeholder="e.g. 35"
                            value={formAge}
                            onChange={(e) => setFormAge(e.target.value ? Number(e.target.value) : '')}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-navy"
                            min="1" max="120"
                          />
                        </div>

                        <div className="text-left space-y-1.5">
                          <label className="text-[10px] font-bold text-navy uppercase">वार्षिक पारिवारिक आय / Family Annual Income (INR)</label>
                          <input
                            type="number"
                            placeholder="e.g. 90000"
                            value={formIncome}
                            onChange={(e) => setFormIncome(e.target.value ? Number(e.target.value) : '')}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-navy"
                            min="0"
                          />
                        </div>

                        <button
                          onClick={handleMatchSubmit}
                          disabled={isLoading || !formAge || formIncome === ''}
                          className={`w-full py-3.5 mt-4 bg-navy hover:bg-navy-light text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all ${
                            (isLoading || !formAge || formIncome === '') ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                          }`}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> खोज रहे हैं... / SEARCHING...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              परिणाम खोजें / Find Results <ArrowRight className="w-4 h-4 ml-2" />
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {quizStep === 4 && (
                    <div className="max-w-4xl w-full space-y-6">
                      <div className="text-center space-y-2">
                        <span className="text-tricolorgreen font-black text-2xl">बधाई हो! / Matches Found!</span>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">योग्य {matchedSchemes.length} योजनाएं मिलीं! / {matchedSchemes.length} Schemes Matched!</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchedSchemes.map((scheme, idx) => (
                          <div 
                            key={idx}
                            onClick={() => { setSelectedScheme(scheme); setActivePanel('details'); }}
                            className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center group border-l-4 border-l-saffron text-left"
                          >
                            <div className="space-y-1">
                              <h4 className="font-bold text-xs text-navy group-hover:text-saffron transition-colors">
                                {scheme.name_hi || scheme.name} / {scheme.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{scheme.ministry}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-saffron transition-transform group-hover:translate-x-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* APPLICATION GUIDE VIEW (Image 9 Replica) */}
            {activePanel === 'guide' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-sm text-navy uppercase tracking-wider">{successSchemeName || 'प्रधानमंत्री किसान सम्मान निधि'} - आवेदन मार्गदर्शिका</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">APPLICATION GUIDE FOR {successSchemeName || 'PM-KISAN SAMMAN NIDHI'}</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded bg-green-50 text-tricolorgreen border border-green-200 text-[9px] font-black uppercase shadow-sm">
                    <ShieldCheck className="w-4.5 h-4.5 mr-1" />
                    सुरक्षित आवेदन / Secure Application
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
                  <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-[10px] font-bold text-slate-400">
                    <span className={appStep === 1 ? "text-saffron font-black" : "text-slate-400"}>1. विवरण / Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className={appStep === 2 ? "text-saffron font-black" : "text-slate-400"}>2. दस्तावेज़ / Documents</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className={appStep === 3 ? "text-saffron font-black" : "text-slate-400"}>3. समीक्षा / Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className={appStep === 4 ? "text-saffron font-black" : "text-slate-400"}>4. भुगतान / Payment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>5. पुष्टि / Confirm</span>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 text-left ${appStep !== 1 ? 'hidden' : ''}`}>
                      {/* Required Documents Checklist */}
                      <div className="md:col-span-6 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <span className="text-xs font-black text-navy uppercase tracking-wider block border-b border-slate-100 pb-2">आवश्यक दस्तावेज / REQUIRED DOCUMENTS CHECKLIST</span>
                        
                        <div className="space-y-3 text-[10px] font-bold text-slate-600">
                          {selectedScheme?.documents_required && selectedScheme.documents_required.length > 0 ? (
                            selectedScheme.documents_required.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                                <span className="flex items-center"><Check className="w-4 h-4 mr-2 text-slate-300" /> {doc}</span>
                                <span className="text-[8px] px-2 py-0.5 rounded-full uppercase bg-slate-200 text-slate-500">REQUIRED</span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                                <span className="flex items-center"><Check className="w-4 h-4 mr-2 text-slate-300" /> आधार कार्ड / Aadhaar Card</span>
                                <span className="text-[8px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase">REQUIRED</span>
                              </div>
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                                <span className="flex items-center"><Check className="w-4 h-4 mr-2 text-slate-300" /> खतौनी / भूमि रिकॉर्ड / Land Record</span>
                                <span className="text-[8px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase">REQUIRED</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Verify Your Information */}
                      <div className="md:col-span-6 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <span className="text-xs font-black text-navy uppercase tracking-wider block border-b border-slate-100 pb-2">जानकारी सत्यापित करें / Verify Your Information</span>
                        
                        <form onSubmit={(e) => { 
                          e.preventDefault(); 
                          if (!profileName.trim()) {
                            showToast('Please enter your full name.', 'error');
                            return;
                          }
                          setAppStep(2); 
                        }} className="space-y-3 text-xs">
                          <div>
                            <label className="text-[9px] font-bold text-navy uppercase block mb-1">पूरा नाम / FULL NAME</label>
                            <input type="text" required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-navy uppercase block mb-1">आधार नंबर / AADHAAR NUMBER</label>
                            <div className="flex gap-2">
                              <input type="text" required value={formAadhaarNumber} onChange={(e) => setFormAadhaarNumber(e.target.value)} disabled={aadhaarStatus === 'verified' || aadhaarStatus === 'otp_sent'} placeholder="0000 0000 0000" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-navy font-mono font-bold focus:outline-none focus:border-navy disabled:opacity-50" />
                              {aadhaarStatus === 'idle' && (
                                <button type="button" onClick={() => setAadhaarStatus('otp_sent')} className="px-3 bg-navy text-white text-[10px] font-bold rounded hover:bg-navy-light transition">Send OTP</button>
                              )}
                              {aadhaarStatus === 'verified' && (
                                <div className="flex items-center px-3 bg-green-100 text-tricolorgreen text-[10px] font-bold rounded">VERIFIED</div>
                              )}
                            </div>
                            {aadhaarStatus === 'otp_sent' && (
                              <div className="mt-2 flex gap-2">
                                <input type="text" placeholder="Enter OTP" value={aadhaarOtp} onChange={(e) => setAadhaarOtp(e.target.value)} className="flex-1 p-2 bg-white border border-saffron rounded text-navy font-mono font-bold focus:outline-none focus:border-saffron" />
                                <button type="button" onClick={() => {
                                  if(aadhaarOtp.length >= 4) {
                                    setAadhaarStatus('verified');
                                    showToast('Aadhaar verified successfully', 'success');
                                  } else {
                                    showToast('Invalid OTP', 'error');
                                  }
                                }} className="px-3 bg-saffron text-white text-[10px] font-bold rounded hover:bg-saffron-dark transition">Verify</button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-navy uppercase block mb-1">राज्य / STATE</label>
                            <input type="text" required value={quizState || ''} onChange={(e) => setQuizState(e.target.value)} placeholder="e.g. Uttar Pradesh" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-navy uppercase block mb-1">पेशा / OCCUPATION</label>
                            <input type="text" required value={formOccupation || ''} onChange={(e) => setFormOccupation(e.target.value)} placeholder="e.g. Farmer" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy" />
                          </div>

                          <button type="submit" className="w-full py-3 bg-gradient-to-r from-saffron to-orange-500 hover:from-saffron-dark hover:to-orange-600 text-white font-bold rounded-lg uppercase tracking-wider shadow-md transform transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-xs flex items-center justify-center gap-2">
                            <span>सत्यापित करें और आगे बढ़ें / Verify & Proceed</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </form>
                      </div>
                    </div>

                  <div className={`bg-white p-6 border border-slate-200 rounded-2xl shadow-sm text-center space-y-6 ${appStep !== 2 ? 'hidden' : ''}`}>
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                        <UploadCloud className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-navy">दस्तावेज़ अपलोड करें / Upload Documents</h4>
                        <p className="text-xs text-slate-500 mt-1">Please upload your Khatauni (Land Record) in PDF or JPG format.</p>
                      </div>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-bold text-navy">Click to browse or drag and drop</span>
                        <p className="text-[10px] text-slate-400 mt-1">Max file size 5MB</p>
                      </div>
                      <button onClick={() => setAppStep(3)} className="w-full py-3 bg-navy hover:bg-navy-light text-white font-bold rounded-lg uppercase tracking-wider shadow-md transform transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-xs">
                        दस्तावेज़ सहेजें और जारी रखें / Save & Continue
                      </button>
                    </div>

                  <div className={`bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-6 text-left ${appStep !== 3 ? 'hidden' : ''}`}>
                      <h4 className="font-black text-navy border-b border-slate-100 pb-3">समीक्षा / Final Review</h4>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">Applicant Name</span><span className="text-navy font-black">{profileName}</span></div>
                        <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">Aadhaar</span><span className="text-navy font-black">XXXX XXXX 1234 (Verified)</span></div>
                        <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">Land Record</span><span className="text-tricolorgreen font-black flex items-center"><Check className="w-3 h-3 mr-1" /> Uploaded</span></div>
                      </div>
                      <button onClick={() => { setActivePanel('success'); setAppStep(1); }} className="w-full py-3 bg-tricolorgreen hover:bg-green-700 text-white font-bold rounded-lg uppercase tracking-wider shadow-md transform transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-xs flex justify-center items-center gap-2">
                        <span>आवेदन जमा करें / Submit Application</span>
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              </div>
            )}

            {/* CHECKOUT UPGRADE TO PREMIUM PAGE (Image 5 Replica) */}
            {activePanel === 'plans' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-sm text-navy uppercase tracking-wider">Premium Subscription में अपग्रेड करें / Upgrade to Premium</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">सुरक्षित भुगतान / PAYMENTS IS COMPLETELY SECURE</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">🔐 SSL ENCRYPTED</span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full text-left">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Payment options */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Promo Code card */}
                      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-3">
                        <label className="text-[10px] font-bold text-navy uppercase block">प्रोमो कोड / PROMO CODE</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={checkoutPromo}
                            onChange={(e) => setCheckoutPromo(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-navy uppercase focus:outline-none"
                          />
                          <button className="px-4 py-2 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-lg uppercase cursor-pointer">लागू करें / Apply</button>
                        </div>
                      </div>

                      {/* Payment Tabs */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 text-[10px] font-bold text-center text-slate-500">
                          <button onClick={() => setPaymentTab('card')} className={`py-3 ${paymentTab === 'card' ? 'bg-slate-50 text-navy font-black' : ''}`}>💳 कार्ड / Card</button>
                          <button onClick={() => setPaymentTab('upi')} className={`py-3 ${paymentTab === 'upi' ? 'bg-slate-50 text-navy font-black' : ''}`}>📱 यूपीआई / UPI</button>
                          <button onClick={() => setPaymentTab('banking')} className={`py-3 ${paymentTab === 'banking' ? 'bg-slate-50 text-navy font-black' : ''}`}>🏦 नेट बैंकिंग / Banking</button>
                          <button onClick={() => setPaymentTab('wallet')} className={`py-3 ${paymentTab === 'wallet' ? 'bg-slate-50 text-navy font-black' : ''}`}>👛 वॉलेट / Wallet</button>
                        </div>

                        {paymentTab === 'card' && (
                          <div className="p-5 space-y-4">
                            <div>
                              <label className="text-[9px] font-bold text-navy uppercase block mb-1">कार्ड नंबर / CARD NUMBER</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(e.target.value)}
                                  placeholder="0000 0000 0000 0000"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-navy font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-orange-500">VISA</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-navy uppercase block mb-1">कार्डधारक का नाम / CARD HOLDER NAME</label>
                              <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:border-navy"
                              />
                            </div>

                            <button onClick={() => { 
                              if (!cardNumber.trim()) {
                                showToast('कृपया कार्ड नंबर दर्ज करें / Please enter card number', 'error');
                                return;
                              }
                              showToast('Payment Successful! / भुगतान सफल!', 'success'); 
                              setUserTier('pro'); 
                              setActivePanel('tracker'); 
                            }} className="w-full py-3 bg-gradient-to-r from-saffron to-orange-600 hover:from-saffron-dark hover:to-orange-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg transform transition hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                              <span>सुरक्षित भुगतान करें / Pay Securely</span>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right Summary */}
                    <div className="lg:col-span-5 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-6 h-max">
                      <span className="text-xs font-black text-navy uppercase tracking-wider block border-b border-slate-100 pb-2">ऑर्डर का सारांश / ORDER SUMMARY</span>
                      
                      <div className="p-4 bg-navy text-white rounded-xl shadow space-y-2 relative overflow-hidden">
                        <span className="text-[9px] font-bold text-saffron uppercase block">SELECTED PLAN</span>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black">Premium Subscription</span>
                          <span className="text-xs font-black">₹299</span>
                        </div>
                        <span className="text-[8px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded uppercase">MONTHLY</span>
                      </div>

                      <div className="space-y-2 text-xs border-b border-slate-100 pb-4">
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>बेस मूल्य / Base Price</span>
                          <span className="text-navy font-bold">₹299.00</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>डिस्काउंट / Discount</span>
                          <span className="text-tricolorgreen font-bold">-₹0.00</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold">
                          <span>GST (15%)</span>
                          <span className="text-navy font-bold">+₹45.00</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm font-black text-navy">
                        <span>कुल राशि / TOTAL</span>
                        <span>₹344.00</span>
                      </div>

                      <div className="space-y-2.5 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-4">
                        <div className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-tricolorgreen" /> असीमित पात्रता जांच / Unlimited Checks</div>
                        <div className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-tricolorgreen" /> त्वरित सूचनाएं / Instant Notifications</div>
                        <div className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-tricolorgreen" /> प्राथमिकता सहायता / Priority Support</div>
                        <div className="flex items-center"><Check className="w-3.5 h-3.5 mr-1.5 text-tricolorgreen" /> उन्नत फ़िल्टरिंग / Advanced Filtering</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* SCHEME DETAILS (Image 10 Replica) */}
            {activePanel === 'details' && selectedScheme && (
              <div className="flex-1 flex flex-col overflow-hidden text-left bg-white">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[8px] font-black uppercase">
                      <span className="px-2 py-0.5 bg-saffron/10 text-saffron rounded-full">किसान योजना / Farmer Scheme</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">भारत सरकार द्वारा संचालित / Govt of India</span>
                    </div>
                    <h3 className="font-black text-sm text-navy">{selectedScheme.name_hi || selectedScheme.name} / {selectedScheme.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedScheme.ministry}</p>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { setSuccessSchemeName((selectedScheme.name_hi || selectedScheme.name) + ' / ' + selectedScheme.name); setActivePanel('guide'); setAppStep(1); }}
                      className="py-1.5 px-3 bg-saffron hover:bg-saffron-dark text-white font-bold rounded-lg text-[9px] uppercase tracking-wider shadow transition-all cursor-pointer"
                    >
                      अभी आवेदन करें / Apply Now
                    </button>
                    <button onClick={() => setActivePanel('guide')} className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-navy font-bold rounded-lg text-[9px] uppercase tracking-wider shadow-sm transition-all cursor-pointer">
                      मार्गदर्शिका डाउनलोड करें / Guide
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Warning banner */}
                  <div className="p-3 bg-yellow-50 border border-yellow-200 text-saffron text-[10px] font-bold rounded-xl flex items-center space-x-2">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    <span>कट-ऑफ तिथि नज़दीक / Deadline Approaching</span>
                  </div>

                  {/* Highlight stats banner */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">कुल लाभ / Total Benefit</span>
                      <span className="text-sm font-black text-tricolorgreen">{selectedScheme.benefit_amount}</span>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">अंतिम तिथि / Deadline</span>
                      <span className="text-xs font-bold text-navy">31 दिसम्बर 2024</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">योग्यता स्कोर / Match Score</span>
                      <span className="text-xs font-bold text-saffron">{selectedScheme.confidence_score ? (selectedScheme.confidence_score > 1 ? selectedScheme.confidence_score : Math.round(selectedScheme.confidence_score * 100)) : 95}% मैच / Match</span>
                    </div>
                  </div>

                  {/* Bottom tabs list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <span className="text-xs font-black text-navy uppercase tracking-wider block">आवश्यक दस्तावेज / Required Documents</span>
                      <ul className="space-y-2 text-[10px] text-slate-600 font-bold">
                        {selectedScheme.documents_required && selectedScheme.documents_required.length > 0 ? selectedScheme.documents_required.map((doc, idx) => (
                          <li key={idx} className="flex items-center"><Check className="w-4 h-4 mr-2 text-tricolorgreen" /> {doc}</li>
                        )) : (
                          <>
                            <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-tricolorgreen" /> आधार कार्ड / Aadhaar Card</li>
                            <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-tricolorgreen" /> खतौनी / भूमि रिकॉर्ड / Land Records</li>
                          </>
                        )}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <span className="text-xs font-black text-navy uppercase tracking-wider block">पात्रता मापदंड / Eligibility Criteria</span>
                      <ul className="space-y-2 text-[10px] text-slate-600 font-bold">
                        <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-tricolorgreen" /> राज्य / State: {quizState || 'All India'}</li>
                        <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-tricolorgreen" /> पेशा / Occupation: {formOccupation ? formOccupation.charAt(0).toUpperCase() + formOccupation.slice(1) : 'Any'}</li>
                      </ul>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* APPLICATION SUCCESS BANNER */}
            {activePanel === 'success' && (
              <div className="flex-1 flex flex-col overflow-hidden items-center justify-center p-6 bg-white">
                <div className="max-w-2xl w-full text-center space-y-6">
                  
                  {/* Success check badge */}
                  <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-tricolorgreen mx-auto shadow-sm">
                    <Check className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-black text-xl sm:text-2xl text-navy">बधाई हो! आपका आवेदन सफलतापूर्वक जमा हो गया!</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Congratulations! Your application has been successfully submitted!</p>
                  </div>

                  {/* Submission details receipt */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">आवेदन संदर्भ संख्या / REFERENCE NUMBER</span>
                        <span className="text-sm font-black text-navy">{successReferenceId}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-yellow-50 text-saffron border border-yellow-200 text-[8px] font-black uppercase rounded-full">समीक्षा के अधीन / UNDER REVIEW</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">योजना का नाम / SCHEME NAME</span>
                        <span className="text-navy font-bold">{successSchemeName || 'पीएम किसान सम्मान निधि'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">आवेदन की तिथि / APPLICATION DATE</span>
                        <span className="text-navy font-bold">{successDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">प्रोसेसिंग समय / PROCESSING TIME</span>
                        <span className="text-navy font-bold">15-30 दिन / 15-30 days</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActivePanel('tracker')}
                    className="py-3 px-8 bg-gradient-to-r from-navy to-[#0a192f] hover:from-[#112a4f] hover:to-navy text-white text-xs font-bold rounded-lg shadow-lg transform transition hover:scale-105 active:scale-95 uppercase tracking-widest cursor-pointer"
                  >
                    डैशबोर्ड पर वापस जाएं / Back to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS CENTER PANEL */}
            {activePanel === 'notifications' && (
              <div className="flex-1 flex flex-col overflow-hidden text-left bg-white">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-bold text-sm text-navy">आपकी सूचनाएं / Your Notifications</h3>
                  <p className="text-[10px] text-slate-400">आवेदन सीमाओं और कल्याणकारी घोषणाओं के साथ अपडेट रहें / Stay updated</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                  
                  {/* Urgent notification */}
                  <div className="p-4 border border-l-4 border-red-500 border-slate-200 rounded-r-xl shadow-sm bg-red-50/10 space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-red-500">
                      <span>URGENT • TODAY</span>
                      <span>3:45 PM</span>
                    </div>
                    <h4 className="font-bold text-xs text-navy">राष्ट्रीय छात्रवृत्ति - आवेदन की तिथि 2 दिन में समाप्त! / Scholarship deadline closes in 2 days!</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium font-sans">
                      यह योजना आपके प्रोफाइल से 95% मेल खाती है। अपनी पढ़ाई के लिए वित्तीय सहायता प्राप्त करने के लिए अभी आवेदन करें। / This scheme matches 95% with your profile. Apply now.
                    </p>
                    <button 
                      onClick={() => { setSuccessSchemeName('राष्ट्रीय छात्रवृत्ति / National Scholarship'); setActivePanel('guide'); setAppStep(1); }} 
                      className="py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                    >
                      अभी आवेदन करें / Apply Now
                    </button>
                  </div>

                  {/* Important notification */}
                  <div className="p-4 border border-l-4 border-saffron border-slate-200 rounded-r-xl shadow-sm bg-slate-50/40 space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-saffron">
                      <span>APPROVED • YESTERDAY</span>
                      <span>10:15 AM</span>
                    </div>
                    <h4 className="font-bold text-xs text-navy">पीएम किसान सम्मान निधि - आधार आवेदन स्वीकृत! / PM Kisan Aadhaar Approved!</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium font-sans">
                      आपका पीएम किसान आवेदन स्वीकृत हो गया है। आगामी किस्त का विवरण जल्द ही आपके बैंक खाते में जमा किया जाएगा। / Your application has been verified and approved.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* PERSONAL INFORMATION PROFILE SETTINGS MODAL OVERLAY */}
            {activePanel === 'profile' && (
              <div className="fixed inset-0 bg-[#0a192f]/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative text-left space-y-6">
                  
                  {/* Close modal button */}
                  <button 
                    onClick={() => setActivePanel('tracker')} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
                  >
                    ✕
                  </button>

                  <h3 className="font-bold text-sm text-navy uppercase tracking-wider">
                    {language === 'hi' ? 'व्यक्तिगत जानकारी / Personal Information' : 'Personal Information / व्यक्तिगत जानकारी'}
                  </h3>

                  {/* Profile Avatar & Verify Now */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 text-sm overflow-hidden shadow-inner">
                        👤
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-navy leading-none">{profileName}</h4>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                          {language === 'hi' ? 'नागरिक प्रोफाइल / Citizen Profile' : 'Citizen Profile / नागरिक प्रोफाइल'}
                        </span>
                      </div>
                    </div>
                    <button className="px-4 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[10px] tracking-wide uppercase transition-all shadow-sm cursor-pointer">
                      {language === 'hi' ? 'अभी सत्यापित करें / Verify Now' : 'Verify Now / अभी सत्यापित करें'}
                    </button>
                  </div>

                  {/* Form fields identical to screen */}
                  <form onSubmit={(e) => { e.preventDefault(); showToast('Saved successfully! / सफलतापूर्वक सहेजा गया!', 'success'); }} className="space-y-4 text-xs font-semibold">
                    <div>
                      <label className="text-[10px] font-bold text-navy uppercase block mb-1">
                        Name / पूरा नाम
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-navy uppercase block mb-1">
                        Email Address / ईमेल पता
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy pr-10"
                        />
                        {profileEmail && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tricolorgreen text-xs">
                            ✔️
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-navy uppercase block mb-1">
                        Phone Number / मोबाइल नंबर
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy pr-20"
                        />
                        {profilePhone && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#000080] text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-navy uppercase block mb-1">
                          Date of Birth / जन्म तिथि
                        </label>
                        <input
                          type="text"
                          required
                          value={profileDob}
                          onChange={(e) => setProfileDob(e.target.value)}
                          placeholder="DD-MM-YYYY"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-navy uppercase block mb-1">Gender / लिंग</label>
                        <select
                          value={profileGender}
                          onChange={(e) => setProfileGender(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy cursor-pointer"
                        >
                          <option value="Male">Male / पुरुष</option>
                          <option value="Female">Female / महिला</option>
                          <option value="Other">Other / अन्य</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-navy uppercase block mb-1">Address / पता</label>
                      <textarea
                        rows={2}
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-navy font-bold focus:outline-none focus:border-navy resize-none"
                      />
                    </div>
                  </form>

                </div>
              </div>
            )}

            {/* AI CHAT ASSISTANT PANEL */}
            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-bold text-sm text-navy">चैट खोजक / AI Chat Assistant</h3>
                    <p className="text-[10px] text-slate-400">कल्याण योजनाओं की खोज करने के लिए असिस्टेंट के साथ बातचीत करें। / Conversation based welfare search</p>
                  </div>
                  <button onClick={startNewChat} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-saffron transition-all flex items-center text-[10px] font-bold uppercase tracking-wider cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    रीस्टार्ट चैट / Restart
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-6 text-xs leading-relaxed font-sans text-left">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center font-bold text-navy shrink-0">🤖</div>
                        )}
                        <div className={`p-3.5 rounded-2xl max-w-[85%] font-medium ${msg.role === 'user' ? 'bg-saffron/10 text-navy border border-saffron/10 rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-tl-none'}`}>
                          <div className="whitespace-pre-line">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Inputs */}
                <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!chatInput.trim() || isLoading) return;
                      const newMessages = [...messages, { role: 'user', content: chatInput }];
                      setMessages(newMessages);
                      setChatInput('');
                      setIsLoading(true);
                      try {
                        const res = await fetch('/api/chat', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ messages: newMessages })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setMessages(data.messages);
                          if (data.matches && data.matches.length > 0) {
                            setMatchedSchemes(data.matches);
                          }
                        } else {
                          const text = await res.text();
                          try {
                            const err = JSON.parse(text);
                            const errMsg = res.status === 401 
                              ? 'Your session has expired. Please refresh the page or log in again.\n\nआपका सत्र समाप्त हो गया है। कृपया पेज रीफ्रेश करें।'
                              : (err.detail?.error || 'Error connecting to assistant.');
                            setMessages([...newMessages, { role: 'assistant', content: errMsg }]);
                          } catch (parseErr) {
                            setMessages([...newMessages, { role: 'assistant', content: `Server Error (${res.status}): ${text.substring(0, 150)}...` }]);
                          }
                        }
                      } catch (err: any) {
                        setMessages([...newMessages, { role: 'assistant', content: `Connection error: ${err.message || 'Unknown network error'}` }]);
                      } finally {
                        setIsLoading(false);
                      }
                    }} 
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-saffron text-xs font-medium text-navy"
                    />
                    <button type="submit" disabled={isLoading} className="absolute right-2 p-2 bg-saffron hover:bg-saffron-dark text-white rounded-lg transition-all shadow-sm disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* WELFARE IMPACT EVIDENCE BOARD */}
            {activePanel === 'impact' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white text-left">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-bold text-sm text-navy">प्रभाव साक्ष्य बोर्ड / Welfare Impact Board</h3>
                  <p className="text-[10px] text-slate-400">Live evidence data tracked for the XPRIZE Money Category.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="p-5 bg-gradient-to-r from-navy to-navy-light text-white rounded-xl shadow space-y-3 shrink-0">
                    <h4 className="font-bold text-base text-saffron">XPRIZE Submission Summary</h4>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      This bot logs benefit discovery events async. This data proves the software drives real financial accessibility outcomes.
                    </p>
                  </div>

                  {isImpactLoading ? (
                    <div className="text-slate-400 text-xs flex items-center justify-center py-10">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-saffron" />
                      Calculating impact evidence metrics...
                    </div>
                  ) : richStats ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
                          <span className="text-2xl font-black text-navy">
                            {richStats.evidence?.agent_logs?.unique_matched_sessions || 0}
                          </span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Qualified Households</p>
                        </div>

                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
                          <span className="text-2xl font-black text-tricolorgreen">
                            ₹{richStats.evidence?.impact_log?.total_benefit_value_inr?.toLocaleString('en-IN') || 0}
                          </span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Welfare Capital Surfaced</p>
                        </div>

                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
                          <span className="text-2xl font-black text-saffron">
                            {richStats.evidence?.customer_log?.testimonials_collected || 0}
                          </span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Success Testimonials</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

          </section>

          {/* Right Panel */}
          {activePanel === 'chat' && (
            <section className="w-full md:w-[380px] bg-slate-50 border-t md:border-t-0 border-slate-100 flex flex-col overflow-hidden shrink-0">
              <div className="px-5 py-4 border-b border-slate-100 bg-white shrink-0 text-left">
                <h3 className="font-bold text-sm text-navy flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-saffron" />
                  योग्य योजनाएं / Matched Schemes ({matchedSchemes.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {matchedSchemes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-5">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-navy text-xs">No Matches Yet</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Provide your details in the chat window. Matched programs will appear here instantly.
                    </p>
                  </div>
                ) : (
                  matchedSchemes.map((scheme, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setSelectedScheme(scheme); setActivePanel('details'); }}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center group border-l-4 border-l-saffron text-left"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-navy group-hover:text-saffron transition-colors">
                          {scheme.name_hi || scheme.name} / {scheme.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{scheme.ministry}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-saffron transition-transform group-hover:translate-x-1" />
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* Paywall Payment Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onPaymentSuccess={handleUpgradeSuccess}
      />
    </div>
  );
}
