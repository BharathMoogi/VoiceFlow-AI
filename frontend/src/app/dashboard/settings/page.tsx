"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  ShieldCheck, 
  Mail, 
  Mic, 
  Sliders, 
  PhoneCall, 
  Sun, 
  Moon, 
  Bell, 
  MessageSquare, 
  LogOut, 
  ChevronRight,
  Check,
  X,
  Star,
  Sparkles
} from "lucide-react";
import { logout, getUserInfo, isLoggedIn, fetchMe, saveUserInfo, updateProfile, submitFeedback, upgradeToPro } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { insforge } from "@/lib/insforge";

const UPI_ID = "6303875878-2@ybl";
const UPI_NAME = "VoiceFlow Pro";
const UPI_AMOUNT = "99";
const UPI_NOTE = "VoiceFlow+Pro+Subscription";
const UPI_URL = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${UPI_AMOUNT}&cu=INR&tn=${UPI_NOTE}`;



export default function SettingsPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({ name: "Moogi Bharath", email: "bharathmoogi143@gmail.com", phone: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Preferences states
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Pro Upgrade states
  const [isPro, setIsPro] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");

  // QR Code payment timer state and countdown logic (1 minute)
  const [paymentTimer, setPaymentTimer] = useState(60);

  useEffect(() => {
    if (!showCheckoutModal) {
      setPaymentTimer(60);
      return;
    }
    const interval = setInterval(() => {
      setPaymentTimer((prev) => {
        if (prev <= 1) {
          return 60; // Reset to 60 seconds (1 min)
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showCheckoutModal]);


  // Load actual user info if logged in
  useEffect(() => {
    // Load theme preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light") {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }

    // Load notifications preference
    const storedNotifications = localStorage.getItem("notifications");
    if (storedNotifications === "false") {
      setNotifications(false);
    } else {
      setNotifications(true);
    }

    const stored = getUserInfo();
    setIsPro(stored.plan === "pro");
    if (stored.name && stored.name !== "User") {
      setUserInfo(prev => ({ ...prev, name: stored.name }));
    }
    if (stored.email) {
      setUserInfo(prev => ({ ...prev, email: stored.email }));
    }
    if (stored.phone) {
      setUserInfo(prev => ({ ...prev, phone: stored.phone }));
    }

    if (isLoggedIn()) {
      fetchMe()
        .then((profile) => {
          const name = profile.full_name || profile.email;
          const phone = profile.phone || "";
          saveUserInfo(name, profile.email, profile.plan, phone);
          setUserInfo({ name, email: profile.email, phone });
          setIsPro(profile.plan === "pro");
        })
        .catch(() => {
          // ignore
        });
    }

    const handlePlanChange = (e: any) => {
      setIsPro(e.detail === "pro");
    };
    window.addEventListener("planChanged", handlePlanChange);
    return () => {
      window.removeEventListener("planChanged", handlePlanChange);
    };
  }, []);



  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    // Optimistically update UI and localStorage immediately
    setUserInfo(prev => ({ ...prev, name: editName, phone: editPhone }));
    const plan = getUserInfo().plan || 'free';
    saveUserInfo(editName, userInfo.email, plan, editPhone);
    setIsEditing(false);
    try {
      await updateProfile(editName, editPhone);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      // Show error but keep the local updates
      setSaveError(error instanceof Error ? error.message : "Failed to save to server. Profile updated locally.");
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setEditName(userInfo.name);
    setEditPhone(userInfo.phone || "");
    setIsEditing(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      await submitFeedback(feedbackRating, feedbackComment);
      setFeedbackSuccess(true);
      setFeedbackComment("");
      setFeedbackRating(5);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleToggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("theme", newVal ? "dark" : "light");
    if (newVal) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: newVal ? "dark" : "light" }));
  };

  const handleToggleNotifications = () => {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem("notifications", String(newVal));
    window.dispatchEvent(new CustomEvent("notificationsChanged", { detail: newVal }));
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError(null);

    // Validate UTR — must be exactly 12 digits
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setUpgradeError("Please enter your UPI Transaction ID (UTR) to verify payment.");
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUpgradeError("UTR must be exactly 12 digits. Check your UPI app payment receipt.");
      return;
    }

    setUpgradingPlan(true);
    try {
      // Save UTR for manual verification before upgrading
      const userResult = await insforge.auth.getCurrentUser();
      const userId = userResult?.data?.user?.id ?? null;
      await insforge
        .from('payment_requests')
        .insert([{ user_id: userId, utr: cleanUtr, amount: 99, status: 'pending' }])
        .catch(() => {}); // best-effort — don't block if table doesn't exist yet

      await upgradeToPro();
      setUpgradeSuccess(true);
      setUtrNumber("");
      setTimeout(() => {
        setShowCheckoutModal(false);
        setUpgradeSuccess(false);
      }, 2000);
    } catch (err: any) {
      setUpgradeError(err.message || "Upgrade failed. Please try again.");
    } finally {
      setUpgradingPlan(false);
    }
  };

  // Get initial letter
  const initial = userInfo.name ? userInfo.name.charAt(0).toUpperCase() : "M";




  return (
    <div className="min-h-screen bg-transparent text-foreground p-4 sm:p-6 md:p-8 rounded-3xl">
      <div className="max-w-4xl mx-auto space-y-8">


        {/* Success toast */}
        {saveSuccess && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>Name saved successfully!</span>
          </div>
        )}

        {/* Error toast */}
        {saveError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <X className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError(null)} className="hover:text-red-300 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        )}
        
        {/* Profile Header Card */}
        <div className="bg-card/70 border border-border rounded-3xl p-6 shadow-xl shadow-black/10 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">

            {/* Avatar block with badge */}
            <div className="relative border border-white/10 rounded-2xl p-0.5">
              <div className="h-20 w-20 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                {initial}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#06B6D4] border-2 border-[#1E293B] flex items-center justify-center shadow-md">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0F172A]" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center sm:text-left flex-1 w-full">
              {isEditing ? (
                <div className="flex flex-col gap-2 mt-1 w-full max-w-md">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-[#030712] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white font-semibold"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-[#030712] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white font-semibold"
                    placeholder="Enter phone number (e.g. +91 6303875878)"
                  />
                  <div className="flex gap-1 justify-end sm:justify-start">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="p-2 bg-[#2563EB] hover:bg-blue-600/90 text-white rounded-xl shadow-sm transition-all"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-2 bg-[#1F2937] hover:bg-white/5 text-gray-400 rounded-xl transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {userInfo.name}
                  </h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-400 text-sm mt-2 justify-center sm:justify-start">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-violet-400" />
                      <span>{userInfo.email}</span>
                    </div>
                    {userInfo.phone && (
                      <div className="flex items-center gap-1.5">
                        <PhoneCall className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{userInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <button 
              onClick={startEditing}
              className="px-6 py-2.5 bg-gradient-to-r from-[#2563EB] to-blue-600 border border-white/10 hover:border-white/20 rounded-full text-xs font-bold text-white shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Billing & Subscription Section */}
        <div className="bg-card/70 border border-border rounded-3xl p-6 shadow-xl shadow-black/10 transition-all backdrop-blur-md space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                Subscription Plan
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your membership status, usage quotas, and billing invoices.
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              isPro ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-white/5 text-gray-400 border border-white/5"
            }`}>
              {isPro ? "Pro Member" : "Free Plan"}
            </span>
          </div>

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {isPro ? "VoiceFlow Pro Plan ($29/mo)" : "Basic Access"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPro 
                  ? "Enjoy unlimited transcription, campaigns, and high-performance AI voice agents." 
                  : "Upgrade to get unlimited campaign dialing, transcribing, and OpenAI GPT-4o voice nodes."}
              </p>
            </div>
            {!isPro && (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Activity Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase px-1">
              Activity
            </span>
            <div className="bg-card/70 border border-border rounded-3xl shadow-xl shadow-black/10 overflow-hidden divide-y divide-border backdrop-blur-md">

              
              <div 
                onClick={() => router.push("/dashboard/voice-upload")}
                className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/10">
                    <Mic className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-200">Voice Uploads</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>

              <div 
                onClick={() => router.push("/dashboard/agent-configs")}
                className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/10">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-200">Agent Configs</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>

              <div 
                onClick={() => router.push("/dashboard/call-logs")}
                className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/10">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-200">Call History</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>

            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase px-1">
              Preferences
            </span>
            <div className="bg-card/70 border border-border rounded-3xl shadow-xl shadow-black/10 overflow-hidden divide-y divide-border backdrop-blur-md">
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center border border-white/5">
                    {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-gray-200">Dark Mode</span>
                </div>
                <button 
                  onClick={handleToggleDarkMode}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${darkMode ? 'bg-[#06B6D4]' : 'bg-gray-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/10">
                    <Bell className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-200">Notifications</span>
                </div>
                <button 
                  onClick={handleToggleNotifications}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notifications ? 'bg-[#06B6D4]' : 'bg-gray-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>


            </div>
          </div>

          {/* Support & Legal Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase px-1">
              Support & Legal
            </span>
            <div className="bg-card/70 border border-border rounded-3xl shadow-xl shadow-black/10 overflow-hidden backdrop-blur-md">

              
              <div 
                onClick={() => setShowFeedbackModal(true)}
                className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/10">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-200">Feedback</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>

            </div>
          </div>


          {/* Danger Zone Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-rose-500 uppercase px-1">
              Danger Zone
            </span>
            <div className="bg-card/70 border border-red-500/10 rounded-3xl shadow-xl shadow-black/10 overflow-hidden backdrop-blur-md">

              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 cursor-pointer transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/10">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-rose-500">Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-500" />
              </button>

            </div>
          </div>

        </div>
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative max-w-md w-full bg-[#0F172A]/95 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            {/* Top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

            <button
              onClick={() => setShowFeedbackModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-none">Share Your Feedback</h3>
                  <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">VoiceFlow AI</span>
                </div>
              </div>

              {feedbackSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Thank You!</h4>
                  <p className="text-xs text-gray-400">Your feedback has been successfully submitted. We appreciate your response.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  {feedbackError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center font-medium">
                      {feedbackError}
                    </div>
                  )}

                  <div className="space-y-2 text-center">
                    <span className="text-xs text-gray-400 font-semibold">How would you rate your experience?</span>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 rounded-lg transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              feedbackRating >= star ? "fill-amber-400 text-amber-400" : "text-gray-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="feedback-comment" className="text-xs text-gray-400 font-semibold">
                      Tell us what we can improve
                    </label>
                    <textarea
                      id="feedback-comment"
                      rows={4}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Your feedback, suggestions, or issues..."
                      className="w-full bg-[#0F172A]/80 border border-white/[0.06] focus:border-violet-500/50 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="px-4 py-2 text-xs font-semibold text-white rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative max-w-md w-full bg-[#0F172A]/95 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-none">Upgrade to Pro</h3>
                  <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">VoiceFlow Premium</span>
                </div>
              </div>

              {upgradeSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Upgrade Successful!</h4>
                  <p className="text-xs text-gray-400 font-medium">Welcome to VoiceFlow Pro. All features are now unlocked.</p>
                </div>
              ) : (
                <form onSubmit={handleUpgrade} className="space-y-4">
                  {upgradeError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center font-medium">
                      {upgradeError}
                    </div>
                  )}

                  <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-gray-400">Monthly Plan Subscription</span>
                    <span className="font-extrabold text-white text-sm">₹99 / mo</span>
                  </div>

                  {/* QR Code Container — UPI deep link auto-fills ₹99 */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-3">
                    <div className="relative bg-white p-3 rounded-2xl shadow-xl">
                      <QRCodeSVG
                        value={UPI_URL}
                        size={176}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-[11px] font-bold text-gray-300">Scan to Pay ₹99 via UPI</p>
                      <p className="text-[10px] text-gray-500 max-w-[240px] leading-relaxed">
                        Amount is pre-filled automatically. Works with GPay, PhonePe, Paytm, and all UPI apps.
                      </p>
                      <p className="text-[10px] text-violet-400 font-semibold">{UPI_ID}</p>
                      <div className="pt-2 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
                          Code refreshes in: {Math.floor(paymentTimer / 60)}:{(paymentTimer % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>


                  {/* UTR Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      UPI Transaction ID (UTR) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="Enter 12-digit UTR from your UPI app"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all font-mono tracking-widest"
                    />
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      After paying, open your UPI app → tap the transaction → copy the 12-digit UTR / Reference ID.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={upgradingPlan || utrNumber.trim().length !== 12}
                      className="px-4 py-2 text-xs font-semibold text-white rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {upgradingPlan ? "Verifying Payment..." : "I've Paid, Activate Pro"}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

