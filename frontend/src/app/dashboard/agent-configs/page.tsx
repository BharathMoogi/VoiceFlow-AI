"use client";

import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  X,
  Volume2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { getAgentConfigs, createAgentConfig, updateAgentConfig, deleteAgentConfig, getUserInfo, type AgentConfig } from "@/lib/api";

const VOICE_OPTIONS = [
  { id: "josh", name: "Josh (Deep American Male - PlayHT)" },
  { id: "rachel", name: "Rachel (Warm Female - ElevenLabs)" },
  { id: "drew", name: "Drew (Conversational Male - PlayHT)" },
  { id: "serena", name: "Serena (Clear Female - PlayHT)" },
  { id: "paul", name: "Paul (Professional Male - ElevenLabs)" }
];

export default function AgentConfigsPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  // Editor modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form values
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [voiceId, setVoiceId] = useState("josh");
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState("en");

  // Status notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
    const stored = getUserInfo();
    setIsPro(stored.plan === "pro");
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await getAgentConfigs();
      setConfigs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load agent configurations");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setPrompt("");
    setVoiceId("josh");
    setTemperature(0.7);
    setLanguage("en");
    setError(null);
    setSuccess(null);
    setShowModal(true);
  };

  const handleOpenEdit = (config: AgentConfig) => {
    setEditingId(config.id);
    setName(config.name);
    setPrompt(config.prompt);
    setVoiceId(config.voice_id);
    setTemperature(Number(config.temperature));
    setLanguage(config.language || "en");
    setError(null);
    setSuccess(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !prompt) {
      setError("Name and System Prompt instructions are required.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        // Edit Mode
        const updated = await updateAgentConfig(editingId, name, prompt, voiceId, temperature, language);
        setConfigs((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        setSuccess("Configuration updated successfully!");
      } else {
        // Create Mode
        const created = await createAgentConfig(name, prompt, voiceId, temperature, language);
        setConfigs((prev) => [created, ...prev]);
        setSuccess("Configuration created successfully!");
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration? Any campaigns using it will have it cleared.")) return;
    setError(null);
    setSuccess(null);

    try {
      await deleteAgentConfig(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      setSuccess("Configuration deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete configuration");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-violet-400" />
            Voice Agent Configurations
          </h1>
          <p className="text-gray-400 text-sm">
            Configure prompt behaviors, system instructions, voices, and settings for AI callers.
          </p>
        </div>
        
        {!isPro && configs.length >= 1 ? (
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" disabled className="h-10 opacity-50 cursor-not-allowed">
              <Plus className="h-4 w-4 mr-2" />
              Create Config
            </Button>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">
              Free Tier Limit Reached
            </span>
          </div>
        ) : (
          <Button size="sm" onClick={handleOpenCreate} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Create Config
          </Button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Configurations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass rounded-xl">
          <div className="p-3 rounded-2xl bg-zinc-800/30 border border-white/[0.08]/50 mb-4 text-gray-500">
            <Sliders className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No configurations found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Create a voice configuration profile to define what your AI caller says and how it behaves.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <Card key={config.id} hoverEffect className="flex flex-col justify-between border border-white/[0.08] bg-zinc-900/20">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white truncate max-w-[180px]">{config.name}</h3>
                    <p className="text-[10px] text-gray-500 font-medium">Created: {config.created_at ? new Date(config.created_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-indigo-300 text-[10px] font-semibold">
                    <Volume2 className="h-3.5 w-3.5" />
                    {VOICE_OPTIONS.find(v => v.id === config.voice_id)?.name.split(' ')[0] || config.voice_id}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">System Prompt Instructions</span>
                  <p className="text-xs text-gray-400 line-clamp-4 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-900/60 leading-relaxed italic">
                    "{config.prompt}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span className="flex items-center gap-1">
                    Temp: 
                    <span className="font-semibold text-gray-300">{config.temperature}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    Lang: 
                    <span className="font-semibold text-gray-300 uppercase">{config.language || "en"}</span>
                  </span>
                  <span className="text-[10px] bg-[#1F2937] text-gray-400 py-0.5 px-1.5 rounded">Vapi Agent</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08]/40 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenEdit(config)}
                  className="h-8 !px-2.5 text-xs text-gray-400 hover:text-white"
                >
                  <Edit2 className="h-3 w-3 mr-1.5" />
                  Edit
                </Button>
                <button 
                  onClick={() => handleDelete(config.id)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                  title="Delete configuration"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">
                {editingId ? "Edit Configuration" : "New Agent Configuration"}
              </CardTitle>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <Input
                  label="Config Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Parent Outbound Campaign Agent"
                  disabled={submitting}
                />
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
                    System Instructions (Prompt) *
                    <span title="Describe who the AI agent is, their tone, goal, and the details of what they should communicate or ask.">
                      <HelpCircle className="h-3.5 w-3.5 text-gray-500 cursor-help" />
                    </span>
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g. You are school representative calling parents to remind them about parent-teacher meetings on Friday. Be warm, polite, and record if they will attend."
                    className="w-full min-h-[140px] rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 leading-relaxed"
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Voice Model</label>
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                      disabled={submitting}
                    >
                      {VOICE_OPTIONS.map((opt) => {
                        const isPremiumVoice = ["rachel", "paul"].includes(opt.id);
                        const isDisabled = isPremiumVoice && !isPro;
                        return (
                          <option key={opt.id} value={opt.id} disabled={isDisabled}>
                            {opt.name} {isDisabled ? " (Pro Only)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Agent Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                      disabled={submitting}
                    >
                      <option value="en">English (en)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="fr">French (fr)</option>
                      <option value="de">German (de)</option>
                      <option value="it">Italian (it)</option>
                      <option value="pt">Portuguese (pt)</option>
                      <option value="hi">Hindi (hi)</option>
                      <option value="ja">Japanese (ja)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5 flex justify-between">
                    <span>Creativity (Temp)</span>
                    <span className="text-violet-400 font-bold">{temperature}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 mt-2.5 cursor-ew-resize"
                    disabled={submitting}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Save Config
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
