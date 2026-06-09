const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api/v1";

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
}

export function isLoggedIn(): boolean {
  return !!getToken();
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
  // Backend uses OAuth2PasswordRequestForm — needs form-encoded body
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
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
  return apiFetch<AuthTokens>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password }),
  });
}

export async function logout() {
  const refresh_token = getRefreshToken();
  if (refresh_token) {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }).catch(() => {});
  }
  clearTokens();
}

// ---------- Email endpoints ----------
export async function generateEmail(prompt: string) {
  return apiFetch<{ subject: string; body: string }>("/emails/generate", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function getEmails() {
  return apiFetch<{ emails: unknown[] }>("/emails/");
}

// ---------- Speech / Voice endpoints ----------
export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/speech/transcribe`, {
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
