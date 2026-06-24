"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  Sparkles,
  ChevronRight,
  X,
  Mail,
  KeyRound,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import Image from "next/image";
import {
  isLoggedIn,
  login,
  register,
  saveTokens,
  fetchMe,
  saveUserInfo,
  verifyEmailOTP,
  sendResetPasswordEmail,
  exchangeResetPasswordToken,
  resetPassword,
  requestPasswordResetFastAPI,
  confirmPasswordResetFastAPI,
} from "@/lib/api";


export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#030712]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-400">Loading VoiceFlow AI...</p>
          </div>
        </div>
      }
    >
      <LandingPageInner />
    </Suspense>
  );
}

function LandingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "verify" | "forgot_password" | "reset_password_code">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [error, setError] = useState("");
  const [modalAnimating, setModalAnimating] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  // Open modal if ?signin=true or ?signup=true is in URL
  useEffect(() => {
    if (searchParams.get("signin") === "true") {
      openModal("login");
    }
    if (searchParams.get("signup") === "true") {
      openModal("signup");
    }
  }, [searchParams]);

  const openModal = useCallback((tab: "login" | "signup" | "forgot_password" | "reset_password_code") => {
    setActiveTab(tab);
    setError("");
    setShowAuthModal(true);
    setTimeout(() => setModalAnimating(true), 10);
  }, []);

  const closeModal = useCallback(() => {
    setModalAnimating(false);
    setTimeout(() => setShowAuthModal(false), 300);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAuthModal) closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showAuthModal, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (activeTab === "verify" && !otp) {
      setError("Please enter the verification code.");
      return;
    }
    if (activeTab === "forgot_password" && !email) {
      setError("Please enter your email address.");
      return;
    }
    if (activeTab === "reset_password_code" && (!resetCode || !password || !confirmPassword)) {
      setError("Please fill out all fields.");
      return;
    }
    if (password && confirmPassword && password !== confirmPassword && activeTab === "reset_password_code") {
      setError("Passwords do not match.");
      return;
    }
    if (activeTab !== "verify" && activeTab !== "forgot_password" && activeTab !== "reset_password_code" && (!email || !password || (activeTab === "signup" && !name))) {
      setError("Please fill out all fields.");
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === "login") {
        const tokens = await login(email, password);
        saveTokens(tokens.access_token, tokens.refresh_token);
      } else if (activeTab === "signup") {
        const tokens = await register(name, email, password);
        saveTokens(tokens.access_token, tokens.refresh_token);
      } else if (activeTab === "verify") {
        const tokens = await verifyEmailOTP(email, otp);
        saveTokens(tokens.access_token, tokens.refresh_token);
      } else if (activeTab === "forgot_password") {
        const resetRedirectUrl = window.location.origin + "/reset-password";
        await sendResetPasswordEmail(email, resetRedirectUrl);

        try {
          await requestPasswordResetFastAPI(email);
        } catch (backendErr) {
          console.warn("FastAPI backend reset request failed:", backendErr);
        }

        setActiveTab("reset_password_code");
        alert("A password reset code has been sent to your email. Please enter it below along with your new password.");
        return;
      } else if (activeTab === "reset_password_code") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }

        const exchangeResult = await exchangeResetPasswordToken(email, resetCode);
        const resetToken = exchangeResult?.token;
        if (!resetToken) {
          throw new Error("Failed to exchange reset code. Please check the code and try again.");
        }

        await resetPassword(password, resetToken);

        try {
          await confirmPasswordResetFastAPI(resetToken, password);
        } catch (backendErr) {
          console.warn("FastAPI backend confirmation failed:", backendErr);
        }

        alert("Your password has been successfully reset! You can now log in.");
        setActiveTab("login");
        setPassword("");
        setConfirmPassword("");
        setResetCode("");
        return;
      }

      // Fetch and cache user profile for sidebar display
      try {
        const profile = await fetchMe();
        saveUserInfo(profile.full_name || profile.email, profile.email);
      } catch {
        // Non-critical — sidebar will still work with fallback
      }

      const redirect = sessionStorage.getItem('post_login_redirect');
      sessionStorage.removeItem('post_login_redirect');
      router.push(redirect || "/dashboard");
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("email verification required") ||
        msg.toLowerCase().includes("otp") ||
        msg.toLowerCase().includes("verify your email first")
      ) {
        setActiveTab("verify");
        setError("Please enter the verification code sent to your email.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <button
            onClick={() => openModal("login")}
            className="text-xs font-semibold text-gray-300 hover:text-white px-4 py-2 transition-all cursor-pointer"
          >
            Sign In
          </button>
          <Button
            size="sm"
            variant="primary"
            className="!text-[11px] h-8.5 px-4 font-bold shadow-md shadow-violet-600/20"
            onClick={() => openModal("signup")}
          >
            Get Started
          </Button>
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
          <Button
            variant="primary"
            size="lg"
            className="h-12 px-6 font-bold shadow-xl shadow-violet-600/25 group"
            onClick={() => openModal("signup")}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 border-white/10 hover:bg-white/[0.04]"
            onClick={() => openModal("signup")}
          >
            Schedule Demo
          </Button>
        </div>

        {/* Features Showcase Grid */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-1 mb-10">
            <h2 className="text-xs font-bold text-violet-400 uppercase tracking-widest">Capabilities</h2>
            <p className="text-xl sm:text-2xl font-bold text-white">Full-Suite Outreach Platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            
            {/* Outbound AI Calls Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] hover:bg-[#111827]/60 group">
              <div>
                <div className="flex mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center justify-center">
                    VOICE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                  Outbound AI Calls
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  AI agents call your contacts automatically. You define the persona, script, and voice — the AI does the talking.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-violet-400 tracking-wider">Learn more</span>
                <ChevronRight className="h-4 w-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
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

        {/* ═══════════════════════════════════════════════════════════════
            PRICING SECTION
           ═══════════════════════════════════════════════════════════════ */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">

          {/* Section header */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-bold uppercase tracking-widest mb-5">
              <Sparkles className="h-3 w-3" /> Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
              Start for free. Upgrade when you need more power.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

            {/* Free Plan */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#111827]/40 p-8 flex flex-col">
              <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Free Plan</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">₹0</span>
                  <span className="text-gray-500 text-sm mb-1">/ month</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">Perfect to explore and get started.</p>
              </div>

              <ul className="space-y-3 flex-1">
                {[
                  { text: "5 AI email generations", ok: true },
                  { text: "1 agent configuration", ok: true },
                  { text: "1 campaign", ok: true },
                  { text: "3 outbound AI calls", ok: true },
                  { text: "Smart Contacts Directory", ok: true },
                  { text: "AI Conversations (Saarthi)", ok: true },
                  { text: "Unlimited outbound calls", ok: false },
                  { text: "Bulk campaign dialing", ok: false },
                  { text: "Premium ElevenLabs voices", ok: false },
                  { text: "Unlimited emails & campaigns", ok: false },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs">
                    {item.ok ? (
                      <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                    ) : (
                      <span className="h-4 w-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="h-2.5 w-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </span>
                    )}
                    <span className={item.ok ? "text-gray-300" : "text-gray-600 line-through"}>{item.text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setShowAuthModal(true)}
                className="mt-8 w-full py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-white text-xs font-bold tracking-wide transition-all cursor-pointer"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-500/10 to-[#111827]/60 p-8 flex flex-col shadow-2xl shadow-violet-500/10">
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-violet-600/40">
                  ✦ Most Popular
                </span>
              </div>

              <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Pro Plan</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">₹99</span>
                  <span className="text-gray-400 text-sm mb-1">/ month</span>
                </div>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">Everything you need to scale outreach.</p>
              </div>

              <ul className="space-y-3 flex-1">
                {[
                  "Unlimited AI email generations",
                  "Unlimited agent configurations",
                  "Unlimited campaigns",
                  "Unlimited outbound AI calls",
                  "Bulk campaign dialing",
                  "Premium ElevenLabs voices (Paul & Rachel)",
                  "Smart Contacts Directory",
                  "AI Conversations (Saarthi)",
                  "Priority support",
                  "All future features included",
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs">
                    <span className="h-4 w-4 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <svg className="h-2.5 w-2.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <span className="text-gray-200">{text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (isLoggedIn()) {
                    router.push('/dashboard/settings');
                  } else {
                    sessionStorage.setItem('post_login_redirect', '/dashboard/settings');
                    setShowAuthModal(true);
                  }
                }}
                className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              >
                Start Pro →
              </button>

              <p className="mt-3 text-center text-[10px] text-gray-500">Pay via UPI · No card required · Cancel anytime</p>
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

      {/* ═══════════════════════════════════════════════════════════════
          AUTH MODAL OVERLAY
         ═══════════════════════════════════════════════════════════════ */}
      {showAuthModal && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
            modalAnimating ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-[#030712]/70 backdrop-blur-md transition-all duration-300 ${
              modalAnimating ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeModal}
          />

          {/* Modal Card */}
          <div
            className={`relative z-10 w-full max-w-md mx-4 transition-all duration-300 ease-out ${
              modalAnimating
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-4"
            }`}
          >
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-600/20 rounded-3xl blur-xl opacity-60" />

            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0F172A]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Top accent line */}
              <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-all z-20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8">
                {/* Brand mini header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-9 w-9 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight leading-none">
                      VoiceFlow<span className="text-violet-400 font-extrabold"> AI</span>
                    </p>
                    <span className="text-[9px] text-gray-500 font-semibold tracking-wider">AI Sales Platform</span>
                  </div>
                </div>

                {/* Tab switcher */}
                {activeTab !== "verify" && activeTab !== "forgot_password" && activeTab !== "reset_password_code" && (
                  <div className="grid grid-cols-2 gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] mb-6">
                    <button
                      onClick={() => { setActiveTab("login"); setError(""); }}
                      className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        activeTab === "login"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setActiveTab("signup"); setError(""); }}
                      className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        activeTab === "signup"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                {/* Title */}
                <h2 className="text-xl font-extrabold text-white mb-1">
                  {activeTab === "login"
                    ? "Welcome back"
                    : activeTab === "signup"
                    ? "Create an account"
                    : activeTab === "forgot_password"
                    ? "Reset Password"
                    : activeTab === "reset_password_code"
                    ? "Confirm Reset"
                    : "Verify Email"}
                </h2>
                <p className="text-xs text-gray-400 mb-6">
                  {activeTab === "login"
                    ? "Sign in to access your dashboard and voice templates."
                    : activeTab === "signup"
                    ? "Register below to get started with AI email transcription."
                    : activeTab === "forgot_password"
                    ? "Enter your email address to receive a password reset code."
                    : activeTab === "reset_password_code"
                    ? `Enter the 6-digit code sent to ${email || "your email"}`
                    : `Enter the code sent to ${email || "your email"}`}
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center font-medium animate-fade-in">
                      {error}
                    </div>
                  )}

                  {activeTab === "signup" && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                        <User className="h-4 w-4" />
                      </div>
                      <Input
                        label="Full Name"
                        id="modal-name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {activeTab !== "verify" && activeTab !== "reset_password_code" && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                        <Mail className="h-4 w-4" />
                      </div>
                      <Input
                        label="Email address"
                        id="modal-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {activeTab !== "verify" && activeTab !== "forgot_password" && activeTab !== "reset_password_code" && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <Input
                        label="Password"
                        id="modal-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {activeTab === "reset_password_code" && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <Input
                          label="6-Digit Reset Code"
                          id="modal-reset-code"
                          type="text"
                          placeholder="123456"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <Input
                          label="New Password"
                          id="modal-new-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <Input
                          label="Confirm Password"
                          id="modal-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === "verify" && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          label="Email address"
                          id="modal-verify-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 mt-5">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <Input
                          label="Verification Code"
                          id="modal-otp"
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="pl-9 bg-[#0F172A]/80 border-white/[0.06] focus:border-violet-500/50 text-white"
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all cursor-pointer"
                    isLoading={isLoading}
                  >
                    {activeTab === "login"
                      ? "Sign In"
                      : activeTab === "signup"
                      ? "Create Account"
                      : activeTab === "forgot_password"
                      ? "Send Reset Code"
                      : activeTab === "reset_password_code"
                      ? "Reset Password"
                      : "Verify"}
                  </Button>

                  {activeTab === "login" && (
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                        onClick={() => { setActiveTab("forgot_password"); setError(""); }}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}

                  {activeTab === "forgot_password" && (
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                        onClick={() => { setActiveTab("login"); setError(""); }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  )}

                  {activeTab === "reset_password_code" && (
                    <div className="text-center flex justify-center gap-4">
                      <button
                        type="button"
                        className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                        onClick={() => { setActiveTab("forgot_password"); setError(""); }}
                      >
                        Resend Code
                      </button>
                      <span className="text-[11px] text-gray-600">|</span>
                      <button
                        type="button"
                        className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
                        onClick={() => { setActiveTab("login"); setError(""); }}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  )}
                </form>

                {/* Founder credit */}
                <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/logo.png"
                      alt="VoiceFlow AI Logo"
                      width={36}
                      height={36}
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="flex flex-col text-white">
                    <p className="text-xs font-bold leading-tight">Bharath Moogi</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-wide uppercase">
                        Founder
                      </span>
                      <span className="text-[9px] text-gray-400">VoiceFlow-AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
