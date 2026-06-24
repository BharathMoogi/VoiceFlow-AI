import { insforge } from './insforge';

// ---------- Token helpers ----------
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const activeToken = insforge.tokenManager.getAccessToken();
    if (activeToken) {
      localStorage.setItem("access_token", activeToken);
      return activeToken;
    }
  } catch (err) {
    console.error("Failed to get token from insforge client:", err);
  }
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function saveTokens(access: string, refresh?: string) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  insforge.setAccessToken(access);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  insforge.setAccessToken(null);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ---------- User info helpers ----------
export function saveUserInfo(name: string, email?: string, plan?: string, phone?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user_name", name);
  if (email) localStorage.setItem("user_email", email);
  if (plan) localStorage.setItem("user_plan", plan);
  if (phone !== undefined) localStorage.setItem("user_phone", phone);
}

export function getUserInfo(): { name: string; email: string; plan: string; phone: string } {
  if (typeof window === "undefined") return { name: "User", email: "", plan: "free", phone: "" };
  return {
    name: localStorage.getItem("user_name") || "User",
    email: localStorage.getItem("user_email") || "",
    plan: localStorage.getItem("user_plan") || "free",
    phone: localStorage.getItem("user_phone") || "",
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
  plan: string;
  phone?: string;
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
  
  // Try fetching actual profile row from database (which has the plan)
  let dbPlan = "free";
  let dbName = "";
  let dbPhone = "";
  try {
    const userResult = await insforge.auth.getCurrentUser();
    if (userResult.data?.user) {
      const user = userResult.data.user;
      const { data: profile } = await insforge
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        dbPlan = profile.plan || "free";
        dbName = profile.full_name || "";
        dbPhone = profile.phone || "";
      }
    }
  } catch (err) {
    console.warn("Failed to fetch profile from DB:", err);
  }

  const { name, email, plan, phone } = getUserInfo();
  const finalPlan = dbPlan || plan || "free";
  const finalName = dbName || name || email;
  const finalPhone = dbPhone || phone || "";
  
  // Sync back to local storage
  saveUserInfo(finalName, email, finalPlan, finalPhone);

  return {
    id: token,
    email,
    full_name: finalName,
    plan: finalPlan,
    phone: finalPhone,
    is_active: true,
  };
}

export async function updateProfile(full_name: string, phone?: string) {
  // InsForge SDK uses setProfile() — updateUser() does not exist
  const { data, error } = await insforge.auth.setProfile({ nickname: full_name });
  if (error) throw new Error(error.message);
  // Always persist locally so the sidebar reflects the change immediately
  const email = getUserInfo().email || '';
  const plan = getUserInfo().plan || 'free';
  saveUserInfo(full_name, email, plan, phone);

  // Sync to database profiles table
  try {
    const userResult = await insforge.auth.getCurrentUser();
    if (userResult.data?.user) {
      const user = userResult.data.user;
      const { data: existing } = await insforge
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const updateData: any = { full_name };
      if (phone !== undefined) {
        updateData.phone = phone;
      }

      if (existing) {
        const { error: updateErr } = await insforge
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await insforge
          .from('profiles')
          .insert([{ id: user.id, full_name, plan, phone: phone || '' }]);
        if (insertErr) throw insertErr;
      }
    }
  } catch (err) {
    console.warn("Failed to sync profile updates to database:", err);
  }

  return data;
}

// ---------- Email endpoints ----------
export async function generateEmail(prompt: string): Promise<{ subject: string; body: string }> {
  const { name, email, plan, phone } = getUserInfo();
  if (plan === "free") {
    const { count, error } = await insforge
      .from('email')
      .select('*', { count: 'exact', head: true });
    if (!error && count !== null && count >= 5) {
      throw new Error("Free tier limit reached. You can generate at most 5 emails on the Free plan. Please upgrade to Pro in Settings for unlimited email generation!");
    }
  }

  // Call InsForge AI directly from the browser via the /insforge-proxy rewrite.
  // This avoids Node.js server-side TLS issues — the browser fetch goes through
  // Next.js rewrites: /insforge-proxy/* → https://qqskjqm7.us-east.insforge.app/*
  let signatureContext = "";
  if (name) {
    signatureContext = `\nThe sender of this email is named "${name}".`;
    if (email) signatureContext += ` Their email is "${email}".`;
    if (phone) signatureContext += ` Their phone number is "${phone}".`;
    signatureContext += " Please close the email with a professional sign-off (e.g. 'Best regards,' or 'Regards,') and write the sender's details exactly as provided (excluding any bracket placeholders or fake info).";
  }

  const SYSTEM_PROMPT =
    "You are a helpful assistant that writes professional marketing, announcement, or outreach emails. " +
    "Output a valid JSON object with exactly two keys: " +
    "'subject' (a concise subject line string) and " +
    "'body' (the email body string with line breaks where appropriate). " +
    "Return raw JSON only — no markdown fences." +
    signatureContext;

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

  // Retrieve the logged-in user's details
  const { name, email } = getUserInfo();
  const senderName = name || (user as any)?.name || user.email?.split('@')[0] || 'User';
  const senderEmail = email || user.email;

  // 1. Send transactional email via Resend (through our Next.js API route)
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: emailData.recipient,
      subject: emailData.subject,
      html: emailData.body.replace(/\n/g, '<br/>'),
      senderName,
      senderEmail,
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
  
  const { plan } = getUserInfo();
  if (plan === "free") {
    const { count } = await insforge
      .from('voice_agent_configurations')
      .select('*', { count: 'exact', head: true });
    if (count !== null && count >= 1) {
      throw new Error("Free tier limit reached. You can create at most 1 voice agent configuration. Please upgrade to Pro in Settings for unlimited configs!");
    }
    if (["rachel", "paul"].includes(voice_id)) {
      throw new Error("Premium ElevenLabs voices are only available on the Pro plan. Please upgrade to select this voice.");
    }
  }

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
  const { plan } = getUserInfo();
  if (plan === "free" && ["rachel", "paul"].includes(voice_id)) {
    throw new Error("Premium ElevenLabs voices are only available on the Pro plan. Please upgrade to select this voice.");
  }

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
  
  const { plan } = getUserInfo();
  if (plan === "free") {
    const { count } = await insforge
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
    if (count !== null && count >= 1) {
      throw new Error("Free tier limit reached. You can create at most 1 campaign. Please upgrade to Pro in Settings for unlimited campaigns!");
    }
  }

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

  const logs: CallLog[] = (data as CallLog[]) || [];
  
  // Simulation auto-completion check
  const now = new Date().getTime();
  const callingSims = logs.filter((log: CallLog) => 
    log.status === 'calling' && 
    log.vapi_call_id?.startsWith('sim_') &&
    log.created_at &&
    (now - new Date(log.created_at).getTime() > 8000) // 8 seconds elapsed
  );

  if (callingSims.length > 0) {
    // Process updates in background/async to not block the current request
    Promise.all(callingSims.map(async (log: CallLog) => {
      const contactName = log.contact_name || log.contacts?.name || 'Contact';
      const campaignName = log.campaigns?.name || 'Outbound campaign';
      
      // Generate mock call details
      const duration = Math.floor(Math.random() * 30) + 15; // 15 to 45s
      const rand = Math.random();
      let status = 'completed';
      let summary = '';
      let transcript = '';

      if (rand < 0.1) {
        status = 'busy';
        summary = `Attempted call to ${contactName}. The line was busy.`;
      } else if (rand < 0.15) {
        status = 'no-answer';
        summary = `Attempted call to ${contactName}. There was no answer.`;
      } else {
        status = 'completed';
        summary = `Successfully connected with ${contactName} regarding the "${campaignName}" campaign. The contact confirmed receipt of the updates and had no further questions.`;
        transcript = `Agent: Hello, is this ${contactName}? This is VoiceFlow AI calling regarding the ${campaignName}.\nCustomer: Yes, this is ${contactName}. What's this about?\nAgent: I'm calling to give you an update about ${campaignName}. Everything is set up and ready to go.\nCustomer: Oh, wonderful! Thank you for the update.\nAgent: You're welcome! Is there anything else I can help you with today?\nCustomer: No, that's all. Thanks again.\nAgent: Great, have a wonderful day! Goodbye.\nCustomer: Goodbye!`;
      }

      // Update call log in database
      await insforge
        .from('call_logs')
        .update({
          status,
          duration,
          summary,
          transcript,
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id);

      // If this call log belongs to a campaign, check if all campaign logs are complete
      if (log.campaign_id) {
        // Fetch all logs for this campaign to see if all are finished
        const { data: campaignLogs } = await insforge
          .from('call_logs')
          .select('status, id')
          .eq('campaign_id', log.campaign_id);

        if (campaignLogs) {
          // Map local updates to statuses to check correctly
          const statuses = campaignLogs.map((cl: any) => {
            if (cl.id === log.id) return status;
            return cl.status;
          });

          const allDone = !statuses.includes('pending') && !statuses.includes('calling');
          if (allDone) {
            await insforge
              .from('campaigns')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', log.campaign_id);
          }
        }
      }
    })).catch(err => console.error('Simulated call auto-complete background update failed:', err));

    // Optimistically update the in-memory array so the current call immediately shows updated values to user
    callingSims.forEach((log: CallLog) => {
      const contactName = log.contact_name || log.contacts?.name || 'Contact';
      const campaignName = log.campaigns?.name || 'Outbound campaign';
      const duration = Math.floor(Math.random() * 30) + 15;
      const rand = Math.random();
      let status = 'completed';
      let summary = '';
      let transcript = '';

      if (rand < 0.1) {
        status = 'busy';
        summary = `Attempted call to ${contactName}. The line was busy.`;
      } else if (rand < 0.15) {
        status = 'no-answer';
        summary = `Attempted call to ${contactName}. There was no answer.`;
      } else {
        status = 'completed';
        summary = `Successfully connected with ${contactName} regarding the "${campaignName}" campaign. The contact confirmed receipt of the updates and had no further questions.`;
        transcript = `Agent: Hello, is this ${contactName}? This is VoiceFlow AI calling regarding the ${campaignName}.\nCustomer: Yes, this is ${contactName}. What's this about?\nAgent: I'm calling to give you an update about ${campaignName}. Everything is set up and ready to go.\nCustomer: Oh, wonderful! Thank you for the update.\nAgent: You're welcome! Is there anything else I can help you with today?\nCustomer: No, that's all. Thanks again.\nAgent: Great, have a wonderful day! Goodbye.\nCustomer: Goodbye!`;
      }

      log.status = status;
      log.duration = duration;
      log.summary = summary;
      log.transcript = transcript;
    });
  }

  return logs;
}

export async function triggerCallCampaign(campaignId: string, simulate?: boolean): Promise<void> {
  const token = getToken();
  const res = await fetch('/api/vapi/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ campaignId, simulate })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to initiate call campaign" }));
    throw new Error(err.detail || "Failed to initiate call campaign");
  }
}

export interface SingleCallResult {
  callId: string;
  callLogId: string;
  status: string;
  mode: 'live' | 'simulation';
  message?: string;
}

export async function triggerSingleCall(
  phone: string,
  name: string,
  options?: {
    prompt?: string;
    voiceId?: string;
    campaignId?: string;
    contactId?: string;
    simulate?: boolean;
  }
): Promise<SingleCallResult> {
  const token = getToken();
  const res = await fetch('/api/vapi/outbound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ phone, name, ...options })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to initiate outbound call" }));
    throw new Error(err.detail || "Failed to initiate outbound call");
  }
  return res.json();
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

// ---------- Password Reset ----------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

/**
 * Sends a password reset email via InsForge.
 */
export async function sendResetPasswordEmail(email: string, redirectTo: string) {
  const { data, error } = await insforge.auth.sendResetPasswordEmail({
    email,
    redirectTo,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Exchanges a 6-digit reset code for a reset token via InsForge.
 */
export async function exchangeResetPasswordToken(email: string, code: string) {
  const { data, error } = await insforge.auth.exchangeResetPasswordToken({
    email,
    code,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Resets the password in InsForge using the token/otp.
 */
export async function resetPassword(newPassword: string, token: string) {
  const { data, error } = await insforge.auth.resetPassword({
    newPassword,
    otp: token,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Sends a password reset request to the FastAPI backend.
 */
export async function requestPasswordResetFastAPI(email: string) {
  const res = await fetch(`${API_BASE}/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "FastAPI backend reset request failed");
  }
  return res.json();
}

/**
 * Confirms a password reset in the FastAPI backend.
 */
export async function confirmPasswordResetFastAPI(token: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "FastAPI backend password reset confirmation failed");
  }
  return res.json();
}

/**
 * Submits user feedback to the InsForge database.
 */
export async function submitFeedback(rating: number, comment: string): Promise<void> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) {
    throw new Error("Not authenticated");
  }
  const user = userResult.data.user;

  const { error } = await insforge
    .from('feedback')
    .insert([
      {
        rating,
        comment,
        user_id: user.id,
      },
    ]);

  if (error) throw new Error(error.message);
}

/**
 * Upgrades user plan status to Pro in both database and local storage.
 */
export async function upgradeToPro(): Promise<void> {
  const userResult = await insforge.auth.getCurrentUser();
  if (userResult.error || !userResult.data || !userResult.data.user) {
    throw new Error("Not authenticated");
  }
  const user = userResult.data.user;

  // 1. Save locally
  const { name, email } = getUserInfo();
  saveUserInfo(name, email, "pro");

  // 2. Sync to InsForge profiles table
  try {
    const { data: existing } = await insforge
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      const { error } = await insforge
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', user.id);
      if (error) throw error;
    } else {
      const { error } = await insforge
        .from('profiles')
        .insert([{ id: user.id, full_name: name, plan: 'pro' }]);
      if (error) throw error;
    }
  } catch (err) {
    console.warn("Failed to sync upgraded plan to database:", err);
  }

  // Dispatch global event for header update
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("planChanged", { detail: "pro" }));
  }
}



