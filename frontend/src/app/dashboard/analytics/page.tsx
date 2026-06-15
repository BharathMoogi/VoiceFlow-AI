"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Loader2, 
  AlertCircle, 
  PhoneCall, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  PhoneOff,
  UserCheck,
  Megaphone
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/Card";
import { getCallLogs, getCampaigns, type CallLog, type Campaign } from "@/lib/api";

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [logsData, campaignsData] = await Promise.all([
        getCallLogs(),
        getCampaigns()
      ]);
      setLogs(logsData);
      setCampaigns(campaignsData);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  // ── Computations ──────────────────────────────────────────────
  const totalCalls = logs.length;
  
  // Total duration in seconds
  const totalDurationSeconds = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // Average duration
  const avgDuration = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
  
  // Call status breakdown
  const completedCalls = logs.filter(l => l.status === 'completed').length;
  const callingCalls = logs.filter(l => l.status === 'calling' || l.status === 'pending').length;
  const busyCalls = logs.filter(l => l.status === 'busy').length;
  const noAnswerCalls = logs.filter(l => l.status === 'no-answer').length;
  const failedCalls = logs.filter(l => l.status === 'failed').length;

  // Success rate: completed calls out of total finished calls
  const finishedCalls = completedCalls + busyCalls + noAnswerCalls + failedCalls;
  const successRate = finishedCalls > 0 ? Math.round((completedCalls / finishedCalls) * 100) : 0;

  // Outcome percentages
  const getPercentage = (count: number) => {
    return totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
  };

  // Campaign breakdown
  const campaignStats = campaigns.map(camp => {
    const campLogs = logs.filter(l => l.campaign_id === camp.id);
    const total = campLogs.length;
    const completed = campLogs.filter(l => l.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      name: camp.name,
      total,
      completed,
      successRate: rate
    };
  }).filter(c => c.total > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-zinc-400">Assembling analytics dashboards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full !p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Unable to load analytics</p>
              <p className="text-xs text-zinc-500">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Dialed Calls",
      value: totalCalls.toLocaleString(),
      desc: `${callingCalls} calls in progress`,
      icon: PhoneCall,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      label: "Call Uptime Duration",
      value: formatDuration(totalDurationSeconds),
      desc: "Total connected session time",
      icon: Clock,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20"
    },
    {
      label: "AI Conversion Rate",
      value: `${successRate}%`,
      desc: "Total completed call ratio",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      label: "Average Call Duration",
      value: `${avgDuration}s`,
      desc: "Average time per conversation",
      icon: Clock,
      color: "text-pink-400",
      bg: "bg-pink-500/10 border-pink-500/20"
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-400" />
          Analytics Dashboard
        </h1>
        <p className="text-zinc-400 text-sm">
          A summary of voice campaign outcome logs, AI call summaries, and delivery metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hoverEffect className="!p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.desc}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Breakdown Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Outcome Ratios (3 Cols Width) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Call Outcomes Breakdown
            </CardTitle>
            <CardDescription>
              Percentage distribution of call logs by call reasons or connection outcomes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {totalCalls === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No calls dialed yet. Outbound call outcomes will show here.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Completed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Completed conversations
                    </span>
                    <span>{completedCalls} calls ({getPercentage(completedCalls)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${getPercentage(completedCalls)}%` }}
                    />
                  </div>
                </div>

                {/* Busy */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <PhoneOff className="h-4 w-4 text-amber-400" />
                      Line Busy / Unavailable
                    </span>
                    <span>{busyCalls} calls ({getPercentage(busyCalls)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded bg-amber-500 transition-all duration-500" 
                      style={{ width: `${getPercentage(busyCalls)}%` }}
                    />
                  </div>
                </div>

                {/* No Answer */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <PhoneOff className="h-4 w-4 text-zinc-500" />
                      No Answer / Voice mail
                    </span>
                    <span>{noAnswerCalls} calls ({getPercentage(noAnswerCalls)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded bg-zinc-500 transition-all duration-500" 
                      style={{ width: `${getPercentage(noAnswerCalls)}%` }}
                    />
                  </div>
                </div>

                {/* Failed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-500" />
                      Call Failed / Network error
                    </span>
                    <span>{failedCalls} calls ({getPercentage(failedCalls)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full rounded bg-rose-500 transition-all duration-500" 
                      style={{ width: `${getPercentage(failedCalls)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Metrics (2 Cols Width) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-indigo-400" />
              Campaign Performance
            </CardTitle>
            <CardDescription>
              Success ratios by outbound campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignStats.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs italic">
                No calls initiated under campaigns yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {campaignStats.map((camp, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-zinc-850 bg-zinc-950/40 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-white">
                      <span className="truncate max-w-[150px]">{camp.name}</span>
                      <span className="text-indigo-400 font-bold">{camp.successRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Total calls: {camp.total}</span>
                      <span>Connected: {camp.completed}</span>
                    </div>
                    <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full rounded bg-indigo-500" 
                        style={{ width: `${camp.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
