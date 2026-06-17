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
  
  // Preferences states
  const [darkMode, setDarkMode] = useState(false);
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
    try {
      await updateProfile(editName);
      setUserInfo(prev => ({ ...prev, name: editName }));
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-[#f2fbf7] via-white to-[#edf8f2] text-zinc-800 p-4 sm:p-6 md:p-8 rounded-3xl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Header Card */}
        <div className="bg-white border border-emerald-100/50 rounded-3xl p-6 shadow-sm shadow-emerald-100/60 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all">
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            {/* Avatar block with green badge */}
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-[#e6f7ef] flex items-center justify-center text-[#0f5132] text-3xl font-extrabold shadow-inner">
                {initial}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center shadow-md">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
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
                    className="w-full px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500 text-zinc-800 font-semibold"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 leading-tight">
                    {userInfo.name}
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-zinc-500 text-sm mt-1">
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{userInfo.email}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <button 
              onClick={startEditing}
              className="px-6 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-full text-xs font-bold text-zinc-800 shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Activity Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400/90 uppercase px-1">
              Activity
            </span>
            <div className="bg-white border border-emerald-100/30 rounded-3xl shadow-sm shadow-emerald-100/40 overflow-hidden divide-y divide-zinc-100/80">
              
              <div 
                onClick={() => router.push("/dashboard/voice-upload")}
                className="flex items-center justify-between p-4 hover:bg-zinc-50/50 cursor-pointer transition-all animate-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50/70 text-blue-500 flex items-center justify-center">
                    <Mic className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Voice Uploads</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </div>

              <div 
                onClick={() => router.push("/dashboard/agent-configs")}
                className="flex items-center justify-between p-4 hover:bg-zinc-50/50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50/70 text-emerald-500 flex items-center justify-center">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Agent Configs</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </div>

              <div 
                onClick={() => router.push("/dashboard/call-logs")}
                className="flex items-center justify-between p-4 hover:bg-zinc-50/50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50/70 text-orange-500 flex items-center justify-center">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Call History</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </div>

            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400/90 uppercase px-1">
              Preferences
            </span>
            <div className="bg-white border border-emerald-100/30 rounded-3xl shadow-sm shadow-emerald-100/40 overflow-hidden divide-y divide-zinc-100/80">
              
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50/70 text-purple-500 flex items-center justify-center">
                    {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Dark Mode</span>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${darkMode ? 'bg-purple-500' : 'bg-zinc-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50/70 text-amber-500 flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Notifications</span>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${notifications ? 'bg-[#10b981]' : 'bg-zinc-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          </div>

          {/* Support & Legal Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400/90 uppercase px-1">
              Support & Legal
            </span>
            <div className="bg-white border border-emerald-100/30 rounded-3xl shadow-sm shadow-emerald-100/40 overflow-hidden">
              
              <div className="flex items-center justify-between p-4 hover:bg-zinc-50/50 cursor-pointer transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50/70 text-rose-500 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800">Feedback</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </div>

            </div>
          </div>

          {/* Danger Zone Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-rose-500 uppercase px-1">
              Danger Zone
            </span>
            <div className="bg-white border border-red-100/50 rounded-3xl shadow-sm shadow-red-100/10 overflow-hidden">
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50/20 cursor-pointer transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50/70 text-red-500 flex items-center justify-center">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-red-600">Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 text-red-500" />
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
