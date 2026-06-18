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
  X
} from "lucide-react";
import { logout, getUserInfo, isLoggedIn, fetchMe, saveUserInfo, updateProfile } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({ name: "Moogi Bharath", email: "bharathmoogi143@gmail.com" });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Preferences states
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Load actual user info if logged in
  useEffect(() => {
    const stored = getUserInfo();
    if (stored.name && stored.name !== "User") {
      setUserInfo(prev => ({ ...prev, name: stored.name }));
    }
    if (stored.email) {
      setUserInfo(prev => ({ ...prev, email: stored.email }));
    }

    if (isLoggedIn()) {
      fetchMe()
        .then((profile) => {
          const name = profile.full_name || profile.email;
          saveUserInfo(name, profile.email);
          setUserInfo({ name, email: profile.email });
        })
        .catch(() => {
          // ignore
        });
    }
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
    setUserInfo(prev => ({ ...prev, name: editName }));
    saveUserInfo(editName, userInfo.email);
    setIsEditing(false);
    try {
      await updateProfile(editName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      // Show error but keep the local name update
      setSaveError(error instanceof Error ? error.message : "Failed to save to server. Name updated locally.");
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setEditName(userInfo.name);
    setIsEditing(true);
  };

  // Get initial letter
  const initial = userInfo.name ? userInfo.name.charAt(0).toUpperCase() : "M";

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-6 md:p-8 rounded-3xl">
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
        <div className="bg-[#1F2937]/70 border border-white/5 rounded-3xl p-6 shadow-xl shadow-[#020617]/40 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all backdrop-blur-md">
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
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-1 w-full max-w-md">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-[#030712] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white font-semibold"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <div className="flex gap-1">
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
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-400 text-sm mt-1">
                    <Mail className="h-3.5 w-3.5 text-violet-400" />
                    <span>{userInfo.email}</span>
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

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Activity Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase px-1">
              Activity
            </span>
            <div className="bg-[#1F2937]/70 border border-white/5 rounded-3xl shadow-xl shadow-[#020617]/20 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              
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
            <div className="bg-[#1F2937]/70 border border-white/5 rounded-3xl shadow-xl shadow-[#020617]/20 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center border border-white/5">
                    {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-gray-200">Dark Mode</span>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
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
                  onClick={() => setNotifications(!notifications)}
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
            <div className="bg-[#1F2937]/70 border border-white/5 rounded-3xl shadow-xl shadow-[#020617]/20 overflow-hidden backdrop-blur-md">
              
              <div className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-all">
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
            <div className="bg-[#1F2937]/70 border border-red-500/10 rounded-3xl shadow-xl shadow-[#020617]/20 overflow-hidden backdrop-blur-md">
              
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
    </div>
  );
}
