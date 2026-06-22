const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type UserRole = 'manager' | 'artist' | 'admin';

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  is_blocked?: boolean;
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
  country: string;
  rating: number | null;
  bio: string;
  created_by: string;
  created_at: string;
  bands?: { id: string; name: string }[];
  songs?: { id: string; title: string; release_date?: string | null }[];
  tours?: Tour[];
  songCount?: number;
  bandCount?: number;
  tourCount?: number;
};

export type Contributor = {
  id: string;
  name: string;
  type: 'COMPOSER' | 'LYRICIST' | 'BOTH';
  created_by: string;
  created_at: string;
};

export type Song = {
  id: string;
  title: string;
  composer: string;
  lyricist: string;
  composer_id: string | null;
  lyricist_id: string | null;
  composer_name?: string;
  lyricist_name?: string;
  creation_year: number | null;
  release_date: string | null;
  created_by: string;
  created_at: string;
  singers?: { id: string; name: string }[];
  bands?: { id: string; name: string }[];
};

export type TourType = 'tour' | 'concert';

export type Tour = {
  id: string;
  program_name: string;
  type: TourType;
  city: string;
  venue: string;
  start_date: string | null;
  end_date: string | null;
  avg_ticket_price: number;
  stops_count?: number;
  band_id: string | null;
  band?: Band | null;
  singer_id: string | null;
  singer_data?: Singer | null;
  created_by: string;
  created_at: string;
  fee?: number;
  tax_percent?: number;
  agent_commission_percent?: number;
  transport?: number;
  per_diem?: number;
  hotel?: number;
  other_expenses?: number;
  city_coefficient?: number;
  base_ticket_price?: number;
  rider_status?: 'empty' | 'partial' | 'complete';
};

export type TourStop = {
  id: string;
  tour_id: string;
  city: string;
  venue: string;
  event_date: string | null;
  ticket_price: number;
  created_at: string;
};

export type TourFinances = {
  fee: number;
  tax_percent: number;
  agent_commission_percent: number;
  transport: number;
  per_diem: number;
  hotel: number;
  other_expenses: number;
  avg_ticket_price: number;
  city_coefficient: number;
  base_ticket_price: number;
  profit: number;
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

export type FinancialMonth = {
  month: string;
  доходы: number;
  расходы: number;
  прибыль: number;
};

export type MessageStatus = 'new' | 'deferred' | 'accepted' | 'declined';

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
  band_id: string | null;
  band_name?: string;
  singer_id: string | null;
  singer_name?: string;
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
  tour_id?: string | null;
  title: string;
  city: string;
  venue?: string;
  start_date: string;
  end_date: string | null;
  band_name?: string | null;
  singer_name?: string | null;
  type: 'concert' | 'stop' | 'offer';
  color: string;
};

export type SearchResults = {
  bands:    { id: string; name: string; country: string; rating: number | null }[];
  singers:  { id: string; name: string }[];
  songs:    { id: string; title: string; composer: string }[];
  tours:    { id: string; program_name: string; city: string; start_date: string | null }[];
  messages: { id: string; sender_name: string; organization: string; city: string; status: string }[];
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  file_url: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_note: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
};

export type AdminStats = {
  users:    { total: number; blocked: number };
  tickets:  { total: number; open: number };
  messages: { unread: number };
};

export type AuditLogEntry = {
  id: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditLogResponse = {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type AuditLogParams = {
  userId?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type RiderAttentionItem = {
  id: string;
  program_name: string;
  city: string;
  start_date: string | null;
  rider_status: 'empty' | 'partial' | 'complete';
  band_id: string | null;
  singer_id: string | null;
  band_name: string | null;
  singer_name: string | null;
};

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({ error: 'Неизвестная ошибка' }));
  if (!res.ok) throw new Error(data.error ?? `Ошибка: ${res.status}`);
  return data as T;
}

export const leadsApi = {
  create: (email: string) =>
    request<{ success: boolean }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

export const authApi = {
  register: (email: string, password: string, role: UserRole = 'manager') =>
    request<{ user: User }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, role }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
  updateProfile: (p: { name?: string; avatar_url?: string }) =>
    request<{ user: User }>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(p) }),
};

export const dashboardApi = {
  getStats: () => request<DashboardStats>('/api/bands/stats'),
  getFinancials: () => request<FinancialMonth[]>('/api/dashboard/financials'),
  getRiderAttention: () => request<RiderAttentionItem[]>('/api/dashboard/rider-attention'),
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

export const contributorsApi = {
  getAll: (params?: { type?: string; q?: string }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<Contributor[]>(`/api/contributors${q ? '?' + q : ''}`);
  },
  create: (p: { name: string; type?: string }) =>
    request<Contributor>('/api/contributors', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { name: string; type?: string }) =>
    request<Contributor>(`/api/contributors/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/contributors/${id}`, { method: 'DELETE' }),
};

export const singersApi = {
  getAll: () => request<Singer[]>('/api/singers'),
  getOne: (id: string) => request<Singer>(`/api/singers/${id}`),
  getBands: (id: string) => request<Band[]>(`/api/singers/${id}/bands`),
  getSongs: (id: string) => request<Song[]>(`/api/singers/${id}/songs`),
  create: (p: { name: string; country?: string; rating?: number | null; bio?: string; bandIds?: string[] }) =>
    request<Singer>('/api/singers', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { name: string; country?: string; rating?: number | null; bio?: string; bandIds?: string[] }) =>
    request<Singer>(`/api/singers/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/singers/${id}`, { method: 'DELETE' }),
};

export const songsApi = {
  getAll: () => request<Song[]>('/api/songs'),
  getSingers: (id: string) => request<Singer[]>(`/api/songs/${id}/singers`),
  getBands: (id: string) => request<Band[]>(`/api/songs/${id}/bands`),
  addSinger: (songId: string, singerId: string) =>
    request<{ success: boolean }>(`/api/songs/${songId}/singers`, {
      method: 'POST', body: JSON.stringify({ singerId }),
    }),
  removeSinger: (songId: string, singerId: string) =>
    request<{ success: boolean }>(`/api/songs/${songId}/singers/${singerId}`, { method: 'DELETE' }),
  create: (p: {
    title: string; composer_id?: string | null; lyricist_id?: string | null;
    release_date?: string | null; creation_year?: number | null;
    singerIds?: string[]; bandIds?: string[];
  }) => request<Song>('/api/songs', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: {
    title: string; composer_id?: string | null; lyricist_id?: string | null;
    release_date?: string | null; creation_year?: number | null;
    singerIds?: string[]; bandIds?: string[];
  }) => request<Song>(`/api/songs/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/songs/${id}`, { method: 'DELETE' }),
};

export async function downloadTourReport(tourId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/tours/${tourId}/export`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Ошибка скачивания' }));
    throw new Error(data.error ?? `Ошибка: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = 'tour-report.xlsx';
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const toursApi = {
  getAll: () => request<Tour[]>('/api/tours'),
  getSongs: (tourId: string) => request<Song[]>(`/api/tours/${tourId}/songs`),
  create: (p: {
    type?: TourType; program_name: string; city?: string; venue?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number; band_id?: string | null; singer_id?: string | null; songIds?: string[];
  }) => request<Tour>('/api/tours', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: {
    type?: TourType; program_name: string; city?: string; venue?: string;
    start_date?: string | null; end_date?: string | null;
    avg_ticket_price?: number; band_id?: string | null; singer_id?: string | null; songIds?: string[];
  }) => request<Tour>(`/api/tours/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/tours/${id}`, { method: 'DELETE' }),
  getStops: (tourId: string) => request<TourStop[]>(`/api/tours/${tourId}/stops`),
  addStop: (tourId: string, p: { city: string; venue?: string; event_date?: string | null; ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops`, { method: 'POST', body: JSON.stringify(p) }),
  updateStop: (tourId: string, stopId: string, p: { city: string; venue?: string; event_date?: string | null; ticket_price?: number }) =>
    request<TourStop>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteStop: (tourId: string, stopId: string) =>
    request<{ success: boolean }>(`/api/tours/${tourId}/stops/${stopId}`, { method: 'DELETE' }),
  getFinances: (tourId: string) => request<TourFinances>(`/api/tours/${tourId}/finances`),
  updateFinances: (tourId: string, p: Partial<TourFinances> & { base_ticket_price?: number }) =>
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
    request<{ title: string; composer_name: string; release_date: string | null }[]>(
      `/api/reports/songs-by-band-tours?bandId=${bandId}`),
  bandsByComposer: (composer: string) =>
    request<{ name: string; country: string; rating: number | null }[]>(
      `/api/reports/bands-by-composer?composer=${encodeURIComponent(composer)}`),
  songInfo: (title: string) =>
    request<{ title: string; composer_name: string; lyricist_name: string; release_date: string | null; bands: string[] }[]>(
      `/api/reports/song-info?title=${encodeURIComponent(title)}`),
  topBandRepertoire: () =>
    request<{ title: string; composer_name: string; lyricist_name: string; release_date: string | null; band_name: string; rating: number }[]>(
      '/api/reports/top-band-repertoire'),
  toursByBand: (bandId: string) =>
    request<{ program_name: string; city: string; start_date: string | null; end_date: string | null; avg_ticket_price: number }[]>(
      `/api/reports/tours-by-band?bandId=${bandId}`),
  songsBySinger: (singerId: string) =>
    request<{ title: string; composer_name: string; release_date: string | null }[]>(
      `/api/reports/songs-by-singer?singerId=${singerId}`),
};

export const messagesApi = {
  getAll: () => request<Message[]>('/api/messages'),
  getDeferred: () => request<Message[]>('/api/messages/deferred'),
  getRecent: () => request<Message[]>('/api/messages/recent'),
  getUnreadCount: () => request<{ count: number }>('/api/messages/unread-count'),
  getHistory: (params?: { filter?: string; search?: string; sort?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Message[]>(`/api/messages/history${q ? '?' + q : ''}`);
  },
  generate: () => request<Message[]>('/api/messages/generate', { method: 'POST' }),
  accept: (id: string) =>
    request<{ message: Message; tour: Tour | null; unreadCount: number }>(
      `/api/messages/${id}/accept`, { method: 'POST', body: JSON.stringify({}) }
    ),
  decline: (id: string) =>
    request<{ message: Message; unreadCount: number }>(`/api/messages/${id}/decline`, { method: 'POST' }),
  defer: (id: string) =>
    request<{ message: Message; unreadCount: number }>(`/api/messages/${id}/defer`, { method: 'POST' }),
};

export const notificationsApi = {
  getAll: () => request<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),
  markRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
};

export const searchApi = {
  search: (q: string) => request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
};

export const calendarApi = {
  getEvents: (year?: number, month?: number) => {
    const q = year && month ? `?year=${year}&month=${month}` : '';
    return request<{ events: CalendarEvent[] }>(`/api/calendar${q}`);
  },
  checkConflicts: (params: {
    startDate: string;
    endDate?: string;
    bandId?: string;
    singerId?: string;
    tourId?: string;
  }) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][]
      )
    ).toString();
    return request<{ conflicts: Tour[] }>(`/api/calendar/conflicts?${q}`);
  },
};

export const adminApi = {
  getStats: () => request<AdminStats>('/api/admin/stats'),
  getUsers: () => request<User[]>('/api/admin/users'),
  getUser: (id: string) => request<User>(`/api/admin/users/${id}`),
  updateUser: (id: string, data: { role: string }) =>
    request<User>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  blockUser: (id: string) => request<User>(`/api/admin/users/${id}/block`, { method: 'POST' }),
  unblockUser: (id: string) => request<User>(`/api/admin/users/${id}/unblock`, { method: 'POST' }),
  deleteUser: (id: string) => request<{ success: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  getUserBands: (id: string) => request<Band[]>(`/api/admin/users/${id}/bands`),
  getUserSingers: (id: string) => request<Singer[]>(`/api/admin/users/${id}/singers`),
  getUserSongs: (id: string) => request<Song[]>(`/api/admin/users/${id}/songs`),
  getUserTours: (id: string) => request<Tour[]>(`/api/admin/users/${id}/tours`),
  getUserMessages: (id: string) => request<Message[]>(`/api/admin/users/${id}/messages`),
  getAuditLog: (params?: AuditLogParams) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '') as [string, string][]
      )
    ).toString();
    return request<AuditLogResponse>(`/api/admin/audit${q ? '?' + q : ''}`);
  },
};

export const supportApi = {
  getAll: (status?: string) => {
    const q = status && status !== 'all' ? `?status=${status}` : '';
    return request<SupportTicket[]>(`/api/support${q}`);
  },
  getOne: (id: string) => request<SupportTicket>(`/api/support/${id}`),
  create: (p: { subject: string; message: string; file_url?: string }) =>
    request<SupportTicket>('/api/support', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, p: { status?: string; admin_note?: string }) =>
    request<SupportTicket>(`/api/support/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
};
