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
  Trash2,
} from "lucide-react";
import { Card } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface Conversation {
  id: number;
  title: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  messages: Message[];
}

const mockConversations: Conversation[] = [
  {
    id: 1,
    title: "Q3 Review Email",
    lastMessage: "Can you write a follow-up email?",
    time: "2m ago",
    unread: true,
    messages: [
      { id: 1, role: "user", content: "I need to write a follow-up email for our Q3 review meeting with the leadership team.", time: "10:02 AM" },
      { id: 2, role: "assistant", content: "Of course! I can help you draft a professional follow-up email for your Q3 review. Could you share the key discussion points or action items from the meeting so I can tailor the email accordingly?", time: "10:02 AM" },
      { id: 3, role: "user", content: "We discussed revenue targets, hiring plans, and the product roadmap. The main action items were: finalize Q4 budget by Friday and submit roadmap review by next Monday.", time: "10:04 AM" },
      { id: 4, role: "assistant", content: "Perfect! Here's a draft follow-up email based on those discussion points:\n\n**Subject:** Q3 Review Meeting – Action Items & Next Steps\n\nHi [Leadership Team],\n\nThank you for attending today's Q3 review session. Below is a summary of our key discussions and the action items we agreed upon:\n\n**Discussion Highlights:**\n- Revenue targets for Q3 and projections for Q4\n- Hiring plans and headcount adjustments\n- Product roadmap priorities and timelines\n\n**Action Items:**\n1. Finalize Q4 budget — **Due: Friday**\n2. Submit roadmap review document — **Due: Next Monday**\n\nPlease don't hesitate to reach out if you have any questions or need clarification.\n\nBest regards,\n[Your Name]", time: "10:05 AM" },
    ],
  },
  {
    id: 2,
    title: "Client Onboarding Draft",
    lastMessage: "The tone sounds great, thanks!",
    time: "1h ago",
    messages: [
      { id: 1, role: "user", content: "Help me write a warm welcome email for a new enterprise client.", time: "9:15 AM" },
      { id: 2, role: "assistant", content: "Sure! Here's a warm and professional welcome email for your new enterprise client:\n\n**Subject:** Welcome to [Your Company] – Let's Get Started!\n\nDear [Client Name],\n\nWelcome aboard! We're thrilled to have [Client Company] as part of our growing family of partners.\n\nOur dedicated team is here to ensure a seamless onboarding experience. Your account manager, [Name], will be reaching out shortly to schedule your kickoff call.\n\nBest,\n[Your Name]", time: "9:16 AM" },
      { id: 3, role: "user", content: "The tone sounds great, thanks!", time: "9:18 AM" },
    ],
  },
  {
    id: 3,
    title: "Meeting Reschedule",
    lastMessage: "That works perfectly.",
    time: "Yesterday",
    messages: [
      { id: 1, role: "user", content: "I need to reschedule my 3pm meeting to Thursday.", time: "Yesterday" },
      { id: 2, role: "assistant", content: "Here's a short and polite reschedule email:\n\n**Subject:** Meeting Reschedule Request\n\nHi [Name],\n\nI hope you're doing well. I'd like to reschedule our 3:00 PM meeting to Thursday if that works for you. Please let me know your availability and I'll send over an updated invite.\n\nThanks for your flexibility!\n\nBest,\n[Your Name]", time: "Yesterday" },
      { id: 3, role: "user", content: "That works perfectly.", time: "Yesterday" },
    ],
  },
];

function formatContent(content: string) {
  // Handle bold markdown
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConvId, setActiveConvId] = useState<number>(1);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvId, conversations]);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputText.trim(),
      time: now,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, userMessage], lastMessage: inputText.trim(), time: "Just now" }
          : c
      )
    );
    setInputText("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "I'm reviewing your request and will generate a well-structured email draft for you. Could you provide any additional context or specific details you'd like included?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: [...c.messages, aiMessage], lastMessage: aiMessage.content.slice(0, 50) + "..." }
            : c
        )
      );
      setIsTyping(false);
    }, 1500);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now(),
      title: "New Conversation",
      lastMessage: "Start typing to begin...",
      time: "Just now",
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex gap-6">
      {/* Left panel — Conversation list */}
      <div className="w-72 shrink-0 flex flex-col glass rounded-2xl border border-white/[0.08]/60 overflow-hidden">
        <div className="p-4 space-y-3 border-b border-white/[0.08]/60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Conversations</h2>
            <button
              onClick={handleNewConversation}
              id="new-conversation-btn"
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
              id="conversation-search"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/30">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              id={`conv-item-${conv.id}`}
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-gray-200 truncate">{conv.title}</p>
                      {conv.unread && (
                        <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">{conv.time}</span>
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
      <div className="flex-1 flex flex-col glass rounded-2xl border border-white/[0.08]/60 overflow-hidden">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]/60">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center shadow-md">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{activeConversation.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[11px] text-emerald-400 font-medium">VoiceFlow Assistant</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {activeConversation.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <div className="p-5 rounded-2xl bg-violet-600/10 border border-violet-500/20">
                    <Bot className="h-8 w-8 text-violet-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-300">VoiceFlow AI Ready</p>
                  <p className="text-xs text-gray-500 text-center max-w-xs">
                    Ask me to write, edit, or improve any email. You can also upload a voice memo!
                  </p>
                </div>
              )}

              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
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

                  <div className={`flex flex-col max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white rounded-tr-sm"
                          : "bg-zinc-800/70 text-gray-200 border border-white/[0.08]/50 rounded-tl-sm"
                      }`}
                    >
                      {formatContent(msg.content)}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 px-1">{msg.time}</span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-800/70 border border-white/[0.08]/50 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-5 py-4 border-t border-white/[0.08]/60">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    id="message-input"
                    placeholder="Ask VoiceFlow AI to write or improve an email…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    className="w-full bg-[#1F2937]/60 border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none min-h-[44px] max-h-32"
                    style={{ height: "auto" }}
                  />
                  <button
                    className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-300 transition-colors"
                    id="attach-file-btn"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  id="send-message-btn"
                  className="h-11 w-11 !p-0 flex-shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <MessageSquare className="h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
