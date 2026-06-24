"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Mail,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Zap,
  Loader2,
  AlertCircle,
  Users,
  PhoneCall,
  Megaphone,
  Sparkles,
  Activity,
  BarChart3,
  ArrowUpRight,
  Wand2,
  Bot,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import {
  getDashboardStats,
  type DashboardStats,
  isLoggedIn,
  saveUserInfo,
} from "@/lib/api";

/* ── Activity icon/color config ──────────────────────────── */
const activityConfig: Record<string, { icon: typeof Mic; color: string; bg: string }> = {
  email_sent:    { icon: CheckCircle,   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  draft:         { icon: Mail,          color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  transcription: { icon: Mic,           color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  conversation:  { icon: MessageSquare, color: "text-gray-400",    bg: "bg-gray-500/10 border-gray-500/20" },
};

/* ── Quick Actions ────────────────────────────────────────── */
const quickActions = [
  {
    label: "Record & Transcribe",
    desc:  "Upload or record voice to generate email",
    href:  "/dashboard/voice-upload",
    icon:  Mic,
    gradient: "from-violet-600 to-purple-700",
    glow:     "rgba(139,92,246,0.4)",
    badge:    "Popular",
  },
  {
    label: "Generate Email",
    desc:  "Describe your email, let AI write it",
    href:  "/dashboard/email-generator",
    icon:  Wand2,
    gradient: "from-blue-600 to-cyan-600",
    glow:     "rgba(59,130,246,0.4)",
    badge:    "AI-Powered",
  },
  {
    label: "View Conversations",
    desc:  "Browse all AI conversations",
    href:  "/dashboard/conversations",
    icon:  MessageSquare,
    gradient: "from-emerald-600 to-teal-600",
    glow:     "rgba(34,197,94,0.35)",
    badge:    null,
  },
  {
    label: "Outbound AI Calls",
    desc:  "AI agents call your contacts automatically. You define the persona, script, and voice — the AI does the talking.",
    href:  "/dashboard/campaigns",
    icon:  Bot,
    gradient: "from-orange-600 to-rose-600",
    glow:     "rgba(249,115,22,0.35)",
    badge:    "Voice",
  },
];

/* ── AI Insights (static demo) ────────────────────────────── */
const aiInsights = [
  { text: "Best call window: 2 PM – 4 PM on Tuesdays", icon: Clock,     color: "text-violet-400" },
  { text: "Email open rate is 38% above industry avg",  icon: TrendingUp, color: "text-emerald-400" },
  { text: "3 campaigns ready for review",               icon: Activity,   color: "text-blue-400" },
];

/* ── Stat card config ─────────────────────────────────────── */
function buildStatCards(stats: DashboardStats["stats"]) {
  return [
    {
      label:   "Contacts Directory",
      value:   stats.transcriptions.toLocaleString(),
      change:  stats.transcriptions_change,
      icon:    Users,
      color:   "text-violet-400",
      bgIcon:  "bg-violet-500/10 border-violet-500/20",
      glow:    "purple" as const,
      trend:   "up",
      sparkColor: "#8B5CF6",
    },
    {
      label:   "Active Campaigns",
      value:   stats.emails_sent.toLocaleString(),
      change:  stats.emails_sent_change,
      icon:    Megaphone,
      color:   "text-blue-400",
      bgIcon:  "bg-blue-500/10 border-blue-500/20",
      glow:    "blue" as const,
      trend:   "up",
      sparkColor: "#3B82F6",
    },
    {
      label:   "Dialed Calls",
      value:   stats.conversations.toLocaleString(),
      change:  stats.conversations_change,
      icon:    PhoneCall,
      color:   "text-cyan-400",
      bgIcon:  "bg-cyan-500/10 border-cyan-500/20",
      glow:    "blue" as const,
      trend:   "up",
      sparkColor: "#06B6D4",
    },
    {
      label:   "Call Success Rate",
      value:   `${stats.success_rate}%`,
      change:  stats.success_rate_label,
      icon:    TrendingUp,
      color:   "text-emerald-400",
      bgIcon:  "bg-emerald-500/10 border-emerald-500/20",
      glow:    "green" as const,
      trend:   "up",
      sparkColor: "#22C55E",
    },
  ];
}

/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router  = useRouter();
  const [data,    setData]    = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    getDashboardStats()
      .then((result) => {
        setData(result);
        if (result.user?.name) saveUserInfo(result.user.name);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats:", err);
        setError(err.message || "Failed to load dashboard data.");
        setLoading(false);
      });
  }, [router]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-5">
          {/* Animated spinner ring */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-t-2 border-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Loading your workspace</p>
            <p className="text-xs text-gray-600 mt-1">Fetching AI insights…</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Unable to load dashboard</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setError(null);
              getDashboardStats()
                .then((r) => { setData(r); setLoading(false); })
                .catch((e) => { setError(e.message); setLoading(false); });
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recent_activity, user } = data;
  const statCards = buildStatCards(stats);

  return (
    <div className="space-y-7 max-w-7xl mx-auto animate-fade-in">

      {/* ── Hero Welcome Banner ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] animate-slide-up"
           style={{ animationDelay: "0ms" }}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.15] via-blue-600/[0.07] to-transparent" />
        {/* Decorative orbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        {/* Noise overlay */}
        <div className="noise-overlay absolute inset-0 pointer-events-none" />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-400">
                Welcome back
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1.5">
              {getGreeting()},{" "}
              <span className="gradient-text-hero">{user.name}</span> 👋
            </h1>
            <p className="text-sm text-gray-500 max-w-lg">
              {user.draft_count > 0 ? (
                <>
                  You have{" "}
                  <span className="text-violet-400 font-semibold">
                    {user.draft_count} email draft{user.draft_count !== 1 ? "s" : ""}
                  </span>{" "}
                  ready to send. Your AI agents are standing by.
                </>
              ) : (
                "Your AI workspace is ready. Start by recording a voice memo or launching a campaign."
              )}
            </p>
          </div>

          {/* Live Waveform Visualizer & CTA */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Live Waveform Visualizer */}
            <div className="hidden lg:flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5 shadow-inner">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mr-1">Voice Engine State</span>
              <div className="flex items-end gap-0.5 h-7">
                <div className="wave-bar" style={{ animationDuration: "1.0s", backgroundColor: "#8B5CF6" }} />
                <div className="wave-bar" style={{ animationDuration: "1.4s", backgroundColor: "#A78BFA" }} />
                <div className="wave-bar" style={{ animationDuration: "0.8s", backgroundColor: "#60A5FA" }} />
                <div className="wave-bar" style={{ animationDuration: "1.2s", backgroundColor: "#3B82F6" }} />
                <div className="wave-bar" style={{ animationDuration: "1.5s", backgroundColor: "#22C55E" }} />
                <div className="wave-bar" style={{ animationDuration: "0.9s", backgroundColor: "#34D399" }} />
                <div className="wave-bar" style={{ animationDuration: "1.3s", backgroundColor: "#A78BFA" }} />
                <div className="wave-bar" style={{ animationDuration: "1.1s", backgroundColor: "#8B5CF6" }} />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/dashboard/voice-upload">
                <Button variant="primary" size="md" leftIcon={<Mic className="h-3.5 w-3.5" />}>
                  Record Voice
                </Button>
              </Link>
              <Link href="/dashboard/email-generator">
                <Button variant="outline" size="md" leftIcon={<Wand2 className="h-3.5 w-3.5" />}>
                  Generate Email
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Insight Strip ────────────────────────────────── */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 animate-slide-up"
           style={{ animationDelay: "60ms" }}>
        {aiInsights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass-card border shrink-0 min-w-0"
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${ins.color}`} />
              <p className="text-[12px] text-gray-400 whitespace-nowrap">{ins.text}</p>
            </div>
          );
        })}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.08] shrink-0 cursor-pointer hover:border-violet-500/30 hover:bg-violet-500/[0.04] transition-all duration-200 group">
          <Sparkles className="h-3.5 w-3.5 text-violet-500 group-hover:text-violet-400 flex-shrink-0" />
          <p className="text-[12px] text-gray-600 group-hover:text-gray-400 whitespace-nowrap">
            View all AI insights
          </p>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up"
           style={{ animationDelay: "120ms" }}>
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              hoverEffect
              glow={stat.glow}
              className="!p-5 group"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl border ${stat.bgIcon} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400">Live</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 font-medium mb-1 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-3xl font-extrabold text-white tracking-tight leading-none mb-2">
                  {stat.value}
                </p>
                <p className="text-[11px] text-gray-600">{stat.change}</p>
              </div>
              {/* Mini sparkline bar */}
              <div className="mt-4 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: "72%",
                    background: `linear-gradient(90deg, transparent, ${stat.sparkColor})`,
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Quick Actions + Recent Activity ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 animate-slide-up"
           style={{ animationDelay: "240ms" }}>

        {/* Quick Actions (left) */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-[13px] font-bold text-white tracking-tight">Quick Actions</h2>
            <span className="text-[11px] text-gray-600">AI-powered</span>
          </div>

          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                id={`quick-${action.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div
                  className="group relative flex items-center gap-4 p-4 rounded-2xl border border-white/[0.05] bg-[#1F2937]/40 hover:bg-[#1F2937]/70 hover:border-white/[0.10] transition-all duration-250 cursor-pointer overflow-hidden"
                  style={{
                    ["--hover-glow" as string]: action.glow,
                  }}
                >
                  {/* Hover glow backdrop */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{
                      background: `radial-gradient(circle at 30% 50%, ${action.glow.replace("0.4", "0.06")}, transparent 70%)`,
                    }}
                  />

                  {/* Icon */}
                  <div
                    className={`relative flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:scale-105 transition-transform duration-200`}
                    style={{ boxShadow: `0 4px 16px ${action.glow}` }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-white">{action.label}</p>
                      {action.badge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-violet-500/15 text-violet-400 border border-violet-500/20">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-600 truncate group-hover:text-gray-400 transition-colors">
                      {action.desc}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 relative" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity (right) */}
        <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <CardTitle className="text-[14px]">Recent Activity</CardTitle>
              <CardDescription className="mt-0.5 text-[12px]">
                Your latest AI actions and events
              </CardDescription>
            </div>
            <Link href="/dashboard/conversations">
              <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="h-3 w-3" />}>
                View all
              </Button>
            </Link>
          </div>

          {/* Activity list */}
          <div className="divide-y divide-white/[0.04]">
            {recent_activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                  <BarChart3 className="h-5 w-5 text-gray-700" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No activity yet</p>
                <p className="text-xs text-gray-700 mt-1">
                  Your AI actions will appear here
                </p>
              </div>
            ) : (
              recent_activity.map((item, idx) => {
                const cfg = activityConfig[item.type] || {
                  icon: CheckCircle,
                  color: "text-gray-500",
                  bg: "bg-gray-500/10 border-gray-500/20",
                };
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="group flex items-start gap-3.5 px-5 py-4 hover:bg-white/[0.02] transition-colors duration-150 animate-slide-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {/* Icon badge */}
                    <div
                      className={`flex-shrink-0 mt-0.5 p-2 rounded-xl border ${cfg.bg}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-gray-600 truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[11px] text-gray-700 group-hover:text-gray-500 transition-colors">
                        {item.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {recent_activity.length > 0 && (
            <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-center">
              <Link href="/dashboard/conversations">
                <p className="text-[12px] text-gray-700 hover:text-violet-400 transition-colors font-medium cursor-pointer">
                  View full history →
                </p>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Info Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up"
           style={{ animationDelay: "360ms" }}>
        {/* AI Model card */}
        <Card className="!p-4" hoverEffect glow="purple">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Bot className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">AI Engine</p>
              <p className="text-[11px] text-gray-600">Active model</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold gradient-text-purple">GPT-4o</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              Online
            </span>
          </div>
        </Card>

        {/* Usage card */}
        <Card className="!p-4" hoverEffect glow="blue">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">API Credits</p>
              <p className="text-[11px] text-gray-600">This billing cycle</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500">Used</span>
              <span className="text-blue-400 font-semibold">4,200 / 10,000</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-1000"
                style={{ width: "42%" }}
              />
            </div>
          </div>
        </Card>

        {/* Voice Agent card */}
        <Card className="!p-4" hoverEffect glow="green">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">Voice Agent</p>
              <p className="text-[11px] text-gray-600">Call performance</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-extrabold text-white">
              {stats.success_rate}
              <span className="text-lg text-emerald-400">%</span>
            </span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-semibold">Success rate</span>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
