"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Mic,
  Square,
  FileAudio,
  CheckCircle,
  ArrowRight,
  X,
  Play,
  Pause,
  Loader2,
  Mail,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";

type Stage = "idle" | "uploading" | "transcribing" | "generating" | "done";

const stages: { key: Stage; label: string }[] = [
  { key: "uploading", label: "Uploading" },
  { key: "transcribing", label: "Transcribing" },
  { key: "generating", label: "Generating Email" },
  { key: "done", label: "Complete" },
];

const mockTranscript =
  "Hey team, just a quick update on the project. We completed the design phase last Friday and the development sprint kicked off this Monday. The main deliverable for this week is the authentication module. We're on track to hit the milestone by Thursday. Also, please remember to submit your timesheets by end of day today. Thanks everyone, looking forward to a great week.";

const mockEmailSubject = "Project Update: Dev Sprint Kickoff & Action Items";
const mockEmailBody = `Hi Team,

Following our recent discussion, here's a quick update on the project status:

✅ Design phase completed – last Friday
🚀 Development sprint kicked off – this Monday
🎯 Current focus: Authentication module (due Thursday)

Action Items:
- Submit your timesheets by end of day today
- Check in on the authentication module progress by Wednesday

We're on track and I'm excited about our momentum. Please reach out if you need any support this week.

Best regards,
Demo User`;

export default function VoiceUploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStageIndex = stages.findIndex((s) => s.key === stage);

  const runPipeline = (file?: File) => {
    if (file) setAudioFile(file);
    
    // Stage 1: Uploading
    setStage("uploading");
    setTimeout(() => {
      // Stage 2: Transcribing
      setStage("transcribing");
      setTimeout(() => {
        setTranscript(mockTranscript);
        // Stage 3: Generating
        setStage("generating");
        setTimeout(() => {
          setEmailSubject(mockEmailSubject);
          setEmailBody(mockEmailBody);
          setStage("done");
        }, 1800);
      }, 2000);
    }, 1200);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runPipeline(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runPipeline(file);
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecordingSeconds(0);
      // Simulate processing the recording
      runPipeline();
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 59) {
            // Auto stop at 60s
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            runPipeline();
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    }
  };

  const handleReset = () => {
    setStage("idle");
    setAudioFile(null);
    setTranscript("");
    setEmailSubject("");
    setEmailBody("");
    setIsRecording(false);
    setRecordingSeconds(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const formatSeconds = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Mic className="h-5 w-5 text-indigo-400" />
          Voice Upload & Transcription
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Upload an audio file or record live — we'll transcribe it and generate a polished email.
        </p>
      </div>

      {/* Progress Stepper */}
      {stage !== "idle" && (
        <Card className="!p-5">
          <div className="flex items-center justify-between">
            {stages.map((s, i) => {
              const isDone = currentStageIndex > i || stage === "done";
              const isActive = stages[currentStageIndex]?.key === s.key;

              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isActive
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                          : "border-zinc-700 bg-transparent text-zinc-600"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isDone ? "text-emerald-400" : isActive ? "text-indigo-400" : "text-zinc-600"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-500 ${
                        currentStageIndex > i ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload & Record panel */}
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
                  : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              id="drag-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
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
                      <p className="text-sm font-semibold text-zinc-200">{audioFile.name}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {(audioFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">
                      {isDragging ? "Drop your audio file here" : "Drag & drop an audio file"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">or click to browse — WAV, MP3, M4A, OGG</p>
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
              <div className="flex items-center gap-1 h-12">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isRecording
                        ? "bg-rose-500 animate-pulse"
                        : "bg-zinc-700"
                    }`}
                    style={{
                      height: isRecording
                        ? `${Math.random() * 60 + 10}%`
                        : `${20 + (i % 5) * 10}%`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>

              {isRecording && (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-sm font-mono font-semibold text-rose-400">
                    {formatSeconds(recordingSeconds)} / 01:00
                  </span>
                </div>
              )}

              <button
                id="record-btn"
                onClick={toggleRecording}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 shadow-lg ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/30 scale-105"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30"
                }`}
              >
                {isRecording ? (
                  <><Square className="h-4 w-4" />Stop Recording</>
                ) : (
                  <><Mic className="h-4 w-4" />Start Recording</>
                )}
              </button>
              <p className="text-xs text-zinc-600">
                {isRecording
                  ? "Click stop when you're done — we'll auto-stop at 60 seconds"
                  : "Click to start your voice memo (max 60 seconds)"}
              </p>
            </div>
          </Card>

          {stage !== "idle" && (
            <Button variant="outline" onClick={handleReset} className="w-full" id="reset-btn">
              <X className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>

        {/* Output panel */}
        <div className="space-y-4">
          {/* Transcript */}
          {(stage === "transcribing" || stage === "generating" || stage === "done") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-indigo-400" />
                  Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stage === "transcribing" && !transcript ? (
                  <div className="space-y-2">
                    {[95, 80, 90, 70].map((w, i) => (
                      <div key={i} className="shimmer rounded h-3" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-300 leading-relaxed">{transcript}</p>
                )}
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
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-emerald-500 font-medium">Ready</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  placeholder="Subject"
                  id="voice-email-subject"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y font-mono leading-relaxed"
                  id="voice-email-body"
                />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" id="voice-save-draft-btn">
                    Save Draft
                  </Button>
                  <Button size="sm" className="flex-1" id="voice-send-btn">
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {stage === "idle" && (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-16 text-center">
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 mb-4">
                <Wand2 className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-500">Output will appear here</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">
                Upload an audio file or start a recording on the left
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
