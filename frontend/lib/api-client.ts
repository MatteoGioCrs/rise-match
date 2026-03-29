const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rise_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---- Types ----

export interface MatchSummary {
  id: number;
  university_id: number;
  university_name: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  country: string;
  fit_score: number;
  scholarship_est: number | null;
  score_vacancy: number | null;
  score_conf: number | null;
  score_academic: number | null;
  is_priority: boolean;
  is_blurred: boolean;
  coach_head_email: string | null;
}

export interface MatchDetail extends MatchSummary {
  score_conversion: number | null;
  score_relay: number | null;
  score_progress: number | null;
  vacancy_detail: Record<string, unknown> | null;
  relay_detail: Record<string, unknown> | null;
}

export interface SwimmerProfile {
  id: string;
  first_name: string;
  last_name: string;
  ffn_licence: string | null;
  birth_date: string | null;
  club_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  wingspan_cm: number | null;
  bac_mention: string | null;
  toefl_score: number | null;
  sat_score: number | null;
  target_majors: string[] | null;
  target_divisions: string[] | null;
  is_minor: boolean;
}

export interface AuthResponse {
  token: string;
  swimmer_id: string;
  email: string;
  plan: string;
  first_name: string;
  last_name: string;
}

export interface GenerateEmailResponse {
  subject: string;
  body: string;
  recipients: string[];
  is_ncaa_shutdown: boolean;
  shutdown_warning: string | null;
}

export interface SendEmailPayload {
  swimmer_id: string;
  university_id: number;
  subject: string;
  body: string;
  recipients: string[];
}

// ---- API Methods ----

export const api = {
  // Auth
  async register(data: Record<string, unknown>): Promise<AuthResponse> {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async me(): Promise<{ swimmer_id: string; email: string; plan: string; first_name: string; last_name: string; ffn_licence: string | null; is_minor: boolean }> {
    return request("/api/auth/me");
  },

  // Matches
  async getMatches(
    swimmerId: string,
    opts: { sort?: string; plan?: string } = {}
  ): Promise<MatchSummary[]> {
    const params = new URLSearchParams();
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.plan) params.set("plan", opts.plan);
    return request<MatchSummary[]>(`/api/matches/${swimmerId}?${params}`);
  },

  async getMatchDetail(swimmerId: string, universityId: number): Promise<MatchDetail> {
    const plan = localStorage.getItem("rise_plan") || "match";
    return request<MatchDetail>(`/api/matches/${swimmerId}/${universityId}?plan=${plan}`);
  },

  async recomputeMatches(swimmerId: string, gender = "M"): Promise<unknown> {
    return request<unknown>(
      `/api/matches/recompute?swimmer_id=${swimmerId}&gender=${gender}`,
      { method: "POST" }
    );
  },

  // Profile
  async getProfile(swimmerId: string): Promise<SwimmerProfile> {
    return request<SwimmerProfile>(`/api/swimmer/profile/${swimmerId}`);
  },

  async updateProfile(data: Record<string, unknown>): Promise<SwimmerProfile> {
    return request<SwimmerProfile>("/api/swimmer/profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async patchProfile(swimmerId: string, data: Record<string, unknown>): Promise<SwimmerProfile> {
    return request<SwimmerProfile>(`/api/swimmer/profile/${swimmerId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async syncFFN(swimmerId: string): Promise<{ job_id: string; status: string }> {
    return request<{ job_id: string; status: string }>(
      `/api/swimmer/sync-ffn?swimmer_id=${swimmerId}`,
      { method: "POST" }
    );
  },

  // Emails
  async generateEmail(swimmerId: string, universityId: number): Promise<GenerateEmailResponse> {
    return request<GenerateEmailResponse>("/api/emails/generate", {
      method: "POST",
      body: JSON.stringify({ swimmer_id: swimmerId, university_id: universityId }),
    });
  },

  async sendEmail(payload: SendEmailPayload): Promise<unknown> {
    return request<unknown>("/api/emails/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Universities
  async searchUniversities(filters: {
    division?: string;
    conference?: string;
    country?: string;
    major?: string;
    q?: string;
  }): Promise<unknown[]> {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v != null) as [string, string][]
    );
    return request<unknown[]>(`/api/universities/search?${params}`);
  },

  async getUniversity(id: number): Promise<unknown> {
    return request<unknown>(`/api/universities/${id}`);
  },
};
