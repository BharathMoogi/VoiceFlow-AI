"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Sparkles,
  PhoneCall,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  PhoneOff,
  Megaphone,
  AlertCircle,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/Card";
import { getCallLogs, getCampaigns, type CallLog, type Campaign } from "@/lib/api";

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [logsData, campaignsData] = await Promise.all([getCallLogs(), getCampaigns()]);
      setLogs(logsData);
      setCampaigns(campaignsData);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  // ── Computations ─────────────────────────────────────────────
  const totalCalls = logs.length;
  const totalDurationSeconds = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const avgDuration = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
  const completedCalls = logs.filter(l => l.status === "completed").length;
  const callingCalls = logs.filter(l => l.status === "calling" || l.status === "pending").length;
  const busyCalls = logs.filter(l => l.status === "busy").length;
  const noAnswerCalls = logs.filter(l => l.status === "no-answer").length;
  const failedCalls = logs.filter(l => l.status === "failed").length;
  const finishedCalls = completedCalls + busyCalls + noAnswerCalls + failedCalls;
  const successRate = finishedCalls > 0 ? Math.round((completedCalls / finishedCalls) * 100) : 0;
  const getPercentage = (count: number) => totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;

  const campaignStats = campaigns.map(camp => {
    const campLogs = logs.filter(l => l.campaign_id === camp.id);
    const total = campLogs.length;
    const completed = campLogs.filter(l => l.status === "completed").length;
    return { name: camp.name, total, completed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }).filter(c => c.total > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-t-2 border-blue-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Assembling analytics</p>
            <p className="text-xs text-gray-600 mt-1">Crunching your call data…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Unable to load analytics</p>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Dialed Calls",
      value: totalCalls.toLocaleString(),
      desc: `${callingCalls} in progress`,
      icon: PhoneCall,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      glow: "purple" as const,
      bar: "#8B5CF6",
      pct: Math.min(totalCalls * 5, 100),
    },
    {
      label: "Call Uptime",
      value: formatDuration(totalDurationSeconds),
      desc: "Total connected time",
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      glow: "blue" as const,
      bar: "#3B82F6",
      pct: 68,
    },
    {
      label: "AI Conversion Rate",
      value: `${successRate}%`,
      desc: "Completed call ratio",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      glow: "green" as const,
      bar: "#22C55E",
      pct: successRate,
    },
    {
      label: "Avg Call Duration",
      value: `${avgDuration}s`,
      desc: "Per conversation",
      icon: Activity,
      color: "text-pink-400",
      bg: "bg-pink-500/10 border-pink-500/20",
      glow: "purple" as const,
      bar: "#EC4899",
      pct: Math.min(avgDuration, 100),
    },
  ];

  const outcomes = [
    { label: "Completed conversations", count: completedCalls, icon: CheckCircle, color: "text-emerald-400", bar: "bg-emerald-500", pct: getPercentage(completedCalls) },
    { label: "Line busy / Unavailable",  count: busyCalls,     icon: PhoneOff,    color: "text-amber-400",   bar: "bg-amber-500",   pct: getPercentage(busyCalls) },
    { label: "No answer / Voicemail",    count: noAnswerCalls, icon: PhoneOff,    color: "text-gray-500",    bar: "bg-gray-500",    pct: getPercentage(noAnswerCalls) },
    { label: "Call failed / Network",    count: failedCalls,   icon: XCircle,     color: "text-rose-400",    bar: "bg-rose-500",    pct: getPercentage(failedCalls) },
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.13] via-violet-600/[0.06] to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="relative px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-400">Analytics</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Performance Insights</h1>
            <p className="text-sm text-gray-500 mt-1">
              Voice campaign outcomes, AI call summaries, and delivery metrics.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">Live data</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "80ms" }}>
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hoverEffect glow={stat.glow} className="!p-5 group" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl border ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <ArrowUpRight className="h-3 w-3 text-gray-600" />
                  <span className="text-[10px] text-gray-600 font-medium">All time</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1">{stat.value}</p>
              <p className="text-[11px] text-gray-600 mb-4">{stat.desc}</p>
              <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${stat.pct}%`, background: `linear-gradient(90deg, transparent, ${stat.bar})` }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Breakdown Panel ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-slide-up" style={{ animationDelay: "160ms" }}>

        {/* Outcome Breakdown */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <CardTitle className="text-[14px] mb-0.5">Call Outcomes Breakdown</CardTitle>
              <CardDescription className="text-[12px]">
                Distribution by call connection outcome
              </CardDescription>
            </div>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <PhoneCall className="h-4 w-4 text-violet-400" />
            </div>
          </div>

          {totalCalls === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <PhoneCall className="h-5 w-5 text-gray-700" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No calls dialed yet</p>
              <p className="text-xs text-gray-700 mt-1">Outbound call outcomes will appear here</p>
            </div>
          ) : (
            <div className="space-y-5">
              {outcomes.map((o) => {
                const Icon = o.icon;
                return (
                  <div key={o.label} className="space-y-2 group">
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-2 text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors`}>
                        <Icon className={`h-3.5 w-3.5 ${o.color}`} />
                        {o.label}
                      </span>
                      <span className="text-[12px] font-bold text-gray-400">
                        {o.count} <span className="text-gray-700 font-normal">({o.pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={`h-full rounded-full ${o.bar} transition-all duration-700`}
                        style={{ width: `${o.pct}%`, opacity: 0.85 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <CardTitle className="text-[14px] mb-0.5 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-violet-400" />
                Campaign Performance
              </CardTitle>
              <CardDescription className="text-[12px]">Success ratios by campaign</CardDescription>
            </div>
          </div>

          {campaignStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <Megaphone className="h-5 w-5 text-gray-700" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No campaign data yet</p>
              <p className="text-xs text-gray-700 mt-1">Launch a campaign to see stats here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {campaignStats.map((camp, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-2 group">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-semibold text-gray-300 truncate max-w-[140px] group-hover:text-white transition-colors">
                      {camp.name}
                    </span>
                    <span className="text-[13px] font-extrabold text-violet-400">{camp.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-700">
                    <span>Total: {camp.total} calls</span>
                    <span>Connected: {camp.completed}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-700"
                      style={{ width: `${camp.successRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
