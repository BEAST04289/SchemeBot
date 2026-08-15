'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, BarChart3, Users, IndianRupee, Bot, TrendingUp, ExternalLink, Landmark } from 'lucide-react';

interface Stats {
  headline: string;
  unique_sessions: number;
  total_benefit_value_inr: number;
  agent_decisions_logged: number;
  paying_customers: number;
  xprize_category: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0a192f] text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-saffron/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-saffron" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Sarthi Kalyan — Evidence Dashboard</h1>
              <p className="text-xs text-slate-400">XPRIZE Build with Gemini 2026 — Money & Financial Access</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/" className="text-xs text-saffron hover:text-white transition-colors font-medium">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Headline Banner */}
        {stats && (
          <div className="bg-gradient-to-r from-[#0a192f] to-[#1a365d] rounded-2xl p-8 text-white shadow-lg">
            <p className="text-saffron text-xs font-bold uppercase tracking-wider mb-2">XPRIZE Submission Headline</p>
            <h2 className="text-2xl font-bold leading-relaxed">{stats.headline}</h2>
            <p className="text-slate-400 text-xs mt-2">Category: {stats.xprize_category} | Last updated: {new Date(stats.timestamp).toLocaleString()}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            {error} — Is the backend running on port 8000?
          </div>
        )}

        {/* Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Families Helped</span>
              </div>
              <div className="text-3xl font-black text-navy">{stats.unique_sessions}</div>
              <p className="text-[10px] text-slate-400">Unique sessions with scheme matches</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <IndianRupee className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Welfare Discovered</span>
              </div>
              <div className="text-3xl font-black text-tricolorgreen">
                {'\u20B9'}{stats.total_benefit_value_inr.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-400">Total potential benefits surfaced</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Bot className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Decisions</span>
              </div>
              <div className="text-3xl font-black text-navy">{stats.agent_decisions_logged}</div>
              <p className="text-[10px] text-slate-400">Gemini-powered eligibility decisions</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Paying Customers</span>
              </div>
              <div className="text-3xl font-black text-saffron">{stats.paying_customers}</div>
              <p className="text-[10px] text-slate-400">Revenue-generating users</p>
            </div>
          </div>
        )}

        {/* Architecture Evidence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI-Native Operations Evidence */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-navy flex items-center">
              <Bot className="w-4 h-4 mr-2 text-saffron" />
              AI-Native Operations
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-navy block mb-1">LangGraph Eligibility Agent</span>
                <p>Every eligibility decision is made by Gemini 2.5 Flash through a 3-node pipeline: Intake, Match, Explain. Zero human intervention.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-navy block mb-1">Dual-Channel AI</span>
                <p>The same AI agent serves both the web dashboard and WhatsApp bot. One brain, two interfaces.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-navy block mb-1">Continuous Evidence Logging</span>
                <p>Every agent decision is logged with timestamps to JSONL (dev) or BigQuery (prod). This page reads those logs in real-time.</p>
              </div>
            </div>
          </div>

          {/* Google Cloud Usage */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-navy flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-saffron" />
              Google Cloud Products Used
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-bold text-navy block mb-1">Gemini 2.5 Flash</span>
                <p>Core AI model for profile extraction, scheme matching, bilingual explanation, follow-up conversation.</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-bold text-navy block mb-1">text-embedding-004</span>
                <p>Scheme and query embeddings for vector similarity search (ChromaDB RAG pipeline).</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-bold text-navy block mb-1">Cloud Run</span>
                <p>Backend hosting with auto-scaling, asia-south1 region for India-first latency.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-navy mb-4">Quick Links for Judges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <a href="/health" target="_blank" className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-saffron transition-colors flex items-center justify-between">
              <span className="font-bold text-navy">Health Check</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a href="/stats" target="_blank" className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-saffron transition-colors flex items-center justify-between">
              <span className="font-bold text-navy">Raw Stats JSON</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a href="/docs" target="_blank" className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-saffron transition-colors flex items-center justify-between">
              <span className="font-bold text-navy">API Documentation</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4">
          Sarthi Kalyan &copy; {new Date().getFullYear()} — XPRIZE Build with Gemini 2026
        </div>
      </div>
    </div>
  );
}
