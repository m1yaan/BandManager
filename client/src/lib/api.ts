const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type UserRole = 'manager' | 'artist';

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
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

export type MessageStatus = 'new' | 'saved' | 'accepted' | 'declined';

export type Message = {
  id: string;
  user_id: string;
  sender_name: string;
  sender_role: string;
  organization: string;
  city: string;
  avatar_url: string;
  message_text: string;
  proposed_date: string | null;
  proposed_fee: number;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  city: string;
  start_date: string;
  end_date: string | null;
  band_name?: string;
  sender_name?: string;
  type: 'tour' | 'stop' | 'offer';
  color: string;
  tour_id?: string;
};

export type SearchResults = {
  bands: { id: string; name: string; country: string; rating: number | null }[];
  singers: { id: string; name: string }[];
  songs: { id: string; title: string; composer: string }[];
  tours: { id: string; program_name: string; city: string; start_date: string | null }[];
  messages: { id: string; sender_name: string; organization: string; city: string; status: string }[];
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
  if (!res.ok) throw new Error(data.error ?? `Ошибка: ${res.status}`);
  return data as T;
}

export const authApi = {
  register: (email: string, password: string, role: UserRole = 'manager') =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, role }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),
  updateProfile: (p: { name?: string; avatar_url?: string }) =>
    request<{ user: User }>('/api/auth/profile', {
      method: 'PUT', body: JSON.stringify(p),
    }),
};

export const dashboardApi = {
  getStats: () => request<DashboardStats>('/api/bands/stats'),
};

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

export const singersApi = {
  getAll: () => request<Singer[]>('/api/singers'),
  create: (name: string) =>
    request<Singer>('/api/singers', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, name: string) =>
    request<Singer>(`/api/singers/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/singers/${id}`, { method: 'DELETE' }),
};

export const songsApi = {
  getAll: () => request<Song[]>('/api/songs'),
  create: (p: { title: string; composer?: string; lyricist?: string; creation_year?: number | null }) =>
    request<Song>('/api/songs', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { title: string; composer?: string; lyricist?: string; creation_year?: number | null }) =>
    request<Song>(`/api/songs/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/songs/${id}`, { method: 'DELETE' }),
};

export const toursApi = {
  getAll: () => request<Tour[]>('/api/tours'),
  getSongs: (tourId: string) => request<Song[]>(`/api/tours/${tourId}/songs`),
  create: (p: { program_name: string; city?: string; start_date?: string | null; end_date?: string | null; avg_ticket_price?: number; band_id: string; songIds?: string[] }) =>
    request<Tour>('/api/tours', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { program_name: string; city?: string; start_date?: string | null; end_date?: string | null; avg_ticket_price?: number; band_id?: string; songIds?: string[] }) =>
    request<Tour>(`/api/tours/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/tours/${id}`, { method: 'DELETE' }),
  getStops: (tourId: string) => request<TourStop[]>(`/api/tours/${tourId}/stops`),
  addStop: (tourId: string, p: { city: string; event_date?: string | null; avg_ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops`, { method: 'POST', body: JSON.stringify(p) }),
  updateStop: (tourId: string, stopId: string, p: { city: string; event_date?: string | null; avg_ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteStop: (tourId: string, stopId: string) =>
    request<{ success: boolean }>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'DELETE' }),
  getFinances: (tourId: string) => request<Partial<Tour>>(`/api/tours/${tourId}/finances`),
  updateFinances: (tourId: string, p: Partial<Tour>) =>
    request<Tour>(`/api/tours/${tourId}/finances`, { method: 'PUT', body: JSON.stringify(p) }),
  getRider: (tourId: string) => request<RiderItem[]>(`/api/tours/${tourId}/rider`),
  addRiderItem: (tourId: string, p: { item_name: string; status?: string; photo_url?: string; note?: string }) =>
    request<RiderItem>(`/api/tours/${tourId}/rider`, { method: 'POST', body: JSON.stringify(p) }),
  updateRiderItem: (itemId: string, p: Partial<RiderItem>) =>
    request<RiderItem>(`/api/rider/${itemId}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteRiderItem: (itemId: string) =>
    request<{ success: boolean }>(`/api/rider/${itemId}`, { method: 'DELETE' }),
};

export const reportsApi = {
  songsByBandTours: (bandId: string) =>
    request<{ title: string; composer: string; creation_year: number | null }[]>(
      `/api/reports/songs-by-band-tours?bandId=${bandId}`),
  bandsByComposer: (composer: string) =>
    request<{ name: string; country: string; rating: number | null }[]>(
      `/api/reports/bands-by-composer?composer=${encodeURIComponent(composer)}`),
  songInfo: (title: string) =>
    request<{ title: string; composer: string; lyricist: string; creation_year: number | null; bands: string[] }[]>(
      `/api/reports/song-info?title=${encodeURIComponent(title)}`),
  topBandRepertoire: () =>
    request<{ title: string; composer: string; band_name: string; rating: number }[]>(
      '/api/reports/top-band-repertoire'),
  toursByBand: (bandId: string) =>
    request<{ program_name: string; city: string; start_date: string | null; end_date: string | null; avg_ticket_price: number }[]>(
      `/api/reports/tours-by-band?bandId=${bandId}`),
  songsBySinger: (singerId: string) =>
    request<{ title: string; composer: string; band_name: string }[]>(
      `/api/reports/songs-by-singer?singerId=${singerId}`),
};

export const messagesApi = {
  getAll: () => request<Message[]>('/api/messages'),
  getHistory: (params?: { filter?: string; search?: string; sort?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Message[]>(`/api/messages/history${q ? '?' + q : ''}`);
  },
  generate: () => request<Message[]>('/api/messages/generate', { method: 'POST' }),
  accept: (id: string, bandId?: string) =>
    request<{ message: Message; tour: Tour | null }>(`/api/messages/${id}/accept`, {
      method: 'POST', body: JSON.stringify({ bandId }),
    }),
  decline: (id: string) =>
    request<Message>(`/api/messages/${id}/decline`, { method: 'POST' }),
  save: (id: string) =>
    request<Message>(`/api/messages/${id}/save`, { method: 'POST' }),
};

export const notificationsApi = {
  getAll: () => request<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),
  markRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
};

export const searchApi = {
  search: (q: string) =>
    request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
};

export const calendarApi = {
  getEvents: (year?: number, month?: number) => {
    const q = year && month ? `?year=${year}&month=${month}` : '';
    return request<{ events: CalendarEvent[] }>(`/api/calendar${q}`);
  },
  checkConflicts: (params: { startDate: string; endDate?: string; bandId: string; tourId?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ conflicts: Tour[] }>(`/api/calendar/conflicts?${q}`);
  },
};
