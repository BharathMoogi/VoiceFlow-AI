"use client";

import React from "react";
import Link from "next/link";
import {
  Mic,
  Mail,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";

const stats = [
  {
    label: "Transcriptions",
    value: "128",
    change: "+12 this week",
    icon: Mic,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    label: "Emails Sent",
    value: "54",
    change: "+7 this week",
    icon: Mail,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    label: "Conversations",
    value: "23",
    change: "+3 today",
    icon: MessageSquare,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    label: "Success Rate",
    value: "98.2%",
    change: "All-time high",
    icon: TrendingUp,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
];

const recentActivity = [
  {
    id: 1,
    type: "email_sent",
    title: "Project Update Email Sent",
    desc: "To: team@company.com",
    time: "2 min ago",
    icon: CheckCircle,
    iconColor: "text-emerald-400",
  },
  {
    id: 2,
    type: "transcription",
    title: "Voice Memo Transcribed",
    desc: "meeting_notes_06_08.wav — 2:35 min",
    time: "18 min ago",
    icon: Mic,
    iconColor: "text-indigo-400",
  },
  {
    id: 3,
    type: "draft",
    title: "Email Draft Generated",
    desc: "Subject: Q3 Review Follow-up",
    time: "1 hr ago",
    icon: Mail,
    iconColor: "text-violet-400",
  },
  {
    id: 4,
    type: "conversation",
    title: "New Conversation Started",
    desc: "\"Product launch brief\"",
    time: "3 hr ago",
    icon: MessageSquare,
    iconColor: "text-amber-400",
  },
  {
    id: 5,
    type: "email_sent",
    title: "Invitation Email Sent",
    desc: "To: client@partner.io",
    time: "Yesterday",
    icon: CheckCircle,
    iconColor: "text-emerald-400",
  },
];

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
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-transparent p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Welcome back</p>
          <h1 className="text-2xl font-bold text-white mb-1">Good morning, Demo User 👋</h1>
          <p className="text-sm text-zinc-400">
            You have <span className="text-white font-medium">3 email drafts</span> ready to send and{" "}
            <span className="text-white font-medium">1 pending transcription</span>.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
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
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 hover:bg-zinc-800/20 transition-colors duration-150"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{item.desc}</p>
                  </div>
                  <span className="text-[11px] text-zinc-600 flex-shrink-0 mt-0.5">{item.time}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
