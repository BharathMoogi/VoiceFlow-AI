import { insforge } from './insforge';

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

// ---------- Auth endpoints ----------
export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const token = data?.accessToken || "";
  if (!token) throw new Error("Login failed: no session returned. Please verify your email first.");
  // SDK returns user.name directly on signInWithPassword response
  const displayName = (data?.user as any)?.name || email.split('@')[0];
  saveUserInfo(displayName, email);
  return {
    access_token: token,
    refresh_token: data?.refreshToken || "",
    token_type: "bearer"
  };
}

export async function verifyEmailOTP(email: string, otp: string): Promise<AuthTokens> {
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });
  if (error) throw new Error(error.message);
  return {
    access_token: data?.accessToken || "",
    refresh_token: data?.refreshToken || "",
    token_type: "bearer"
  };
}

export async function register(
  full_name: string,
  email: string,
  password: string
): Promise<AuthTokens> {
  // InsForge SDK signUp() takes top-level `name` field (not options.data)
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name: full_name,
  });
  if (error) throw new Error(error.message);
  const token = data?.accessToken || "";
  if (!token) {
    throw new Error("Registration succeeded but verification is required. Please verify your email first.");
  }
  saveUserInfo(full_name, email);
  return {
    access_token: token,
    refresh_token: data?.refreshToken || "",
    token_type: "bearer"
  };
}

export async function logout() {
  await insforge.auth.signOut();
  clearTokens();
}

// ---------- User profile ----------
export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export async function fetchMe(redirectOnFailure = false): Promise<UserProfile> {
  const token = getToken();
  if (!token) {
    if (redirectOnFailure) {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new Error("No session found. Please log in.");
  }
  // Read user info directly from localStorage — no API call needed.
  // User info is saved during login, so this is always available.
  const { name, email } = getUserInfo();
  return {
    id: token, // use token as id proxy — sufficient for display
    email,
    full_name: name || email,
    is_active: true,
  };
}

export async function updateProfile(full_name: string) {
  // InsForge SDK uses setProfile() — updateUser() does not exist
  const { data, error } = await insforge.auth.setProfile({ nickname: full_name });
  if (error) throw new Error(error.message);
  // Always persist locally so the sidebar reflects the change immediately
  const email = getUserInfo().email || '';
  saveUserInfo(full_name, email);
  return data;
}

// ---------- Email endpoints ----------
export async function generateEmail(prompt: string): Promise<{ subject: string; body: string }> {
  // Call InsForge AI directly from the browser via the /insforge-proxy rewrite.
  // This avoids Node.js server-side TLS issues — the browser fetch goes through
  // Next.js rewrites: /insforge-proxy/* → https://qqskjqm7.us-east.insforge.app/*
  const SYSTEM_PROMPT =
    "You are a helpful assistant that writes professional marketing, announcement, or outreach emails. " +
    "Output a valid JSON object with exactly two keys: " +
    "'subject' (a concise subject line string) and " +
    "'body' (the email body string with line breaks where appropriate). " +
    "Return raw JSON only — no markdown fences.";

  const result = await insforge.ai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Write an email based on the following instruction: ${prompt}` },
    ],
    temperature: 0.7,
    maxTokens: 1000,
  });

  const raw = (result.choices?.[0]?.message?.content ?? "").trim();

  // Strip markdown fences if present
  let clean = raw;
  if (clean.startsWith("```json")) clean = clean.slice(7);
  else if (clean.startsWith("```")) clean = clean.slice(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  clean = clean.trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      subject: parsed.subject || "AI Generated Email",
      body: parsed.body || clean,
    };
  } catch {
    // AI returned plain text — use it as the body
    return { subject: "AI Generated Email", body: clean || raw };
  }
}

export async function getEmails() {
  const { data, error } = await insforge.from('email').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { emails: data || [] };
}

export interface EmailDraft {
  recipient: string;
  subject: string;
  body: string;
}

export async function saveEmailDraft(emailData: EmailDraft): Promise<{ id: string }> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) {
    throw new Error("Not authenticated");
  }
  const user = userResult.data.user;

  const { data, error } = await insforge
    .from('email')
    .insert([
      {
        recipient: emailData.recipient,
        subject: emailData.subject,
        body: emailData.body,
        status: 'draft',
        user_id: user.id,
      },
    ])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function sendEmail(emailData: EmailDraft): Promise<void> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) {
    throw new Error("Not authenticated");
  }
  const user = userResult.data.user;

  // 1. Send transactional email via Resend (through our Next.js API route)
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: emailData.recipient,
      subject: emailData.subject,
      html: emailData.body.replace(/\n/g, '<br/>'),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to send email' }));
    throw new Error(err.error || 'Failed to send email');
  }

  // 2. Log in the database as status='sent'
  const { error: dbError } = await insforge
    .from('email')
    .insert([
      {
        recipient: emailData.recipient,
        subject: emailData.subject,
        body: emailData.body,
        status: 'sent',
        user_id: user.id,
      },
    ]);

  if (dbError) {
    console.error("Failed to record sent email in database:", dbError);
  }
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
  // Fetch user from InsForge using the stored JWT
  // Pass true so expired sessions redirect back to login from the dashboard
  const me = await fetchMe(true);

  // Try to get InsForge counts — silently fall back to 0 if not available
  let contactsCount = 0, campaignsCount = 0, callLogsCount = 0, draftCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ---------- Translator ----------

export interface TranslateResponse {
  translated_text: string;
  detected_language?: string | null;
  source_lang: string;
  target_lang: string;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslateResponse> {
  const SYSTEM_PROMPT =
    "You are an expert, fluent translator. Translate the given text accurately and naturally. " +
    "Output a valid JSON object with exactly two keys: " +
    "'translated_text' (the translated string) and " +
    "'detected_language' (the ISO-639-1 language code of the source text, or null if not auto-detected). " +
    "Return raw JSON only — no markdown fences.";

  const sourceInstr =
    sourceLang === "auto"
      ? "Detect the source language automatically."
      : `The source language is '${sourceLang}'.`;

  const result = await insforge.ai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${sourceInstr} Translate into language '${targetLang}'.\n\nText:\n${text}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });

  const raw = (result.choices?.[0]?.message?.content ?? "").trim();

  let clean = raw;
  if (clean.startsWith("```json")) clean = clean.slice(7);
  else if (clean.startsWith("```")) clean = clean.slice(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  clean = clean.trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      translated_text: parsed.translated_text ?? "",
      detected_language: parsed.detected_language ?? null,
      source_lang: sourceLang,
      target_lang: targetLang,
    };
  } catch {
    // Fallback: treat entire response as the translation
    return {
      translated_text: raw,
      detected_language: null,
      source_lang: sourceLang,
      target_lang: targetLang,
    };
  }
}
