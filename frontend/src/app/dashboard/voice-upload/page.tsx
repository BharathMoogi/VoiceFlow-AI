"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Mic, Square, FileAudio, CheckCircle,
  Loader2, Mail, Wand2, AlertCircle, RotateCcw, Save, Send, Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { saveEmailDraft, sendEmail } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Stage = "idle" | "recording" | "transcribing" | "generating" | "done" | "error";
const PIPELINE_STAGES: { key: Stage; label: string }[] = [
  { key: "recording",    label: "Recording"        },
  { key: "transcribing", label: "Transcribing"     },
  { key: "generating",   label: "Generating Email" },
  { key: "done",         label: "Complete"         },
];
const MAX_SECS   = 120;
const BARS       = 36;
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function callTranscribeAPI(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/speech/transcribe", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Transcription failed" }));
    throw new Error(err.detail || "Transcription failed");
  }
  const data = await res.json();
  return data.text || data.transcript || "";
}

async function callEmailAPI(prompt: string): Promise<{ subject: string; body: string }> {
  const res = await fetch("/api/email/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || err.detail || "Email generation failed");
  }
  return res.json();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceUploadPage() {
  // Pipeline state
  const [stage, setStage]           = useState<Stage>("idle");
  const [errorStage, setErrorStage] = useState<Stage | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText]     = useState("");   // interim from SpeechRecognition
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody]       = useState("");
  const [isSaved, setIsSaved]           = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending]       = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [sendSuccess, setSendSuccess]   = useState(false);
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [actionError, setActionError]   = useState<string | null>(null);

  const handleSaveDraft = async () => {
    setActionError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await saveEmailDraft({
        recipient: recipientEmail,
        subject: emailSubject,
        body: emailBody
      });
      setIsSaved(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) return;
    setActionError(null);
    setSendSuccess(false);
    setIsSending(true);
    try {
      await sendEmail({
        recipient: recipientEmail,
        subject: emailSubject,
        body: emailBody
      });
      setIsSaved(true);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  // File state
  const [audioFile, setAudioFile]   = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording state
  const [isRecording, setIsRecording]       = useState(false);
  const [recordingSecs, setRecordingSecs]   = useState(0);
  const [hasSpeechAPI, setHasSpeechAPI]     = useState(true);

  // Waveform
  const [barHeights, setBarHeights] = useState<number[]>(
    Array.from({ length: BARS }, (_, i) => 15 + (i % 6) * 7)
  );

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef   = useRef<any>(null);
  const finalRef         = useRef("");           // accumulated final transcript from SpeechRecognition
  const speechFailedRef  = useRef(false);        // true when SpeechRecognition hit "network"
  const mediaRecRef      = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const animRef          = useRef<number>(0);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    Promise.resolve().then(() => {
      setHasSpeechAPI(!!SR);
    });
    return () => teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Visualizer ───────────────────────────────────────────────────────────────
  const startViz = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      src.connect(an);
      analyserRef.current = an;
      const data = new Uint8Array(an.frequencyBinCount);
      const draw = () => {
        an.getByteFrequencyData(data);
        setBarHeights(Array.from({ length: BARS }, (_, i) => {
          const v = data[Math.floor((i / BARS) * data.length)] / 255;
          return Math.max(8, v * 100);
        }));
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch { /* no AudioContext */ }
  };

  function stopViz() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setBarHeights(Array.from({ length: BARS }, (_, i) => 15 + (i % 6) * 7));
  }

  function teardown() {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recognitionRef.current?.stop();
    stopViz();
  }

  // ── Email pipeline ────────────────────────────────────────────────────────────
  const runEmailPipeline = async (text: string) => {
    if (!text.trim()) {
      setErrorMsg("No speech was detected. Please speak clearly and try again.");
      setErrorStage("recording");
      setStage("error");
      return;
    }
    setTranscript(text);
    setStage("generating");
    try {
      const result = await callEmailAPI(text);
      setEmailSubject(result.subject || "");
      setEmailBody(result.body || "");
      setStage("done");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(err.message || "Email generation failed.");
      setErrorStage("generating");
      setStage("error");
    }
  };

  // ── File upload pipeline ──────────────────────────────────────────────────────
  const runFilePipeline = async (file: File) => {
    setAudioFile(file);
    setStage("transcribing");
    setErrorMsg(""); setErrorStage(null); setTranscript(""); setEmailSubject(""); setEmailBody("");
    setIsSaved(false); setLiveText("");
    setSendSuccess(false); setSaveSuccess(false); setActionError(null);
    finalRef.current = "";
    try {
      const text = await callTranscribeAPI(file);
      await runEmailPipeline(text);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(err.message || "Transcription failed.");
      setErrorStage("transcribing");
      setStage("error");
    }
  };

  // ── Live recording ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg(""); setLiveText(""); setTranscript("");
    setEmailSubject(""); setEmailBody(""); setIsSaved(false);
    setSendSuccess(false); setSaveSuccess(false); setActionError(null);
    finalRef.current = ""; speechFailedRef.current = false;
    audioChunksRef.current = [];

    // 1 — Get mic stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Allow mic access and try again."
          : err.message || "Could not access microphone."
      );
      setErrorStage("recording");
      setStage("error");
      return;
    }
    streamRef.current = stream;
    startViz(stream);

    // 2 — MediaRecorder (always runs — used as fallback if SpeechRecognition fails)
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    mediaRecRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(100);

    // 3 — SpeechRecognition (primary path)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous     = true;
      recognition.interimResults = true;
      recognition.lang           = "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        let final   = finalRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
            finalRef.current = final;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setLiveText(final + interim);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "network") {
          // Google's speech server unreachable — mark for fallback
          speechFailedRef.current = true;
          console.warn("SpeechRecognition network error — will fall back to Gemini API after recording stops.");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          console.error("SpeechRecognition error:", event.error);
        }
      };

      recognition.start();
    } else {
      speechFailedRef.current = true; // no SpeechRecognition → always use fallback
    }

    setIsRecording(true);
    setStage("recording");
    setRecordingSecs(0);

    timerRef.current = setInterval(() => {
      setRecordingSecs(s => {
        if (s + 1 >= MAX_SECS) { stopRecording(); return s; }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    recognitionRef.current?.stop();
    stopViz();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Stop MediaRecorder and wait for final chunk
    const rec = mediaRecRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = async () => {
        const capturedText = finalRef.current.trim() || liveText.trim();

        if (!speechFailedRef.current && capturedText) {
          // SpeechRecognition succeeded — use its text
          setStage("transcribing");
          setTimeout(() => runEmailPipeline(capturedText), 400);
        } else {
          // Fallback: send audio blob to Gemini transcription route
          setLiveText("");
          setStage("transcribing");
          try {
            const blob = new Blob(audioChunksRef.current, { type: rec.mimeType });
            if (blob.size === 0) {
              throw new Error("No audio was captured. Please try again.");
            }
            const file = new File([blob], `recording-${Date.now()}.webm`, { type: rec.mimeType });
            setAudioFile(file);
            const text = await callTranscribeAPI(file);
            await runEmailPipeline(text);
          } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setErrorMsg(err.message || "Transcription failed.");
            setErrorStage("transcribing");
            setStage("error");
          }
        }
      };
      rec.stop();
    } else {
      // MediaRecorder already stopped (shouldn't happen, but handle gracefully)
      const capturedText = finalRef.current.trim() || liveText.trim();
      setStage("transcribing");
      setTimeout(() => runEmailPipeline(capturedText), 400);
    }
  };

  const toggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runFilePipeline(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runFilePipeline(file);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    teardown();
    setStage("idle"); setErrorStage(null); setAudioFile(null); setTranscript(""); setLiveText("");
    setEmailSubject(""); setEmailBody(""); setErrorMsg(""); setIsSaved(false);
    setIsRecording(false); setRecordingSecs(0);
    setSendSuccess(false); setSaveSuccess(false); setActionError(null);
    finalRef.current = ""; audioChunksRef.current = [];
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const stageIdx      = PIPELINE_STAGES.findIndex(s => s.key === (stage === "error" ? errorStage : stage));
  const isProcessing  = ["transcribing", "generating"].includes(stage);
  const progress      = (recordingSecs / MAX_SECS) * 100;
  const displayText   = transcript || liveText;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Mic className="h-5 w-5 text-indigo-400" />
          Voice Upload &amp; Transcription
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Record your voice or upload an audio file — AI will transcribe it and write a polished email.
        </p>
      </div>

      {/* Stepper */}
      {stage !== "idle" && (
        <Card className="!p-5">
          <div className="flex items-center justify-between">
            {PIPELINE_STAGES.map((s, i) => {
              const isDone   = stage === "done" || (stageIdx > i);
              const isActive = stage !== "error" && stage !== "done" && PIPELINE_STAGES[stageIdx]?.key === s.key;
              const isErr    = stage === "error" && i === stageIdx;
              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isErr    ? "bg-red-500/20 border-red-500 text-red-400" :
                      isDone   ? "bg-emerald-500 border-emerald-500 text-white" :
                      isActive ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" :
                                 "border-zinc-700 bg-transparent text-zinc-600"
                    }`}>
                      {isErr    ? <AlertCircle className="h-4 w-4" /> :
                       isDone   ? <CheckCircle  className="h-4 w-4" /> :
                       isActive ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                  <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-xs font-medium ${
                      isErr ? "text-red-400" : isDone ? "text-emerald-400" : isActive ? "text-indigo-400" : "text-zinc-600"
                    }`}>{s.label}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-700 ${
                      stage === "done" || (stageIdx > i) ? "bg-emerald-500" : "bg-zinc-800"
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {stage === "error" && errorMsg && (
            <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}
        </Card>
      )}

      {/* Browser compat notice */}
      {!hasSpeechAPI && stage === "idle" && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Live recording works best in Chrome or Edge. Gemini AI will be used for transcription on other browsers.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT ── */}
        <div className="space-y-4">

          {/* Drop zone */}
          <Card className="!p-0 overflow-hidden">
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`relative p-8 text-center border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
                isDragging         ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]" :
                isProcessing || isRecording ? "border-zinc-700 opacity-50 pointer-events-none" :
                                   "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30"
              }`}
              onClick={() => !(isProcessing || isRecording) && fileInputRef.current?.click()}
              id="drag-drop-zone"
            >
              <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
                className="hidden" onChange={handleFileChange} id="file-upload-input" />
              <div className="flex flex-col items-center gap-4">
                <div className={`p-5 rounded-2xl transition-all duration-300 ${
                  isDragging ? "bg-indigo-500/20 border border-indigo-500/40" : "bg-zinc-900/60 border border-zinc-800"
                }`}>
                  <Upload className={`h-8 w-8 ${isDragging ? "text-indigo-400" : "text-zinc-500"}`} />
                </div>
                {audioFile ? (
                  <div>
                    <div className="flex items-center gap-2 justify-center">
                      <FileAudio className="h-4 w-4 text-indigo-400" />
                      <p className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">{audioFile.name}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{(audioFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">
                      {isDragging ? "Drop your audio file here" : "Drag & drop an audio file"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">or click to browse — WAV, MP3, M4A, OGG, WEBM, FLAC</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-medium">or record live</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Recorder */}
          <Card className="!p-5">
            <div className="flex flex-col items-center gap-4">

              {/* Waveform bars */}
              <div className="w-full flex items-end justify-center gap-px h-14 px-1">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all ${
                      isRecording
                        ? i % 2 === 0 ? "bg-gradient-to-t from-rose-700 to-rose-400" : "bg-gradient-to-t from-indigo-700 to-indigo-400"
                        : "bg-zinc-700"
                    }`}
                    style={{ height: `${h}%`, transitionDuration: isRecording ? "70ms" : "500ms" }}
                  />
                ))}
              </div>

              {/* Timer + progress */}
              {isRecording && (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-sm font-mono font-bold text-rose-400">{fmt(recordingSecs)}</span>
                      <span className="text-xs text-zinc-600">recording</span>
                    </div>
                    <span className="text-xs text-zinc-600">{fmt(MAX_SECS)} max</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Live transcript preview */}
              {isRecording && liveText && (
                <div className="w-full p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> Live transcript
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                    {liveText}
                    <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              )}

              {/* Record button */}
              <button
                id="record-btn"
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-40 disabled:pointer-events-none ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/30 scale-105 ring-4 ring-rose-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30 hover:scale-105"
                }`}
              >
                {isRecording
                  ? <><Square className="h-4 w-4" />Stop Recording</>
                  : <><Mic   className="h-4 w-4" />Start Recording</>}
              </button>

              <p className="text-xs text-zinc-600 text-center">
                {isRecording
                  ? "Click stop when done — auto-stops at 2 minutes"
                  : "Click to capture your voice (up to 2 minutes)"}
              </p>
            </div>
          </Card>

          {stage !== "idle" && (
            <Button variant="outline" onClick={handleReset} className="w-full" id="reset-btn">
              <RotateCcw className="h-4 w-4 mr-2" />Start Over
            </Button>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-4">

          {/* Transcript card */}
          {(stage === "recording" || stage === "transcribing" || stage === "generating" || stage === "done") && displayText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-indigo-400" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {displayText}
                  {stage === "recording" && (
                    <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
                {stage === "generating" && (
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />Generating email…
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shimmer (file transcribing with no text yet) */}
          {stage === "transcribing" && !displayText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-indigo-400" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[90, 75, 85, 60, 70].map((w, i) => (
                    <div key={i} className="shimmer rounded h-3" style={{ width: `${w}%` }} />
                  ))}
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />Transcribing audio…
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated email */}
          {stage === "done" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-400" />Generated Email
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {isSaved
                      ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-500 font-medium">Saved</span></>
                      : <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px] text-emerald-500 font-medium">Ready</span></>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Recipient (optional)</label>
                  <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                    type="email" placeholder="recipient@example.com"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    id="voice-recipient-email" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Subject</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    placeholder="Subject" id="voice-email-subject" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Body</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y font-mono leading-relaxed"
                    id="voice-email-body" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" id="voice-save-draft-btn"
                    onClick={handleSaveDraft} disabled={isSaving || isSaved}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    {isSaved ? "Draft Saved ✓" : "Save Draft"}
                  </Button>
                  <Button size="sm" className="flex-1" id="voice-send-btn"
                    disabled={isSending || !recipientEmail}
                    onClick={handleSendEmail}>
                    {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    {isSending ? "Sending…" : "Send Email"}
                  </Button>
                </div>
                {!recipientEmail && (
                  <p className="text-xs text-zinc-600 text-center">Add a recipient email to enable Send</p>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Draft saved successfully!
                  </div>
                )}
                {sendSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Email sent successfully!
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

          {/* Error output */}
          {stage === "error" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center gap-4">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Something went wrong</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">{errorMsg}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} id="error-retry-btn">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Try Again
              </Button>
            </div>
          )}

          {/* Idle / listening placeholder */}
          {(stage === "idle" || (stage === "recording" && !liveText)) && (
            <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed p-16 text-center transition-all ${
              stage === "recording" ? "border-rose-500/30 bg-rose-500/5" : "border-zinc-800"
            }`}>
              <div className={`p-5 rounded-2xl border mb-4 ${
                stage === "recording" ? "bg-rose-500/10 border-rose-500/20" : "bg-zinc-900/50 border-zinc-800"
              }`}>
                {stage === "recording"
                  ? <Mic className="h-8 w-8 text-rose-400 animate-pulse" />
                  : <Wand2 className="h-8 w-8 text-zinc-600" />}
              </div>
              <p className="text-sm font-semibold text-zinc-500">
                {stage === "recording" ? "Listening…" : "Output will appear here"}
              </p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">
                {stage === "recording"
                  ? "Speak clearly into your microphone"
                  : "Upload an audio file or start a recording on the left"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
