"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { KeyRound, Mail, User, Mic } from "lucide-react";
import { login, register, saveTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (activeTab === "signup" && !name)) {
      setError("Please fill out all fields.");
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === "login") {
        const tokens = await login(email, password);
        saveTokens(tokens.access_token, tokens.refresh_token);
      } else {
        const tokens = await register(name, email, password);
        saveTokens(tokens.access_token, tokens.refresh_token);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center space-x-3 mb-8 animate-fade-in">
        <div className="p-3 bg-indigo-600/25 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Mic className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">VoiceFlow-AI</h1>
          <p className="text-xs text-indigo-400 font-medium">Next-Gen Audio Email Generator</p>
        </div>
      </div>

      <Card className="w-full max-w-md relative z-10">
        <CardHeader>
          <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800 mb-6">
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "login" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setError(""); }}
              className={`py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === "signup" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>
          <CardTitle className="text-xl text-center">
            {activeTab === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription className="text-center">
            {activeTab === "login"
              ? "Sign in to access your dashboard and voice templates."
              : "Register below to get started with AI email transcription."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            {activeTab === "signup" && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 mt-5">
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 mt-5">
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

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 mt-5">
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
          </CardContent>

          <CardFooter className="flex-col space-y-3">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {activeTab === "login" ? "Sign In" : "Register"}
            </Button>
            {activeTab === "login" && (
              <button
                type="button"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
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
