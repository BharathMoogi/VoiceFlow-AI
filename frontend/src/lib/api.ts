import { insforge } from './insforge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ---------- Token helpers ----------
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function saveTokens(access: string, refresh?: string) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ---------- User info helpers ----------
export function saveUserInfo(name: string, email?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user_name", name);
  if (email) localStorage.setItem("user_email", email);
}

export function getUserInfo(): { name: string; email: string } {
  if (typeof window === "undefined") return { name: "User", email: "" };
  return {
    name: localStorage.getItem("user_name") || "User",
    email: localStorage.getItem("user_email") || "",
  };
}

// ---------- Auth redirect ----------
function redirectToLogin() {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ---------- Token refresh ----------
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ---------- Generic fetch wrapper ----------
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // ── Handle 401 → attempt silent token refresh ──────────────
  if (res.status === 401) {
    // De-duplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry the original request with the new access token
      const newToken = getToken();
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (newToken) retryHeaders["Authorization"] = `Bearer ${newToken}`;

      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: retryHeaders,
      });

      if (!retryRes.ok) {
        if (retryRes.status === 401) {
          redirectToLogin();
          throw new Error("Session expired. Please log in again.");
        }
        const err = await retryRes
          .json()
          .catch(() => ({ detail: retryRes.statusText }));
        throw new Error(err.detail || "Request failed");
      }
      return retryRes.json();
    } else {
      // Both tokens invalid → redirect to login
      redirectToLogin();
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ---------- Auth endpoints ----------
export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: 'bearer'
  };
}

export async function register(
  full_name: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    options: {
      data: { full_name }
    }
  });
  if (error) throw new Error(error.message);
  
  // Insert profile manually since triggers might not be set up
  if (data.user) {
    await insforge.from('profiles').insert([{ id: data.user.id, full_name }]);
  }
  
  if (!data.session) {
    // If email confirmation is required
    throw new Error('Please check your email to confirm registration');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: 'bearer'
  };
}

export async function logout() {
  await insforge.auth.signOut();
  clearTokens();
}

// ---------- User profile ----------
export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export async function fetchMe(): Promise<UserProfile> {
  const { data: { user }, error } = await insforge.auth.getUser();
  if (error || !user) throw new Error("Not logged in");

  const { data: profile } = await insforge.from('profiles').select('full_name').eq('id', user.id).single();
  
  return {
    id: user.id as any,
    email: user.email!,
    full_name: profile?.full_name || user.user_metadata?.full_name || "User",
    is_active: true
  };
}

// ---------- Email endpoints ----------
export async function generateEmail(prompt: string) {
  // We'll call a Next.js API route that securely calls the AI
  const token = getToken();
  const res = await fetch('/api/email/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('AI generation failed');
  return res.json();
}

export async function getEmails() {
  const { data, error } = await insforge.from('email').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { emails: data || [] };
}

// ---------- Speech / Voice endpoints ----------
export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getToken();
  
  // Call Next.js API route instead of external backend
  const res = await fetch('/api/speech/transcribe', {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Transcription failed" }));
    throw new Error(err.detail || "Transcription failed");
  }
  return res.json();
}

// ---------- Dashboard endpoints ----------
export interface DashboardStats {
  stats: {
    transcriptions: number;
    transcriptions_change: string;
    emails_sent: number;
    emails_sent_change: string;
    conversations: number;
    conversations_change: string;
    success_rate: number;
    success_rate_label: string;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    title: string;
    desc: string;
    time: string;
  }>;
  user: {
    name: string;
    draft_count: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: user } = await insforge.auth.getUser();
  if (!user.user) throw new Error("Not logged in");
  
  const { count: draftCount } = await insforge.from('email').select('*', { count: 'exact', head: true }).eq('status', 'draft');
  const { count: conversationsCount } = await insforge.from('conversation').select('*', { count: 'exact', head: true });
  const { count: emailsCount } = await insforge.from('email').select('*', { count: 'exact', head: true });

  const { data: profile } = await insforge.from('profiles').select('full_name').eq('id', user.user.id).single();

  return {
    stats: {
      transcriptions: 0,
      transcriptions_change: "+0% from last month",
      emails_sent: emailsCount || 0,
      emails_sent_change: "+0% from last month",
      conversations: conversationsCount || 0,
      conversations_change: "+0% from last month",
      success_rate: 100,
      success_rate_label: "API Uptime"
    },
    recent_activity: [],
    user: {
      name: profile?.full_name || user.user.user_metadata?.full_name || "User",
      draft_count: draftCount || 0
    }
  };
}

// ---------- Conversation endpoints ----------
export async function getConversations() {
  const { data, error } = await insforge.from('conversation').select('id, title, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
