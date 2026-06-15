"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  Upload,
  Mic,
  Square,
  FileAudio,
  CheckCircle,
  X,
  Loader2,
  Mail,
  Wand2,
  AlertCircle,
  RotateCcw,
  Save,
  Send,
  Volume2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { generateEmail } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Stage = "idle" | "recording" | "transcribing" | "generating" | "done" | "error";

const PIPELINE_STAGES: { key: Stage; label: string }[] = [
  { key: "recording",    label: "Recording"       },
  { key: "transcribing", label: "Transcribing"    },
  { key: "generating",   label: "Generating Email"},
  { key: "done",         label: "Complete"        },
];

const MAX_RECORDING_SECONDS = 120;
const WAVEFORM_BARS = 36;
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ── Web Speech API types ───────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceUploadPage() {
  // Pipeline
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState(""); // interim during recording
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  // File upload
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  // Waveform
  const [barHeights, setBarHeights] = useState<number[]>(
    Array.from({ length: WAVEFORM_BARS }, (_, i) => 15 + (i % 6) * 7)
  );

  // Refs
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect speech recognition support on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasSpeechSupport(!!SR);
    return () => stopEverything();
  }, []);

  // ── Visualizer ───────────────────────────────────────────────────────────────
  const startVisualizer = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        setBarHeights(
          Array.from({ length: WAVEFORM_BARS }, (_, i) => {
            const idx = Math.floor((i / WAVEFORM_BARS) * data.length);
            return Math.max(8, (data[idx] / 255) * 100);
          })
        );
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch { /* no AudioContext */ }
  };

  const stopVisualizer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setBarHeights(Array.from({ length: WAVEFORM_BARS }, (_, i) => 15 + (i % 6) * 7));
  };

  const stopEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    recognitionRef.current?.stop();
    stopVisualizer();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  // ── Pipeline: transcript → email ─────────────────────────────────────────────
  const runEmailPipeline = async (text: string) => {
    if (!text.trim()) {
      setErrorMsg("No speech was detected. Please speak clearly and try again.");
      setStage("error");
      return;
    }
    setTranscript(text);
    setStage("generating");
    try {
      const result = await generateEmail(text);
      setEmailSubject(result.subject || "");
      setEmailBody(result.body || "");
      setStage("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Email generation failed. Please try again.");
      setStage("error");
    }
  };

  // ── File upload pipeline ──────────────────────────────────────────────────────
  const runFilePipeline = async (file: File) => {
    setAudioFile(file);
    setStage("transcribing");
    setErrorMsg("");
    setTranscript("");
    setEmailSubject("");
    setEmailBody("");
    setIsSaved(false);
    setLiveTranscript("");
    finalTranscriptRef.current = "";

    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/speech/transcribe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Transcription failed" }));
        throw new Error(err.detail || "Transcription failed");
      }
      const data = await res.json();
      const text = data.text || data.transcript || "";
      await runEmailPipeline(text);
    } catch (err: any) {
      setErrorMsg(err.message || "Transcription failed. Please try again.");
      setStage("error");
    }
  };

  // ── Live recording with SpeechRecognition ─────────────────────────────────────
  const startRecording = async () => {
    setErrorMsg("");
    setLiveTranscript("");
    setTranscript("");
    setEmailSubject("");
    setEmailBody("");
    setIsSaved(false);
    finalTranscriptRef.current = "";

    // Get mic stream for visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      startVisualizer(stream);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setErrorMsg("Microphone access denied. Allow mic access in your browser and try again.");
        setStage("error");
      } else {
        setErrorMsg(err.message || "Could not access microphone.");
        setStage("error");
      }
      return;
    }

    // Start Web Speech API recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("Your browser doesn't support speech recognition. Try Chrome or Edge.");
      setStage("error");
      stopEverything();
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = finalTranscriptRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
          finalTranscriptRef.current = final;
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(final + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("SpeechRecognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Recognition ended (user stopped or timed out)
      // Don't auto-process here — we do it in stopRecording
    };

    recognition.start();
    setIsRecording(true);
    setStage("recording");
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => {
        if (s + 1 >= MAX_RECORDING_SECONDS) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    recognitionRef.current?.stop();
    stopVisualizer();
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;

    // Move to transcribing→generating with the captured text
    const captured = finalTranscriptRef.current.trim() || liveTranscript.trim();
    setStage("transcribing");
    // Brief "transcribing" display then go straight to generating
    setTimeout(() => runEmailPipeline(captured), 600);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runFilePipeline(file);
  }, []);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runFilePipeline(file);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    stopEverything();
    setStage("idle");
    setAudioFile(null);
    setTranscript("");
    setLiveTranscript("");
    setEmailSubject("");
    setEmailBody("");
    setErrorMsg("");
    setIsSaved(false);
    setIsRecording(false);
    setRecordingSeconds(0);
    finalTranscriptRef.current = "";
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.key === stage);
  const isProcessing = ["transcribing", "generating"].includes(stage);
  const progress = (recordingSeconds / MAX_RECORDING_SECONDS) * 100;
  const displayTranscript = transcript || liveTranscript;

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

      {/* Progress Stepper */}
      {stage !== "idle" && (
        <Card className="!p-5">
          <div className="flex items-center justify-between">
            {PIPELINE_STAGES.map((s, i) => {
              const isDone =
                stage === "done" ||
                (stage !== "error" && currentStageIndex > i);
              const isActive =
                stage !== "error" && stage !== "done" &&
                PIPELINE_STAGES[currentStageIndex]?.key === s.key;
              const isErr =
                stage === "error" && PIPELINE_STAGES[Math.max(0, currentStageIndex)]?.key === s.key;

              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-2 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isErr   ? "bg-red-500/20 border-red-500 text-red-400" :
                      isDone  ? "bg-emerald-500 border-emerald-500 text-white" :
                      isActive? "border-indigo-500 bg-indigo-500/10 text-indigo-400" :
                               "border-zinc-700 bg-transparent text-zinc-600"
                    }`}>
                      {isErr   ? <AlertCircle className="h-4 w-4" /> :
                       isDone  ? <CheckCircle  className="h-4 w-4" /> :
                       isActive? <Loader2 className="h-4 w-4 animate-spin" /> :
                                 <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-xs font-medium text-center ${
                      isErr   ? "text-red-400"     :
                      isDone  ? "text-emerald-400" :
                      isActive? "text-indigo-400"  : "text-zinc-600"
                    }`}>{s.label}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-700 ${
                      stage === "done" || (stage !== "error" && currentStageIndex > i)
                        ? "bg-emerald-500" : "bg-zinc-800"
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

      {/* Browser support warning */}
      {!hasSpeechSupport && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Live recording requires Chrome or Edge. You can still upload audio files below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Upload + Record ── */}
        <div className="space-y-4">

          {/* Drag & Drop */}
          <Card className="!p-0 overflow-hidden">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative p-8 text-center border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                  : isProcessing || isRecording
                  ? "border-zinc-700 opacity-50 pointer-events-none"
                  : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30"
              }`}
              onClick={() => !(isProcessing || isRecording) && fileInputRef.current?.click()}
              id="drag-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
                className="hidden"
                onChange={handleFileChange}
                id="file-upload-input"
              />
              <div className="flex flex-col items-center gap-4">
                <div className={`p-5 rounded-2xl transition-all duration-300 ${
                  isDragging
                    ? "bg-indigo-500/20 border border-indigo-500/40"
                    : "bg-zinc-900/60 border border-zinc-800"
                }`}>
                  <Upload className={`h-8 w-8 transition-colors ${isDragging ? "text-indigo-400" : "text-zinc-500"}`} />
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

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-medium">or record live</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Recorder */}
          <Card className="!p-5">
            <div className="flex flex-col items-center gap-4">

              {/* Waveform */}
              <div className="w-full flex items-end justify-center gap-px h-14 px-1">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all ${
                      isRecording
                        ? i % 2 === 0
                          ? "bg-gradient-to-t from-rose-700 to-rose-400"
                          : "bg-gradient-to-t from-indigo-700 to-indigo-400"
                        : "bg-zinc-700"
                    }`}
                    style={{
                      height: `${h}%`,
                      transitionDuration: isRecording ? "70ms" : "500ms",
                    }}
                  />
                ))}
              </div>

              {/* Timer + progress */}
              {isRecording && (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-sm font-mono font-bold text-rose-400">{fmt(recordingSeconds)}</span>
                      <span className="text-xs text-zinc-600">recording</span>
                    </div>
                    <span className="text-xs text-zinc-600">{fmt(MAX_RECORDING_SECONDS)} max</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live transcript preview during recording */}
              {isRecording && liveTranscript && (
                <div className="w-full p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> Live transcript
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                    {liveTranscript}
                    <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              )}

              {/* Record button */}
              <button
                id="record-btn"
                onClick={toggleRecording}
                disabled={isProcessing || !hasSpeechSupport}
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
                  : hasSpeechSupport
                  ? "Click to capture your voice (up to 2 minutes)"
                  : "Use Chrome or Edge for live recording"}
              </p>
            </div>
          </Card>

          {/* Reset */}
          {stage !== "idle" && (
            <Button variant="outline" onClick={handleReset} className="w-full" id="reset-btn">
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-4">

          {/* Live / final transcript */}
          {(stage === "recording" || stage === "transcribing" || stage === "generating" || stage === "done") && displayTranscript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-indigo-400" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {displayTranscript}
                  {stage === "recording" && (
                    <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
                {stage === "generating" && (
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating email from transcript…
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transcribing shimmer (file uploads) */}
          {stage === "transcribing" && !displayTranscript && (
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
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Transcribing audio…
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
                    <Mail className="h-4 w-4 text-emerald-400" />
                    Generated Email
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {isSaved
                      ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-500 font-medium">Saved</span></>
                      : <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px] text-emerald-500 font-medium">Ready</span></>
                    }
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Recipient (optional)</label>
                  <input
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    type="email"
                    placeholder="recipient@example.com"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    id="voice-recipient-email"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    placeholder="Subject"
                    id="voice-email-subject"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y font-mono leading-relaxed"
                    id="voice-email-body"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    id="voice-save-draft-btn"
                    onClick={() => setIsSaved(true)}
                    disabled={isSaved}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {isSaved ? "Draft Saved ✓" : "Save Draft"}
                  </Button>
                  <Button
                    size="sm" className="flex-1"
                    id="voice-send-btn"
                    disabled={isSending || !recipientEmail}
                    onClick={() => { setIsSending(true); setTimeout(() => setIsSending(false), 2000); }}
                  >
                    {isSending
                      ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    {isSending ? "Sending…" : "Send Email"}
                  </Button>
                </div>
                {!recipientEmail && (
                  <p className="text-xs text-zinc-600 text-center">Add a recipient email to enable Send</p>
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

          {/* Idle placeholder */}
          {(stage === "idle" || (stage === "recording" && !liveTranscript)) && (
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
