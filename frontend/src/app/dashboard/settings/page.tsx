"use client";

import React, { useState } from "react";
import { Settings, Bell, Lock, Palette, Globe, Save, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("Demo User");
  const [emailAddr, setEmailAddr] = useState("demo@voiceflow.ai");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              D
            </div>
            <Button variant="outline" size="sm" id="change-avatar-btn">Change Avatar</Button>
          </div>
          <Input label="Full Name" id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email Address" id="settings-email" type="email" value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" />Notifications</CardTitle>
          <CardDescription>Choose what alerts you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Email sent confirmations", "Transcription completed", "AI generation finished"].map((label) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-sm text-zinc-300">{label}</span>
              <button
                id={`toggle-${label.toLowerCase().replace(/\s/g, "-")}`}
                className="relative w-10 h-5 bg-indigo-600 rounded-full transition-colors"
              >
                <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-rose-400" />API Configuration</CardTitle>
          <CardDescription>Manage your API keys (stored securely)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Gemini API Key" id="gemini-api-key" type="password" defaultValue="AIza••••••••••••••••••••" />
          <Input label="SMTP Password" id="smtp-password" type="password" defaultValue="••••••••••••••••" />
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" id="save-settings-btn">
        {saved ? <><Check className="h-4 w-4 mr-2" />Settings Saved!</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
      </Button>
    </div>
  );
}
