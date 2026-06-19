"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/UI/Button";
import { isLoggedIn } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030712]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
          </div>
          <p className="text-sm font-medium text-gray-400">Loading VoiceFlow AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-[#030712] relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] orb-purple opacity-40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] orb-blue opacity-35 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 w-[450px] h-[450px] orb-green opacity-20 rounded-full blur-3xl" />
        <div className="absolute inset-0 dot-grid opacity-25" />
      </div>

      {/* Top Header */}
      <header className="relative z-30 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full border-b border-white/[0.05] glass rounded-b-2xl">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight leading-none">
              VoiceFlow<span className="text-violet-400 font-extrabold"> AI</span>
            </p>
            <span className="text-[9px] text-gray-500 font-semibold tracking-wider">AI Sales Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-xs font-semibold text-gray-300 hover:text-white px-4 py-2 transition-all cursor-pointer">
              Sign In
            </button>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="primary" className="!text-[11px] h-8.5 px-4 font-bold shadow-md shadow-violet-600/20">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-7xl mx-auto w-full relative z-20">
        
        {/* Badge Intro */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/25 mb-6 animate-fade-in">
          <Sparkles className="h-3 w-3 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300">
            Next-Gen Sales Outreach
          </span>
        </div>

        {/* Hero Headline */}
        <div className="text-center max-w-3xl space-y-4 mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Transform Voice notes & Calls into{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Revenue Action
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed font-medium">
            Generate high-converting email drafts, coordinate parent outreach, organize smart contact lists, and run automated AI-powered voice campaigns with Saarthi.
          </p>
        </div>

        {/* Hero CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-20">
          <Link href="/login">
            <Button variant="primary" size="lg" className="h-12 px-6 font-bold shadow-xl shadow-violet-600/25 group">
              Start Free Trial
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="h-12 px-6 border-white/10 hover:bg-white/[0.04]">
              Schedule Demo
            </Button>
          </Link>
        </div>

        {/* Features Showcase Grid */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-1 mb-10">
            <h2 className="text-xs font-bold text-violet-400 uppercase tracking-widest">Capabilities</h2>
            <p className="text-xl sm:text-2xl font-bold text-white">Full-Suite Outreach Platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            
            {/* Outbound AI Calls Card - EXACT STYLING FROM SCREENSHOT */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
              <div>
                <div className="flex mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] flex items-center justify-center">
                    VOICE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2 leading-tight">
                  Outbound AI Calls
                </h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">
                  AI agents call your contacts automatically. You define the persona, script, and voice — the AI does the talking.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#4F46E5] tracking-wider">Learn more</span>
                <ChevronRight className="h-4 w-4 text-[#4F46E5]" />
              </div>
            </div>

            {/* Feature 2: Audio Email Generator */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] hover:bg-[#111827]/60 group">
              <div>
                <div className="flex mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-center">
                    DICTATE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                  Audio Email Generator
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Record or upload audio memos. Let Saarthi transcribe, filter noise, and generate tailored, high-converting emails instantly.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">Learn more</span>
                <ChevronRight className="h-4 w-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 3: Smart Contacts Directory */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] hover:bg-[#111827]/60 group">
              <div>
                <div className="flex mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center">
                    CRM
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                  Smart Contacts Directory
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Import contact lists from CSV, manage profiles, and track student/parent logs for seamless campaign execution.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Learn more</span>
                <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 4: Interactive AI Conversations */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] hover:bg-[#111827]/60 group">
              <div>
                <div className="flex mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center">
                    ASSISTANT
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                  AI Conversations
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Engage in text-based dialog with Saarthi. Leverage historic memory to optimize templates, translate content, and plan strategies.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Learn more</span>
                <ChevronRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-30 border-t border-white/[0.05] bg-[#020617]/50 py-6 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
          <p>© 2026 VoiceFlow AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Contact Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
