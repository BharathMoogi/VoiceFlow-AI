"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  Search,
  Mic,
  MessageSquare,
  Bot,
  User,
  Paperclip,
  MoreVertical,
  Mail,
} from "lucide-react";
import { Button } from "@/components/UI/Button";
import { insforge } from "@/lib/insforge";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function formatContent(content: string) {
  // Simple markdown-like formatting for bold
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Streaming state
  const [streamingContent, setStreamingContent] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await insforge.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchConversations(user.id);
      } else {
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isTyping]);

  const fetchConversations = async (uid: string) => {
    const { data, error } = await insforge
      .from("conversations")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    
    if (data) {
      setConversations(data);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await insforge
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    
    if (data) {
      setMessages(data);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    setStreamingContent("");
    fetchMessages(convId);
  };

  const createNewConversation = async (firstMessageText: string) => {
    if (!userId) return null;
    
    const title = firstMessageText.slice(0, 30) + (firstMessageText.length > 30 ? "..." : "");
    const { data, error } = await insforge
      .from("conversations")
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    
    if (data) {
      setConversations((prev) => [data, ...prev]);
      setActiveConvId(data.id);
      return data.id;
    }
    return null;
  };

  const saveMessageToDb = async (convId: string, role: string, content: string) => {
    const { data } = await insforge
      .from("messages")
      .insert([{ conversation_id: convId, role, content }])
      .select()
      .single();
    
    // Update conversation timestamp
    await insforge
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
      
    // Re-fetch conversations to update order
    if (userId) fetchConversations(userId);
    
    return data;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;
    const textToSend = inputText.trim();
    setInputText("");
    setIsTyping(true);
    setStreamingContent("");

    let currentConvId = activeConvId;
    
    // Create new conversation if none selected
    if (!currentConvId) {
      currentConvId = await createNewConversation(textToSend);
      if (!currentConvId) {
        setIsTyping(false);
        return;
      }
    }

    // Optimistically add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message to DB in background
    await saveMessageToDb(currentConvId, "user", textToSend);

    // Prepare message history for AI
    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: textToSend });
    
    // System prompt (optional, but good for setting persona)
    const payload = [
      { role: "system", content: "You are VoiceFlow AI, a helpful, professional AI assistant built by Bharath Moogi. Your primary goal is to help users write, edit, and improve emails, as well as answer general questions." },
      ...apiMessages
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Finished streaming, save to DB
      const aiMsg = await saveMessageToDb(currentConvId, "assistant", fullContent);
      if (aiMsg) {
        setMessages((prev) => [...prev, aiMsg]);
      }
      setStreamingContent("");
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback message
      const errorMsg = "Sorry, I encountered an error while processing your request.";
      const aiMsg = await saveMessageToDb(currentConvId, "assistant", errorMsg);
      if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
      // Re-focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleConvertToEmail = (content: string) => {
    // Navigate to email generator and pass the content
    sessionStorage.setItem("voiceflow_email_draft", content);
    router.push("/dashboard/email-generator");
  };

  // --- Voice Recording Logic ---
  const handleVoiceInput = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setInputText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Automatically focus and optionally send
      inputRef.current?.focus();
    };

    recognition.start();
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex gap-6">
      {/* Left panel — Conversation list */}
      <div className="w-72 shrink-0 flex flex-col glass rounded-2xl border border-white/[0.08]/60 overflow-hidden">
        <div className="p-4 space-y-3 border-b border-white/[0.08]/60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Conversations</h2>
            <button
              onClick={() => {
                setActiveConvId(null);
                setMessages([]);
                setStreamingContent("");
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 hover:text-violet-300 transition-all duration-200 border border-violet-500/20"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1F2937]/60 border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/30">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={`w-full text-left p-4 hover:bg-zinc-800/30 transition-all duration-150 ${
                conv.id === activeConvId ? "bg-violet-600/10 border-l-2 border-l-indigo-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-500/30 border border-violet-500/20 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-200 truncate">{conv.title}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">VoiceFlow Chat</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">{formatTime(conv.updated_at)}</span>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="h-6 w-6 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-600">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Active conversation */}
      <div className="flex-1 flex flex-col glass rounded-2xl border border-white/[0.08]/60 overflow-hidden relative">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]/60 bg-zinc-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center shadow-md">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {activeConvId ? conversations.find(c => c.id === activeConvId)?.title : "New Conversation"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-emerald-400 font-medium">DeepSeek AI Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && !streamingContent && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="p-5 rounded-3xl bg-violet-600/10 border border-violet-500/20 shadow-xl shadow-violet-500/5">
                <Bot className="h-10 w-10 text-violet-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-gray-200">How can I help you today?</p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Ask me to write an email, brainstorm ideas, or summarize information. I remember our conversation context.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-1 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-pink-500 to-rose-500"
                  : "bg-gradient-to-br from-violet-500 to-violet-500"
              }`}>
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-white" />
                )}
              </div>

              <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-tr-sm"
                      : "bg-[#1E1E24]/80 text-gray-200 border border-white/[0.08]/50 rounded-tl-sm shadow-md"
                  }`}
                >
                  {formatContent(msg.content)}
                </div>
                
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-2 ml-1">
                    <button 
                      onClick={() => handleConvertToEmail(msg.content)}
                      className="flex items-center gap-1.5 text-[10px] font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 px-2 py-1 rounded transition-colors"
                    >
                      <Mail className="h-3 w-3" /> Convert to Email
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming / Typing indicator */}
          {(isTyping || streamingContent) && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex flex-col max-w-[85%] items-start">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1E1E24]/80 text-gray-200 border border-white/[0.08]/50 shadow-md text-sm leading-relaxed whitespace-pre-wrap min-w-[60px] min-h-[44px]">
                  {streamingContent ? (
                    formatContent(streamingContent)
                  ) : (
                    <div className="flex items-center gap-1.5 h-full pt-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input area */}
        <div className="p-4 bg-zinc-900/50 backdrop-blur-md border-t border-white/[0.08]/60">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#1F2937]/80 border border-white/[0.1] rounded-2xl p-2 shadow-inner focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
            <button
              onClick={handleVoiceInput}
              className={`p-2.5 rounded-xl transition-colors self-end ${
                isRecording 
                  ? "bg-red-500/20 text-red-400 animate-pulse" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
            
            <textarea
              ref={inputRef}
              placeholder="Message VoiceFlow AI..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-0 resize-none py-2.5 max-h-32 min-h-[40px] leading-relaxed"
              style={{ height: "auto" }}
            />
            
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
              className={`h-10 w-10 !p-0 flex-shrink-0 rounded-xl self-end transition-all ${
                inputText.trim() && !isTyping 
                  ? "bg-violet-600 hover:bg-violet-500 text-white" 
                  : "bg-zinc-700/50 text-zinc-500"
              }`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center">
            VoiceFlow AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
