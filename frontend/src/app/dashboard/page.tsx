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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { getDashboardStats, type DashboardStats, isLoggedIn, saveUserInfo } from "@/lib/api";

// Icon + color mapping for activity types
const activityConfig: Record<string, { icon: typeof Mic; color: string }> = {
  email_sent: { icon: CheckCircle, color: "text-[#06B6D4]" },
  draft: { icon: Mail, color: "text-[#2563EB]" },
  transcription: { icon: Mic, color: "text-[#06B6D4]" },
  conversation: { icon: MessageSquare, color: "text-slate-400" },
};

const quickActions = [
  {
    label: "Record & Transcribe",
    desc: "Upload or record voice to generate email",
    href: "/dashboard/voice-upload",
    icon: Mic,
    gradient: "from-[#2563EB] to-[#06B6D4]",
  },
  {
    label: "Generate Email",
    desc: "Describe your email, let AI write it",
    href: "/dashboard/email-generator",
    icon: Zap,
    gradient: "from-[#06B6D4] to-blue-500",
  },
  {
    label: "View Conversations",
    desc: "Browse all AI conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
    gradient: "from-[#2563EB] to-slate-700",
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
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-[#06B6D4] animate-spin" />
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0F172A]">
        <Card className="max-w-md w-full !p-6 bg-[#1E293B] border border-white/5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Unable to load dashboard</p>
              <p className="text-xs text-slate-400">{error}</p>
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
      label: "Contacts Directory",
      value: stats.transcriptions.toLocaleString(),
      change: stats.transcriptions_change,
      icon: Users,
      color: "text-[#2563EB]",
      bg: "bg-[#2563EB]/10 border-[#2563EB]/20",
    },
    {
      label: "Active Campaigns",
      value: stats.emails_sent.toLocaleString(),
      change: stats.emails_sent_change,
      icon: Megaphone,
      color: "text-[#06B6D4]",
      bg: "bg-[#06B6D4]/10 border-[#06B6D4]/20",
    },
    {
      label: "Dialed Calls",
      value: stats.conversations.toLocaleString(),
      change: stats.conversations_change,
      icon: PhoneCall,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Call Success Rate",
      value: `${stats.success_rate}%`,
      change: stats.success_rate_label,
      icon: TrendingUp,
      color: "text-[#06B6D4]",
      bg: "bg-[#06B6D4]/10 border-[#06B6D4]/25",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-white">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#2563EB]/15 via-[#06B6D4]/5 to-transparent p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-bold text-[#06B6D4] uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-2xl font-extrabold text-white mb-1">{getGreeting()}, {user.name} 👋</h1>
          <p className="text-sm text-slate-400">
            {user.draft_count > 0 ? (
              <>
                You have <span className="text-[#06B6D4] font-semibold">{user.draft_count} email draft{user.draft_count !== 1 ? "s" : ""}</span> ready to send.
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
            <Card key={stat.label} hoverEffect className="!p-5 bg-[#1E293B]/70 border border-white/5 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-extrabold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.change}</p>
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
          <h2 className="text-sm font-bold text-slate-300 px-1">Quick Actions</h2>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} id={`quick-${action.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-[#1E293B]/60 hover:border-[#2563EB]/40 hover:bg-[#1E293B]/80 transition-all duration-200 group cursor-pointer">
                  <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{action.label}</p>
                    <p className="text-xs text-slate-400 truncate">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-[#06B6D4] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent activity */}
        <Card className="xl:col-span-3 !p-0 overflow-hidden border border-white/5 bg-[#1E293B]/70 shadow-lg">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-white">Recent Activity</CardTitle>
                <CardDescription className="mt-0.5 text-slate-400">Your latest actions and events</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-[#06B6D4] hover:text-[#06B6D4]/80 hover:bg-white/5">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                View all
              </Button>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {recent_activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-3 rounded-xl bg-white/5 mb-3">
                  <Clock className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-sm text-slate-300 font-medium">No activity yet</p>
                <p className="text-xs text-slate-500 mt-1">Your recent actions will appear here</p>
              </div>
            ) : (
              recent_activity.map((item) => {
                const config = activityConfig[item.type] || { icon: CheckCircle, color: "text-slate-500" };
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 hover:bg-white/5 transition-colors duration-150"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 truncate">{item.desc}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 flex-shrink-0 mt-0.5">{item.time}</span>
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
