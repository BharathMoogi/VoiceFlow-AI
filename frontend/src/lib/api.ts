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
  // Use FastAPI backend (OAuth2 form-data format)
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_BASE}/auth/login/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function register(
  full_name: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch { /* best-effort */ }
  }
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
  return apiFetch<UserProfile>("/auth/me");
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
  // Fetch user from FastAPI backend using the stored JWT
  const me = await apiFetch<UserProfile>("/auth/me");

  // Try to get InsForge counts — silently fall back to 0 if not available
  let contactsCount = 0, campaignsCount = 0, callLogsCount = 0, draftCount = 0;
  let recentCalls: any[] = [];
  let successRate = 100;

  try {
    const [c, ca, cl, dr] = await Promise.all([
      insforge.from('contacts').select('*', { count: 'exact', head: true }),
      insforge.from('campaigns').select('*', { count: 'exact', head: true }),
      insforge.from('call_logs').select('*', { count: 'exact', head: true }),
      insforge.from('email').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    ]);
    contactsCount = c.count || 0;
    campaignsCount = ca.count || 0;
    callLogsCount = cl.count || 0;
    draftCount = dr.count || 0;

    const [comp, fail, busy, noAns] = await Promise.all([
      insforge.from('call_logs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      insforge.from('call_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      insforge.from('call_logs').select('*', { count: 'exact', head: true }).eq('status', 'busy'),
      insforge.from('call_logs').select('*', { count: 'exact', head: true }).eq('status', 'no-answer'),
    ]);
    const finished = (comp.count || 0) + (fail.count || 0) + (busy.count || 0) + (noAns.count || 0);
    successRate = finished > 0 ? Math.round(((comp.count || 0) / finished) * 100) : 100;

    const rc = await insforge.from('call_logs').select('id, contact_name, status, created_at').order('created_at', { ascending: false }).limit(4);
    recentCalls = rc.data || [];
  } catch {
    // InsForge not available — continue with zeros
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const recent_activity = recentCalls.map((c: any) => ({
    id: c.id,
    type: c.status === 'completed' ? 'email_sent' : c.status === 'calling' ? 'transcription' : 'conversation',
    title: `Outbound Call to ${c.contact_name || 'Contact'}`,
    desc: `Status: ${c.status.toUpperCase()}`,
    time: formatTimeAgo(c.created_at),
  }));

  return {
    stats: {
      transcriptions: contactsCount,
      transcriptions_change: "Contacts in directory",
      emails_sent: campaignsCount,
      emails_sent_change: "Active voice campaigns",
      conversations: callLogsCount,
      conversations_change: "Total dialed calls",
      success_rate: successRate,
      success_rate_label: "Call Uptime Success",
    },
    recent_activity,
    user: {
      name: me.full_name || me.email,
      draft_count: draftCount,
    },
  };
}

// ---------- Conversation endpoints ----------
export async function getConversations() {
  const { data, error } = await insforge.from('conversation').select('id, title, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- Contacts API ----------
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at?: string;
}

export async function getContacts(): Promise<Contact[]> {
  const { data, error } = await insforge.from('contacts').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createContact(name: string, phone: string, email?: string, notes?: string): Promise<Contact> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) throw new Error("Not authenticated");
  const userData = userResult.data;
  
  const { data, error } = await insforge.from('contacts').insert([{
    name,
    phone,
    email: email || '',
    notes: notes || '',
    user_id: userData.user.id
  }]).select().single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await insforge.from('contacts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadContactsCSV(contactsList: { name: string; phone: string; email?: string; notes?: string }[]): Promise<void> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) throw new Error("Not authenticated");
  const userData = userResult.data;
  
  const payload = contactsList.map(c => ({
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    notes: c.notes || '',
    user_id: userData.user.id
  }));
  
  const { error } = await insforge.from('contacts').insert(payload);
  if (error) throw new Error(error.message);
}

// ---------- Voice Agent Configurations API ----------
export interface AgentConfig {
  id: string;
  name: string;
  prompt: string;
  voice_id: string;
  temperature: number;
  created_at?: string;
}

export async function getAgentConfigs(): Promise<AgentConfig[]> {
  const { data, error } = await insforge.from('voice_agent_configurations').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAgentConfig(name: string, prompt: string, voice_id: string, temperature: number): Promise<AgentConfig> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) throw new Error("Not authenticated");
  const userData = userResult.data;
  
  const { data, error } = await insforge.from('voice_agent_configurations').insert([{
    name,
    prompt,
    voice_id,
    temperature,
    user_id: userData.user.id
  }]).select().single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAgentConfig(id: string, name: string, prompt: string, voice_id: string, temperature: number): Promise<AgentConfig> {
  const { data, error } = await insforge.from('voice_agent_configurations').update({
    name,
    prompt,
    voice_id,
    temperature
  }).eq('id', id).select().single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAgentConfig(id: string): Promise<void> {
  const { error } = await insforge.from('voice_agent_configurations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Campaigns API ----------
export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  voice_agent_config_id: string;
  created_at?: string;
  voice_agent_configurations?: { name: string };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await insforge.from('campaigns').select('*, voice_agent_configurations(name)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCampaign(name: string, description: string, voice_agent_config_id: string): Promise<Campaign> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) throw new Error("Not authenticated");
  const userData = userResult.data;
  
  const { data, error } = await insforge.from('campaigns').insert([{
    name,
    description,
    voice_agent_config_id,
    status: 'draft',
    user_id: userData.user.id
  }]).select().single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await insforge.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateCampaignStatus(id: string, status: string): Promise<void> {
  const { error } = await insforge.from('campaigns').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getCampaignContacts(campaignId: string): Promise<Contact[]> {
  const { data, error } = await insforge
    .from('campaign_contacts')
    .select('contacts(*)')
    .eq('campaign_id', campaignId);
    
  if (error) throw new Error(error.message);
  // Flatten result to return array of contacts
  return (data || []).map((item: any) => item.contacts).filter(Boolean);
}

export async function addContactsToCampaign(campaignId: string, contactIds: string[]): Promise<void> {
  if (contactIds.length === 0) return;
  const payload = contactIds.map(contact_id => ({
    campaign_id: campaignId,
    contact_id: contact_id
  }));
  
  const { error } = await insforge.from('campaign_contacts').insert(payload);
  if (error) throw new Error(error.message);
}

export async function removeContactFromCampaign(campaignId: string, contactId: string): Promise<void> {
  const { error } = await insforge
    .from('campaign_contacts')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId);
    
  if (error) throw new Error(error.message);
}

// ---------- Call Logs API ----------
export interface CallLog {
  id: string;
  campaign_id?: string;
  contact_id?: string;
  contact_name?: string;
  contact_phone: string;
  status: string;
  duration: number;
  recording_url?: string;
  summary?: string;
  transcript?: string;
  vapi_call_id?: string;
  created_at?: string;
  campaigns?: { name: string };
  contacts?: { name: string };
}

export async function getCallLogs(): Promise<CallLog[]> {
  const { data, error } = await insforge
    .from('call_logs')
    .select('*, campaigns(name), contacts(name)')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data || [];
}

export async function triggerCallCampaign(campaignId: string): Promise<void> {
  const token = getToken();
  const res = await fetch('/api/vapi/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ campaignId })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to initiate call campaign" }));
    throw new Error(err.detail || "Failed to initiate call campaign");
  }
}
