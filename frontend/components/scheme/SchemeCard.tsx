'use client';

import React, { useState } from 'react';
import { ExternalLink, Calendar, CheckSquare, Clock, Award, CheckCircle2, XCircle, ChevronDown, ListTodo } from 'lucide-react';

export interface Scheme {
  scheme_id: string;
  name: string;
  name_hi?: string;
  ministry: string;
  benefit_amount: string;
  documents_required: string[];
  application_url: string;
  annual_value: number;
  confidence_score: number;
  status?: string;
  deadline?: string;
}

interface SchemeCardProps {
  scheme: Scheme;
  initialStatus?: string;
  initialDeadline?: string;
  onStatusChange?: (schemeId: string, status: string) => void;
  onDeadlineChange?: (schemeId: string, deadline: string) => void;
}

export default function SchemeCard({
  scheme,
  initialStatus = 'not_started',
  initialDeadline = '',
  onStatusChange,
  onDeadlineChange,
}: SchemeCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [deadline, setDeadline] = useState(initialDeadline);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingDeadline, setIsUpdatingDeadline] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/tracker/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme_id: scheme.scheme_id,
          status: newStatus,
          notes: 'Status updated from web dashboard card',
        }),
      });

      if (res.ok) {
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(scheme.scheme_id, newStatus);
        }
      }
    } catch (err) {
      console.error('Failed to update tracking status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeadlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDeadline(true);
    try {
      const res = await fetch('/api/reminders/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme_id: scheme.scheme_id,
          deadline: deadline || null,
        }),
      });

      if (res.ok) {
        setShowReminderForm(false);
        if (onDeadlineChange) {
          onDeadlineChange(scheme.scheme_id, deadline);
        }
      }
    } catch (err) {
      console.error('Failed to set scheme deadline reminder:', err);
    } finally {
      setIsUpdatingDeadline(false);
    }
  };

  // Status styling helpers
  const getStatusBadge = (currentStatus: string) => {
    switch (currentStatus) {
      case 'documents_collected':
        return { text: 'Docs Gathering', bg: 'bg-blue-50 text-blue-700 border-blue-150', icon: ListTodo };
      case 'applied':
        return { text: 'Applied', bg: 'bg-yellow-50 text-yellow-750 border-yellow-150', icon: Clock };
      case 'approved':
        return { text: 'Approved', bg: 'bg-green-50 text-tricolorgreen border-green-150', icon: CheckCircle2 };
      case 'rejected':
        return { text: 'Rejected', bg: 'bg-red-50 text-red-700 border-red-150', icon: XCircle };
      default:
        return { text: 'Not Started', bg: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock };
    }
  };

  const badge = getStatusBadge(status);
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-white border border-slate-100 border-l-4 border-l-saffron p-5 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col space-y-4">
      {/* Header and Match Confidence */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
            {scheme.ministry || 'Ministry of Welfare'}
          </p>
          <h4 className="font-bold text-base text-navy leading-snug">{scheme.name}</h4>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-saffron/10 text-saffron border border-saffron/20 flex items-center">
          <Award className="w-3.5 h-3.5 mr-1" />
          {Math.round(scheme.confidence_score * 10)}% Fit
        </span>
      </div>

      {/* Benefit Amount */}
      <div className="bg-slate-50 px-4 py-3 rounded-lg flex items-center justify-between">
        <span className="text-xs text-navy/70 font-semibold">Discovery Benefit / लाभ</span>
        <span className="font-extrabold text-sm text-tricolorgreen">
          {scheme.benefit_amount}
        </span>
      </div>

      {/* Required Documents */}
      {scheme.documents_required && scheme.documents_required.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-navy uppercase tracking-wider block">
            Required Documents / जरूरी कागजात
          </span>
          <div className="flex flex-wrap gap-1.5">
            {scheme.documents_required.map((doc, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
              >
                {doc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions and Status Updates */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tracker Status Selector */}
        <div className="relative inline-block text-left">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 font-medium">Progress:</span>
            <div className="relative">
              <select
                disabled={isUpdatingStatus}
                value={status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-1 rounded-lg border text-[11px] font-bold cursor-pointer focus:outline-none transition-all ${badge.bg}`}
              >
                <option value="not_started">Not Started</option>
                <option value="documents_collected">Docs Gathering</option>
                <option value="applied">Applied</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
            </div>
          </div>
        </div>

        {/* Set Reminder Button */}
        <div>
          <button
            onClick={() => setShowReminderForm(!showReminderForm)}
            className="inline-flex items-center text-slate-400 hover:text-saffron transition-colors font-medium"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {deadline ? `Reminder: ${deadline}` : 'Track Deadline'}
          </button>
        </div>

        {/* Apply CTA Link */}
        <div>
          <a
            href={scheme.application_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-3.5 py-1.5 font-bold text-white bg-navy hover:bg-navy-light rounded-lg shadow-sm transition-all"
          >
            Apply Portal
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>
      </div>

      {/* Dropdown Reminder Form */}
      {showReminderForm && (
        <form onSubmit={handleDeadlineSubmit} className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-navy uppercase block">Application Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-saffron"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowReminderForm(false)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingDeadline}
              className="px-2.5 py-1 bg-saffron text-white rounded text-[10px] font-bold disabled:opacity-50"
            >
              {isUpdatingDeadline ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
