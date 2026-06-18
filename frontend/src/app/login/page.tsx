"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { KeyRound, Mail, User, Mic } from "lucide-react";
import Image from "next/image";
import { login, register, saveTokens, fetchMe, saveUserInfo, verifyEmailOTP } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "verify">("login");
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (activeTab === "verify" && !otp) {
      setError("Please enter the verification code.");
      return;
    }
    if (activeTab !== "verify" && (!email || !password || (activeTab === "signup" && !name))) {
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
      }

      // Fetch and cache user profile for sidebar display
      try {
        const profile = await fetchMe();
        saveUserInfo(profile.full_name || profile.email, profile.email);
      } catch {
        // Non-critical — sidebar will still work with fallback
      }

      router.push("/dashboard");
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

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen bg-[#0F172A] text-white">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#2563EB]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-[#06B6D4]/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center space-x-3 mb-8 animate-fade-in relative z-10">
        <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl flex items-center justify-center shadow-lg shadow-[#2563EB]/5">
          <Mic className="h-6 w-6 text-[#06B6D4]" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">VoiceFlow-AI</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Next-Gen Audio Email Generator</p>
        </div>
      </div>

      <Card className="w-full max-w-md relative z-10 border border-white/5 shadow-2xl shadow-[#020617]/50 bg-[#1E293B]/70 backdrop-blur-md p-6 rounded-2xl">
        <CardHeader className="!mb-6">
          <div className="grid grid-cols-2 gap-2 bg-[#020617]/45 p-1 rounded-xl border border-white/5 mb-6">
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "login" ? "bg-[#2563EB] text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === "signup" ? "bg-[#2563EB] text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
          <CardTitle className="text-xl text-center text-white font-extrabold">
            {activeTab === "login" ? "Welcome back" : activeTab === "signup" ? "Create an account" : "Verify Email"}
          </CardTitle>
          <CardDescription className="text-center text-slate-400 mt-1">
            {activeTab === "login"
              ? "Sign in to access your dashboard and voice templates."
              : activeTab === "signup"
              ? "Register below to get started with AI email transcription."
              : `Enter the code sent to ${email || "your email"}`}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center font-medium">
                {error}
              </div>
            )}

            {activeTab === "signup" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 mt-5">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  label="Full Name"
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 bg-[#0F172A]/50 border-white/5 focus:border-[#2563EB] text-white"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 mt-5">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                label="Email address"
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-[#0F172A]/50 border-white/5 focus:border-[#2563EB] text-white"
                disabled={isLoading}
              />
            </div>

            {activeTab !== "verify" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 mt-5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-[#0F172A]/50 border-white/5 focus:border-[#2563EB] text-white"
                  disabled={isLoading}
                />
              </div>
            )}

            {activeTab === "verify" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 mt-5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <Input
                  label="Verification Code"
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pl-9 bg-[#0F172A]/50 border-white/5 focus:border-[#2563EB] text-white"
                  disabled={isLoading}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col space-y-3 mt-6">
            <Button 
              type="submit" 
              className="w-full bg-[#2563EB] hover:bg-[#2563EB]/95 hover:shadow-lg hover:shadow-[#2563EB]/25 text-white py-2.5 rounded-xl font-bold transition-all" 
              isLoading={isLoading}
            >
              {activeTab === "login" ? "Sign In" : activeTab === "signup" ? "Register" : "Verify"}
            </Button>
            {activeTab === "login" && (
              <button
                type="button"
                className="text-xs text-[#06B6D4] hover:text-[#06B6D4]/80 font-medium transition-colors"
                onClick={() => alert("Password reset coming soon.")}
              >
                Forgot your password?
              </button>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Founder credit — premium card */}
      <div className="mt-8 relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md shadow-xl shadow-black/20">
          {/* Logo */}
          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="VoiceFlow AI Logo"
              width={48}
              height={48}
              className="object-contain p-1"
            />
          </div>
          {/* Name + title */}
          <div className="flex flex-col">
            <p className="text-base font-extrabold text-white tracking-tight leading-tight">
              Bharath Moogi
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-wide uppercase">
                Founder
              </span>
              <span className="text-[11px] text-slate-500">VoiceFlow-AI</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-700">© 2026 VoiceFlow-AI. All rights reserved.</p>
      </div>
    </div>
  );
}
