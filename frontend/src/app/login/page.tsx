"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { KeyRound, Mail, User, Mic } from "lucide-react";
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
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen bg-[#FFFFFF] text-[#333333]">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#002D5C]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-[#7D9B9F]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center space-x-3 mb-8 animate-fade-in">
        <div className="p-3 bg-[#002D5C]/10 border border-[#002D5C]/20 rounded-2xl flex items-center justify-center shadow-md">
          <Mic className="h-6 w-6 text-[#002D5C]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#002D5C]">VoiceFlow-AI</h1>
          <p className="text-xs text-[#7D9B9F] font-medium">Next-Gen Audio Email Generator</p>
        </div>
      </div>

      <Card className="w-full max-w-md relative z-10 border border-[#7D9B9F]/20 shadow-sm shadow-[#7D9B9F]/10 bg-white">
        <CardHeader>
          <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-1.5 rounded-lg border border-[#7D9B9F]/20 mb-6">
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "login" ? "bg-[#002D5C] text-white shadow-sm" : "text-[#4B4B4D] hover:text-[#002D5C]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "signup" ? "bg-[#002D5C] text-white shadow-sm" : "text-[#4B4B4D] hover:text-[#002D5C]"
              }`}
            >
              Sign Up
            </button>
          </div>
          <CardTitle className="text-xl text-center text-[#002D5C]">
            {activeTab === "login" ? "Welcome back" : activeTab === "signup" ? "Create an account" : "Verify Email"}
          </CardTitle>
          <CardDescription className="text-center text-zinc-500">
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
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            {activeTab === "signup" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 mt-5">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  label="Full Name"
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 mt-5">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                label="Email address"
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>

            {activeTab !== "verify" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 mt-5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            )}

            {activeTab === "verify" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 mt-5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <Input
                  label="Verification Code"
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full bg-[#002D5C] hover:bg-[#002D5C]/90 text-white" isLoading={isLoading}>
              {activeTab === "login" ? "Sign In" : activeTab === "signup" ? "Register" : "Verify"}
            </Button>
            {activeTab === "login" && (
              <button
                type="button"
                className="text-xs text-[#002D5C] hover:text-[#002D5C]/80 transition-colors"
                onClick={() => alert("Password reset coming soon.")}
              >
                Forgot your password?
              </button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
