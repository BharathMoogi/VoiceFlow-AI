"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Languages,
  ArrowLeftRight,
  Copy,
  Check,
  Mic,
  MicOff,
  Trash2,
  Volume2,
  ChevronDown,
  Sparkles,
  Clock,
  X,
  Loader2,
  Star,
  StarOff,
  BookOpen,
  Zap,
  FileText,
  Share2,
} from "lucide-react";
import { translateText } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "auto", name: "Auto Detect", flag: "🌐" },
  { code: "en",   name: "English",     flag: "🇺🇸" },
  { code: "es",   name: "Spanish",     flag: "🇪🇸" },
  { code: "fr",   name: "French",      flag: "🇫🇷" },
  { code: "de",   name: "German",      flag: "🇩🇪" },
  { code: "it",   name: "Italian",     flag: "🇮🇹" },
  { code: "pt",   name: "Portuguese",  flag: "🇵🇹" },
  { code: "ru",   name: "Russian",     flag: "🇷🇺" },
  { code: "zh",   name: "Chinese",     flag: "🇨🇳" },
  { code: "ja",   name: "Japanese",    flag: "🇯🇵" },
  { code: "ko",   name: "Korean",      flag: "🇰🇷" },
  { code: "ar",   name: "Arabic",      flag: "🇸🇦" },
  { code: "hi",   name: "Hindi",       flag: "🇮🇳" },
  { code: "bn",   name: "Bengali",     flag: "🇧🇩" },
  { code: "tr",   name: "Turkish",     flag: "🇹🇷" },
  { code: "nl",   name: "Dutch",       flag: "🇳🇱" },
  { code: "pl",   name: "Polish",      flag: "🇵🇱" },
  { code: "sv",   name: "Swedish",     flag: "🇸🇪" },
  { code: "no",   name: "Norwegian",   flag: "🇳🇴" },
  { code: "da",   name: "Danish",      flag: "🇩🇰" },
  { code: "fi",   name: "Finnish",     flag: "🇫🇮" },
  { code: "cs",   name: "Czech",       flag: "🇨🇿" },
  { code: "sk",   name: "Slovak",      flag: "🇸🇰" },
  { code: "hu",   name: "Hungarian",   flag: "🇭🇺" },
  { code: "ro",   name: "Romanian",    flag: "🇷🇴" },
  { code: "uk",   name: "Ukrainian",   flag: "🇺🇦" },
  { code: "el",   name: "Greek",       flag: "🇬🇷" },
  { code: "he",   name: "Hebrew",      flag: "🇮🇱" },
  { code: "th",   name: "Thai",        flag: "🇹🇭" },
  { code: "vi",   name: "Vietnamese",  flag: "🇻🇳" },
  { code: "id",   name: "Indonesian",  flag: "🇮🇩" },
  { code: "ms",   name: "Malay",       flag: "🇲🇾" },
  { code: "tl",   name: "Filipino",    flag: "🇵🇭" },
  { code: "sw",   name: "Swahili",     flag: "🇰🇪" },
  { code: "fa",   name: "Persian",     flag: "🇮🇷" },
  { code: "ur",   name: "Urdu",        flag: "🇵🇰" },
  { code: "ta",   name: "Tamil",       flag: "🇮🇳" },
  { code: "te",   name: "Telugu",      flag: "🇮🇳" },
  { code: "mr",   name: "Marathi",     flag: "🇮🇳" },
  { code: "gu",   name: "Gujarati",    flag: "🇮🇳" },
  { code: "pa",   name: "Punjabi",     flag: "🇮🇳" },
  { code: "ca",   name: "Catalan",     flag: "🇪🇸" },
  { code: "hr",   name: "Croatian",    flag: "🇭🇷" },
  { code: "sr",   name: "Serbian",     flag: "🇷🇸" },
  { code: "bg",   name: "Bulgarian",   flag: "🇧🇬" },
  { code: "lt",   name: "Lithuanian",  flag: "🇱🇹" },
  { code: "lv",   name: "Latvian",     flag: "🇱🇻" },
  { code: "et",   name: "Estonian",    flag: "🇪🇪" },
  { code: "af",   name: "Afrikaans",   flag: "🇿🇦" },
];

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== "auto");

const TONES = [
  { value: "formal",      label: "Formal",      emoji: "🎩" },
  { value: "casual",      label: "Casual",      emoji: "😊" },
  { value: "professional",label: "Professional", emoji: "💼" },
  { value: "friendly",    label: "Friendly",    emoji: "🤝" },
  { value: "literal",     label: "Literal",     emoji: "📖" },
];

const QUICK_PHRASES = [
  "Hello, how are you?",
  "Thank you very much!",
  "Where is the nearest hospital?",
  "I need help please.",
  "What is the price?",
  "Can you speak more slowly?",
  "I don't understand.",
  "Have a great day!",
];

interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  tone: string;
  timestamp: number;
  starred: boolean;
}

function getLangInfo(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? { code, name: code, flag: "🌐" };
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function sentenceCount(text: string) {
  return text.trim() ? (text.match(/[.!?]+/g) || []).length || 1 : 0;
}

// ─── Language Dropdown ────────────────────────────────────────────────────────
function LangDropdown({
  value, onChange, options, id,
}: {
  value: string;
  onChange: (code: string) => void;
  options: typeof LANGUAGES;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );
  const selected = options.find((l) => l.code === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm font-medium text-white hover:bg-white/[0.09] hover:border-violet-500/30 transition-all duration-200 min-w-[170px]"
      >
        <span className="text-base leading-none">{selected?.flag}</span>
        <span className="truncate flex-1 text-left">{selected?.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 w-[230px] bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <input
              autoFocus type="text" placeholder="Search…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filtered.map((lang) => (
              <button key={lang.code}
                onClick={() => { onChange(lang.code); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${lang.code === value ? "bg-violet-600/20 text-violet-300" : "text-gray-300 hover:bg-white/[0.05] hover:text-white"}`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.name}</span>
                <span className="text-[10px] text-gray-600 font-mono uppercase">{lang.code}</span>
                {lang.code === value && <Check className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tone Selector ────────────────────────────────────────────────────────────
function ToneSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TONES.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          title={t.label}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 ${
            value === t.value
              ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
              : "bg-white/[0.03] text-gray-500 border-white/[0.05] hover:text-gray-300 hover:bg-white/[0.06]"
          }`}
        >
          <span>{t.emoji}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Live Voice Input (Web Speech API) ───────────────────────────────────────
function useLiveSpeech(lang: string, onInterim: (t: string) => void, onFinal: (t: string) => void) {
  const recognitionRef = useRef<unknown>(null);
  const [active, setActive] = useState(false);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang === "auto" ? "en-US" : lang;
    r.continuous = true;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (interim) onInterim(interim);
      if (final) onFinal(final);
    };
    r.onerror = () => setActive(false);
    r.onend = () => setActive(false);
    r.start();
    recognitionRef.current = r;
    setActive(true);
  }, [lang, onInterim, onFinal]);

  const stop = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognitionRef.current as any)?.stop();
    setActive(false);
  }, []);

  return { active, start, stop };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TranslatorPage() {
  const [sourceText, setSourceText]     = useState("");
  const [interimText, setInterimText]   = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang]     = useState("auto");
  const [targetLang, setTargetLang]     = useState("es");
  const [tone, setTone]                 = useState("formal");
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [history, setHistory]           = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab]       = useState<"translate" | "history" | "phrases">("translate");
  const [swapAnimating, setSwapAnimating] = useState(false);
  const [showStats, setShowStats]       = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_CHARS = 5000;

  // Load history
  useEffect(() => {
    try {
      const s = localStorage.getItem("translator_history_v2");
      if (s) setHistory(JSON.parse(s));
    } catch {}
  }, []);

  const persistHistory = useCallback((items: HistoryItem[]) => {
    try { localStorage.setItem("translator_history_v2", JSON.stringify(items)); } catch {}
  }, []);

  const saveHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 20);
      persistHistory(updated);
      return updated;
    });
  }, [persistHistory]);

  // ── Voice input ─────────────────────────────────────────────────────────────
  const handleInterim = useCallback((t: string) => setInterimText(t), []);
  const handleFinal   = useCallback((t: string) => {
    setSourceText((prev) => (prev + (prev ? " " : "") + t).slice(0, MAX_CHARS));
    setInterimText("");
  }, []);
  const { active: isRecording, start: startMic, stop: stopMic } = useLiveSpeech(sourceLang, handleInterim, handleFinal);

  const handleMic = () => {
    if (isRecording) { stopMic(); setInterimText(""); }
    else startMic();
  };

  // ── Translate ───────────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async (text: string, src: string, tgt: string, t: string) => {
    if (!text.trim()) { setTranslatedText(""); setDetectedLang(null); return; }
    setIsTranslating(true);
    setError(null);
    try {
      // Inject tone into the text prompt via a wrapper hint
      const toneHint = t !== "literal" ? ` [Translate in a ${t} tone]` : "";
      const res = await translateText(text + toneHint, src, tgt);
      setTranslatedText(res.translated_text);
      setDetectedLang(res.detected_language ?? null);
      saveHistory({
        id: Date.now().toString(),
        sourceText: text,
        translatedText: res.translated_text,
        sourceLang: src,
        targetLang: tgt,
        tone: t,
        timestamp: Date.now(),
        starred: false,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  }, [saveHistory]);

  // Debounced auto-translate
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!sourceText.trim()) { setTranslatedText(""); setDetectedLang(null); return; }
    debounceRef.current = setTimeout(() => handleTranslate(sourceText, sourceLang, targetLang, tone), 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sourceText, sourceLang, targetLang, tone, handleTranslate]);

  // ── Swap ────────────────────────────────────────────────────────────────────
  const handleSwap = () => {
    if (sourceLang === "auto") return;
    setSwapAnimating(true);
    setTimeout(() => setSwapAnimating(false), 400);
    const [ps, pt, ptx] = [sourceLang, targetLang, translatedText];
    setSourceLang(pt); setTargetLang(ps);
    setSourceText(ptx); setTranslatedText("");
  };

  // ── Copy ────────────────────────────────────────────────────────────────────
  const handleCopy = async (text: string, which: "source" | "output") => {
    await navigator.clipboard.writeText(text);
    if (which === "source") { setCopiedSource(true); setTimeout(() => setCopiedSource(false), 2000); }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const handleSpeak = (text: string, lang: string) => {
    if (!text || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === "auto" ? "en" : lang;
    window.speechSynthesis.speak(utt);
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = `[${getLangInfo(sourceLang).name}] ${sourceText}\n\n[${getLangInfo(targetLang).name}] ${translatedText}`;
    if (navigator.share) {
      await navigator.share({ title: "Translation", text });
    } else {
      await navigator.clipboard.writeText(text);
      setError("Copied to clipboard (sharing not supported on this browser).");
    }
  };

  // ── Star history item ────────────────────────────────────────────────────────
  const toggleStar = (id: string) => {
    setHistory((prev) => {
      const updated = prev.map((h) => h.id === id ? { ...h, starred: !h.starred } : h);
      persistHistory(updated);
      return updated;
    });
  };

  const charCount = sourceText.length;
  const wCount    = wordCount(sourceText);
  const sCount    = sentenceCount(sourceText);
  const starredCount = history.filter((h) => h.starred).length;

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }
        .voice-ring { animation: voiceRing 1.2s ease-in-out infinite; }
        @keyframes voiceRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .shimmer-line {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="flex flex-col gap-5 p-6 min-h-screen" style={{ background: "var(--background)" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 blur-md opacity-50" />
              <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg">
                <Languages className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Translator</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="h-3 w-3 text-violet-400" />
                GPT-4o · 50+ languages · Live voice · Tone control
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
            {[
              { key: "translate", icon: Languages,  label: "Translate" },
              { key: "history",   icon: Clock,       label: `History${history.length ? ` (${history.length})` : ""}` },
              { key: "phrases",   icon: BookOpen,    label: "Phrases" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                id={`tab-${key}`}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === key
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === "history" && starredCount > 0 && (
                  <span className="h-3.5 w-3.5 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">
                    {starredCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm fade-in">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-300 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: TRANSLATE */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "translate" && (
          <div className="flex flex-col gap-4 fade-in">
            {/* Tone + Stats row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 font-medium mr-1">Tone:</span>
                <ToneSelector value={tone} onChange={setTone} />
              </div>
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors self-start sm:self-auto"
              >
                <FileText className="h-3.5 w-3.5" />
                {showStats ? "Hide" : "Show"} stats
              </button>
            </div>

            {/* Text stats */}
            {showStats && sourceText && (
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs text-gray-500 fade-in">
                <span><span className="text-gray-300 font-semibold">{charCount}</span> chars</span>
                <span className="text-gray-700">·</span>
                <span><span className="text-gray-300 font-semibold">{wCount}</span> words</span>
                <span className="text-gray-700">·</span>
                <span><span className="text-gray-300 font-semibold">{sCount}</span> sentence{sCount !== 1 ? "s" : ""}</span>
                {detectedLang && sourceLang === "auto" && (
                  <>
                    <span className="text-gray-700">·</span>
                    <span>Detected: <span className="text-violet-400 font-semibold">{getLangInfo(detectedLang).name}</span></span>
                  </>
                )}
              </div>
            )}

            {/* Main panels */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_56px_1fr] gap-3 items-start">
              {/* ── Source Panel ─────────────────────────────────────────── */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden shadow-xl flex flex-col" style={{ minHeight: 340 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-2 flex-wrap">
                  <LangDropdown id="source-lang-select" value={sourceLang} onChange={setSourceLang} options={LANGUAGES} />
                  {detectedLang && sourceLang === "auto" && (
                    <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                      {getLangInfo(detectedLang).flag} {getLangInfo(detectedLang).name}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Live mic */}
                    <button id="mic-btn" onClick={handleMic}
                      title={isRecording ? "Stop recording" : "Start voice input"}
                      className={`p-1.5 rounded-lg transition-all duration-200 ${isRecording ? "text-red-400 bg-red-500/10 voice-ring" : "text-gray-500 hover:text-violet-400 hover:bg-violet-500/10"}`}
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleSpeak(sourceText, sourceLang)} title="Listen" disabled={!sourceText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleCopy(sourceText, "source")} title="Copy source" disabled={!sourceText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      {copiedSource ? <Check className="h-4 w-4 text-blue-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button onClick={() => { setSourceText(""); setTranslatedText(""); setDetectedLang(null); setInterimText(""); }} title="Clear" disabled={!sourceText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 flex flex-col">
                  <textarea
                    id="source-text-input"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value.slice(0, MAX_CHARS))}
                    placeholder={isRecording ? "Listening… speak now" : "Enter text to translate…"}
                    className="flex-1 w-full resize-none bg-transparent px-4 py-4 text-white placeholder-gray-600 text-sm leading-relaxed focus:outline-none"
                    style={{ minHeight: 220 }}
                  />
                  {/* Interim voice text overlay */}
                  {isRecording && interimText && (
                    <div className="absolute bottom-12 left-4 right-4 px-3 py-2 bg-violet-900/30 border border-violet-500/20 rounded-xl text-xs text-violet-300 italic">
                      {interimText}
                    </div>
                  )}
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="flex items-center gap-2 px-4 pb-2">
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-xs text-red-400">Recording…</span>
                    </div>
                  )}
                  <div className={`px-4 pb-3 text-xs text-right transition-colors ${charCount > MAX_CHARS * 0.9 ? "text-amber-400" : "text-gray-700"}`}>
                    {charCount}/{MAX_CHARS}
                  </div>
                </div>
              </div>

              {/* ── Swap column ──────────────────────────────────────────── */}
              <div className="flex flex-col items-center justify-center gap-2 lg:pt-14">
                <button
                  id="swap-lang-btn"
                  onClick={handleSwap}
                  disabled={sourceLang === "auto"}
                  title={sourceLang === "auto" ? "Cannot swap with Auto Detect" : "Swap languages"}
                  className={`flex items-center justify-center h-11 w-11 rounded-2xl border transition-all duration-300 shadow-lg
                    ${sourceLang === "auto"
                      ? "border-white/[0.05] bg-white/[0.03] text-gray-700 cursor-not-allowed"
                      : "border-violet-500/30 bg-violet-600/10 text-violet-400 hover:bg-violet-600/20 hover:border-violet-500/50 hover:shadow-violet-500/20 hover:shadow-xl"
                    } ${swapAnimating ? "scale-90 rotate-180" : "scale-100"}`}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              {/* ── Output Panel ─────────────────────────────────────────── */}
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden shadow-xl flex flex-col" style={{ minHeight: 340 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-2 flex-wrap">
                  <LangDropdown id="target-lang-select" value={targetLang} onChange={setTargetLang} options={TARGET_LANGUAGES} />
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => handleSpeak(translatedText, targetLang)} title="Listen" disabled={!translatedText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button id="copy-translation-btn" onClick={() => handleCopy(translatedText, "output")} title="Copy translation" disabled={!translatedText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button onClick={handleShare} title="Share translation" disabled={!translatedText}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 px-4 py-4" style={{ minHeight: 220 }}>
                  {isTranslating ? (
                    <div className="flex flex-col gap-3">
                      {[85, 70, 90, 55, 75].map((w, i) => (
                        <div key={i} className={`h-3.5 rounded-full shimmer-line`} style={{ width: `${w}%` }} />
                      ))}
                      <div className="absolute top-4 right-4">
                        <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
                      </div>
                    </div>
                  ) : translatedText ? (
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap fade-in">{translatedText}</p>
                  ) : (
                    <p className="text-gray-600 text-sm">Translation will appear here…</p>
                  )}
                </div>

                <div className="px-4 pb-4 flex gap-2">
                  <button
                    id="translate-btn"
                    onClick={() => handleTranslate(sourceText, sourceLang, targetLang, tone)}
                    disabled={!sourceText.trim() || isTranslating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/20"
                  >
                    {isTranslating
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Translating…</>
                      : <><Languages className="h-4 w-4" />Translate</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: HISTORY */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden shadow-xl fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Translation History</h2>
                <span className="text-xs text-gray-600">({history.length})</span>
                {starredCount > 0 && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    ⭐ {starredCount} starred
                  </span>
                )}
              </div>
              {history.length > 0 && (
                <button id="clear-history-btn"
                  onClick={() => { setHistory([]); persistHistory([]); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-600">
                <Clock className="h-10 w-10 opacity-20" />
                <p className="text-sm">No translations yet. Start translating!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto custom-scrollbar">
                {history.map((item) => (
                  <div key={item.id} className="group flex gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    {/* Star */}
                    <button onClick={() => toggleStar(item.id)} title="Star this translation"
                      className="flex-shrink-0 mt-0.5 text-gray-600 hover:text-amber-400 transition-colors">
                      {item.starred ? <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> : <StarOff className="h-4 w-4" />}
                    </button>

                    {/* Content — click to restore */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                      setSourceText(item.sourceText);
                      setSourceLang(item.sourceLang);
                      setTargetLang(item.targetLang);
                      setTranslatedText(item.translatedText);
                      setTone(item.tone);
                      setActiveTab("translate");
                    }}>
                      <p className="text-sm text-gray-300 truncate">{item.sourceText}</p>
                      <p className="text-sm text-violet-300 truncate mt-1">{item.translatedText}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-gray-600">
                          {getLangInfo(item.sourceLang).flag} {getLangInfo(item.sourceLang).name}
                          {" → "}
                          {getLangInfo(item.targetLang).flag} {getLangInfo(item.targetLang).name}
                        </span>
                        <span className="text-gray-700">·</span>
                        <span className="text-[10px] text-gray-600">
                          {TONES.find(t => t.value === item.tone)?.emoji} {item.tone}
                        </span>
                        <span className="text-gray-700">·</span>
                        <span className="text-[10px] text-gray-700">
                          {new Date(item.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Delete single */}
                    <button
                      onClick={() => { const u = history.filter(h => h.id !== item.id); setHistory(u); persistHistory(u); }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all duration-150 mt-0.5">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB: QUICK PHRASES */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "phrases" && (
          <div className="fade-in">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1117] overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
                <BookOpen className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Quick Phrases</h2>
                <span className="text-xs text-gray-600">— click to translate instantly</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PHRASES.map((phrase) => (
                  <button key={phrase}
                    onClick={() => {
                      setSourceText(phrase);
                      setActiveTab("translate");
                    }}
                    className="group flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-left hover:bg-violet-600/10 hover:border-violet-500/25 transition-all duration-200"
                  >
                    <span className="h-5 w-5 rounded-full bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-violet-600/30 transition-colors">
                      <Languages className="h-2.5 w-2.5 text-violet-400" />
                    </span>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{phrase}</span>
                  </button>
                ))}
              </div>

              {/* Target language selector for quick phrases */}
              <div className="flex items-center gap-3 px-5 py-4 border-t border-white/[0.06]">
                <span className="text-xs text-gray-500">Translate into:</span>
                <LangDropdown id="phrases-target-lang" value={targetLang} onChange={setTargetLang} options={TARGET_LANGUAGES} />
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
