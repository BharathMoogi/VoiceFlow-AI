"use client";

import React, { useState } from "react";
import {
  Zap,
  Copy,
  Check,
  Mail,
  Send,
  Save,
  RefreshCw,
  Sparkles,
  ChevronDown,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input, TextArea } from "@/components/UI/Input";
import { generateEmail, saveEmailDraft, sendEmail } from "@/lib/api";

const templates = [
  { label: "Follow-up Email", prompt: "Write a professional follow-up email after a business meeting with action items." },
  { label: "Job Application", prompt: "Write a compelling job application cover letter for a software engineer position." },
  { label: "Out of Office", prompt: "Write an out of office auto-reply for a two-week vacation starting next Monday." },
  { label: "Project Update", prompt: "Write a concise project status update email summarizing progress and upcoming milestones." },
  { label: "Thank You", prompt: "Write a warm and professional thank you email after a successful product demo." },
  { label: "Cold Outreach", prompt: "Write a personalized cold outreach email to a potential B2B client in the SaaS space." },
];

interface GeneratedEmail {
  subject: string;
  body: string;
}

export default function EmailGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [copiedField, setCopiedField] = useState<"subject" | "body" | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedEmail(null);
    setActionError(null);
    try {
      const result = await generateEmail(prompt);
      setGeneratedEmail(result);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to generate email");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (field: "subject" | "body") => {
    if (!generatedEmail) return;
    navigator.clipboard.writeText(
      field === "subject" ? generatedEmail.subject : generatedEmail.body
    );
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveDraft = async () => {
    if (!generatedEmail) return;
    setActionError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await saveEmailDraft({
        recipient: recipient,
        subject: generatedEmail.subject,
        body: generatedEmail.body
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!generatedEmail || !recipient) return;
    setActionError(null);
    setSendSuccess(false);
    setIsSending(true);
    try {
      await sendEmail({
        recipient: recipient,
        subject: generatedEmail.subject,
        body: generatedEmail.body
      });
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedEmail(null);
    handleGenerate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-400" />
          AI Email Generator
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Describe your email, and let Gemini AI craft a professional draft instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Input panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Compose Request
              </CardTitle>
              <CardDescription>Tell the AI what kind of email you need</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template picker */}
              <div>
                <button
                  id="template-picker-btn"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Use a template</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
                </button>
                {showTemplates && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {templates.map((t) => (
                      <button
                        key={t.label}
                        id={`template-${t.label.toLowerCase().replace(/\s/g, "-")}`}
                        onClick={() => {
                          setPrompt(t.prompt);
                          setShowTemplates(false);
                        }}
                        className="text-left px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <TextArea
                label="Describe your email"
                id="email-prompt"
                placeholder="e.g. Write a follow-up email to my client after our product demo. Include next steps and offer a free trial."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Recipient (optional)"
                  id="email-recipient"
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <div className="flex flex-col space-y-1">
                  <label htmlFor="email-tone" className="text-xs font-semibold text-zinc-400">
                    Tone
                  </label>
                  <select
                    id="email-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="persuasive">Persuasive</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!prompt.trim() || isGenerating}
                className="w-full"
                id="generate-email-btn"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate with Gemini AI
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="!p-4 border-indigo-500/10">
            <div className="flex gap-3">
              <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-300 mb-1">Tips for better results</p>
                <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                  <li>Include context: who you're writing to and why</li>
                  <li>Mention any specific points or action items</li>
                  <li>Choose the right tone to match your relationship</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Generated email output */}
        <div className="space-y-4">
          {isGenerating && (
            <Card className="space-y-4">
              <CardHeader>
                <div className="h-4 w-32 shimmer rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-10 shimmer rounded-lg" />
                <div className="space-y-2">
                  {[100, 90, 95, 80, 85].map((w, i) => (
                    <div key={i} className="shimmer rounded h-3" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  {[88, 75, 92].map((w, i) => (
                    <div key={i} className="shimmer rounded h-3" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {generatedEmail && !isGenerating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4 text-emerald-400" />
                      Generated Email
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <CardDescription className="text-emerald-500/70 text-[11px]">
                        Ready to send
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    id="regenerate-btn"
                    className="text-zinc-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject line */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400">Subject</label>
                    <button
                      id="copy-subject-btn"
                      onClick={() => handleCopy("subject")}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {copiedField === "subject" ? (
                        <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      ) : (
                        <><Copy className="h-3 w-3" /><span>Copy</span></>
                      )}
                    </button>
                  </div>
                  <input
                    value={generatedEmail.subject}
                    onChange={(e) =>
                      setGeneratedEmail({ ...generatedEmail, subject: e.target.value })
                    }
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    id="generated-subject"
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400">Body</label>
                    <button
                      id="copy-body-btn"
                      onClick={() => handleCopy("body")}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {copiedField === "body" ? (
                        <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      ) : (
                        <><Copy className="h-3 w-3" /><span>Copy</span></>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={generatedEmail.body}
                    onChange={(e) =>
                      setGeneratedEmail({ ...generatedEmail, body: e.target.value })
                    }
                    rows={12}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y font-mono leading-relaxed"
                    id="generated-body"
                  />
                </div>

                 {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    id="save-draft-btn"
                    className="flex-1"
                    disabled={isSaving || isGenerating}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : saveSuccess ? (
                      <><Check className="h-4 w-4 mr-2 text-emerald-400" />Saved!</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" />Save Draft</>
                    )}
                  </Button>
                  <Button
                    onClick={handleSend}
                    id="send-email-btn"
                    className="flex-1"
                    disabled={isSending || isGenerating}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : sendSuccess ? (
                      <><Check className="h-4 w-4 mr-2" />Sent!</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />Send via SMTP</>
                    )}
                  </Button>
                </div>

                {!recipient && (
                  <p className="text-xs text-zinc-600 text-center">Add a recipient email to enable Send</p>
                )}

                {sendSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Check className="h-4 w-4" />
                    Email sent successfully!
                  </div>
                )}

                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Check className="h-4 w-4" />
                    Draft saved successfully!
                  </div>
                )}

                {actionError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {actionError}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!generatedEmail && !isGenerating && (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-16 text-center">
              <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4">
                <Mail className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-400">Your email will appear here</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">
                Fill in the prompt on the left and click Generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
