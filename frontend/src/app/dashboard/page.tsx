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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { getDashboardStats, type DashboardStats, isLoggedIn, saveUserInfo } from "@/lib/api";

// Icon + color mapping for activity types
const activityConfig: Record<string, { icon: typeof Mic; color: string }> = {
  email_sent: { icon: CheckCircle, color: "text-emerald-400" },
  draft: { icon: Mail, color: "text-violet-400" },
  transcription: { icon: Mic, color: "text-indigo-400" },
  conversation: { icon: MessageSquare, color: "text-amber-400" },
};

const quickActions = [
  {
    label: "Record & Transcribe",
    desc: "Upload or record voice to generate email",
    href: "/dashboard/voice-upload",
    icon: Mic,
    gradient: "from-indigo-600 to-violet-600",
  },
  {
    label: "Generate Email",
    desc: "Describe your email, let AI write it",
    href: "/dashboard/email-generator",
    icon: Zap,
    gradient: "from-violet-600 to-pink-600",
  },
  {
    label: "View Conversations",
    desc: "Browse all AI conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
    gradient: "from-emerald-600 to-teal-600",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      // No token at all → go straight to login
      router.replace("/login");
      return;
    }

    getDashboardStats()
      .then((result) => {
        setData(result);
        // Cache user name for the sidebar
        if (result.user?.name) {
          saveUserInfo(result.user.name);
        }
        setLoading(false);
      })
      .catch((err) => {
        // apiFetch auto-redirects on 401, so if we reach here it's a non-auth error
        console.error("Failed to load dashboard stats:", err);
        setError(err.message || "Failed to load dashboard data.");
        setLoading(false);
      });
  }, [router]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full !p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Unable to load dashboard</p>
              <p className="text-xs text-zinc-500">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                setError(null);
                getDashboardStats()
                  .then((result) => { setData(result); setLoading(false); })
                  .catch((err) => { setError(err.message); setLoading(false); });
              }}
            >
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recent_activity, user } = data;

  const statCards = [
    {
      label: "Transcriptions",
      value: stats.transcriptions.toLocaleString(),
      change: stats.transcriptions_change,
      icon: Mic,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Emails Sent",
      value: stats.emails_sent.toLocaleString(),
      change: stats.emails_sent_change,
      icon: Mail,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Conversations",
      value: stats.conversations.toLocaleString(),
      change: stats.conversations_change,
      icon: MessageSquare,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Success Rate",
      value: `${stats.success_rate}%`,
      change: stats.success_rate_label,
      icon: TrendingUp,
      color: "text-pink-400",
      bg: "bg-pink-500/10 border-pink-500/20",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-transparent p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-2xl font-bold text-white mb-1">{getGreeting()}, {user.name} 👋</h1>
          <p className="text-sm text-zinc-400">
            {user.draft_count > 0 ? (
              <>
                You have <span className="text-white font-medium">{user.draft_count} email draft{user.draft_count !== 1 ? "s" : ""}</span> ready to send.
              </>
            ) : (
              <>Your dashboard is up to date. Start by recording a voice memo or generating an email.</>
            )}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hoverEffect className="!p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.change}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Quick actions */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Quick Actions</h2>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} id={`quick-${action.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-200 group cursor-pointer">
                  <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{action.label}</p>
                    <p className="text-xs text-zinc-500 truncate">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent activity */}
        <Card className="xl:col-span-3 !p-0 overflow-hidden">
          <div className="p-5 border-b border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription className="mt-0.5">Your latest actions and events</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                View all
              </Button>
            </div>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {recent_activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-3 rounded-xl bg-zinc-800/40 mb-3">
                  <Clock className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-400 font-medium">No activity yet</p>
                <p className="text-xs text-zinc-600 mt-1">Your recent actions will appear here</p>
              </div>
            ) : (
              recent_activity.map((item) => {
                const config = activityConfig[item.type] || { icon: CheckCircle, color: "text-zinc-400" };
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 hover:bg-zinc-800/20 transition-colors duration-150"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.desc}</p>
                    </div>
                    <span className="text-[11px] text-zinc-600 flex-shrink-0 mt-0.5">{item.time}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
