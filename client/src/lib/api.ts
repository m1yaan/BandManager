const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
};

export type Band = {
  id: string;
  name: string;
  foundation_year: number | null;
  country: string;
  rating: number | null;
  created_by: string;
  created_at: string;
};

export type Singer = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  composer: string;
  lyricist: string;
  creation_year: number | null;
  created_by: string;
  created_at: string;
};

export type Tour = {
  id: string;
  program_name: string;
  city: string;
  start_date: string | null;
  end_date: string | null;
  avg_ticket_price: number;
  band_id: string;
  band?: Band;
  created_by: string;
  created_at: string;
  // finances
  fee?: number;
  tax_percent?: number;
  agent_commission_percent?: number;
  transport?: number;
  per_diem?: number;
  hotel?: number;
  other_expenses?: number;
};

export type TourStop = {
  id: string;
  tour_id: string;
  city: string;
  event_date: string | null;
  avg_ticket_price: number;
  created_at: string;
};

export type RiderItem = {
  id: string;
  tour_id: string;
  item_name: string;
  status: 'pending' | 'confirmed' | 'problem';
  photo_url: string;
  note: string;
  created_at: string;
};

export type DashboardStats = {
  bands: number;
  singers: number;
  songs: number;
  tours: number;
  topBands: { name: string; rating: number | null; country: string }[];
};

// ── Core ──────────────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
  if (!res.ok) throw new Error(data.error ?? `Ошибка запроса: ${res.status}`);
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),
  updateProfile: (payload: { name?: string; avatar_url?: string }) =>
    request<{ user: User }>('/api/auth/profile', {
      method: 'PUT', body: JSON.stringify(payload),
    }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => request<DashboardStats>('/api/bands/stats'),
};

// ── Bands ─────────────────────────────────────────────────────────────────────

export const bandsApi = {
  getAll: () => request<Band[]>('/api/bands'),
  getDetails: (id: string) =>
    request<{ members: Singer[]; repertoire: Song[] }>(`/api/bands/${id}/details`),
  create: (p: { name: string; foundation_year?: number | null; country?: string; rating?: number | null; memberIds?: string[]; songIds?: string[] }) =>
    request<Band>('/api/bands', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { name: string; foundation_year?: number | null; country?: string; rating?: number | null; memberIds?: string[]; songIds?: string[] }) =>
    request<Band>(`/api/bands/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/bands/${id}`, { method: 'DELETE' }),
};

// ── Singers ───────────────────────────────────────────────────────────────────

export const singersApi = {
  getAll: () => request<Singer[]>('/api/singers'),
  create: (name: string) =>
    request<Singer>('/api/singers', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, name: string) =>
    request<Singer>(`/api/singers/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/singers/${id}`, { method: 'DELETE' }),
};

// ── Songs ─────────────────────────────────────────────────────────────────────

export const songsApi = {
  getAll: () => request<Song[]>('/api/songs'),
  create: (p: { title: string; composer?: string; lyricist?: string; creation_year?: number | null }) =>
    request<Song>('/api/songs', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { title: string; composer?: string; lyricist?: string; creation_year?: number | null }) =>
    request<Song>(`/api/songs/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/songs/${id}`, { method: 'DELETE' }),
};

// ── Tours ─────────────────────────────────────────────────────────────────────

export const toursApi = {
  getAll: () => request<Tour[]>('/api/tours'),
  getSongs: (tourId: string) => request<Song[]>(`/api/tours/${tourId}/songs`),
  create: (p: { program_name: string; city?: string; start_date?: string | null; end_date?: string | null; avg_ticket_price?: number; band_id: string; songIds?: string[] }) =>
    request<Tour>('/api/tours', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { program_name: string; city?: string; start_date?: string | null; end_date?: string | null; avg_ticket_price?: number; band_id?: string; songIds?: string[] }) =>
    request<Tour>(`/api/tours/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/tours/${id}`, { method: 'DELETE' }),

  // Stops
  getStops: (tourId: string) => request<TourStop[]>(`/api/tours/${tourId}/stops`),
  addStop: (tourId: string, p: { city: string; event_date?: string | null; avg_ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops`, { method: 'POST', body: JSON.stringify(p) }),
  updateStop: (tourId: string, stopId: string, p: { city: string; event_date?: string | null; avg_ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteStop: (tourId: string, stopId: string) =>
    request<{ success: boolean }>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'DELETE' }),

  // Finances
  getFinances: (tourId: string) => request<Partial<Tour>>(`/api/tours/${tourId}/finances`),
  updateFinances: (tourId: string, p: Partial<Tour>) =>
    request<Tour>(`/api/tours/${tourId}/finances`, { method: 'PUT', body: JSON.stringify(p) }),

  // Rider
  getRider: (tourId: string) => request<RiderItem[]>(`/api/tours/${tourId}/rider`),
  addRiderItem: (tourId: string, p: { item_name: string; status?: string; photo_url?: string; note?: string }) =>
    request<RiderItem>(`/api/tours/${tourId}/rider`, { method: 'POST', body: JSON.stringify(p) }),
  updateRiderItem: (itemId: string, p: Partial<RiderItem>) =>
    request<RiderItem>(`/api/rider/${itemId}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteRiderItem: (itemId: string) =>
    request<{ success: boolean }>(`/api/rider/${itemId}`, { method: 'DELETE' }),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  songsByBandTours: (bandId: string) =>
    request<{ title: string; composer: string; creation_year: number | null }[]>(
      `/api/reports/songs-by-band-tours?bandId=${bandId}`
    ),
  bandsByComposer: (composer: string) =>
    request<{ name: string; country: string; rating: number | null }[]>(
      `/api/reports/bands-by-composer?composer=${encodeURIComponent(composer)}`
    ),
  songInfo: (title: string) =>
    request<{ title: string; composer: string; lyricist: string; creation_year: number | null; bands: string[] }[]>(
      `/api/reports/song-info?title=${encodeURIComponent(title)}`
    ),
  topBandRepertoire: () =>
    request<{ title: string; composer: string; band_name: string; rating: number }[]>(
      '/api/reports/top-band-repertoire'
    ),
  toursByBand: (bandId: string) =>
    request<{ program_name: string; city: string; start_date: string | null; end_date: string | null; avg_ticket_price: number }[]>(
      `/api/reports/tours-by-band?bandId=${bandId}`
    ),
  songsBySinger: (singerId: string) =>
    request<{ title: string; composer: string; band_name: string }[]>(
      `/api/reports/songs-by-singer?singerId=${singerId}`
    ),
};