/**
 * AetherWave API Client — typed fetch wrapper for all endpoints.
 *
 * CSRF protection (double-submit cookie pattern):
 *   1. On the first GET the backend sets a `csrf_token` cookie (HttpOnly=false).
 *   2. On every state-mutating request (POST/PATCH/PUT/DELETE) this client reads
 *      the cookie value and sends it back as the `X-CSRF-Token` header.
 *   3. The CSRFMiddleware validates that cookie == header before processing the
 *      request.  A cross-origin attacker's page cannot read the cookie (same-
 *      origin policy), so cannot forge the header even with CORS credentials.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/** HTTP methods that mutate state and therefore require the CSRF header. */
const CSRF_MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Read a named cookie from `document.cookie`.
 * Returns an empty string when the cookie is absent or when running in an
 * environment where `document` is not available (e.g. SSR/tests).
 */
function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase();

  // Build headers — start with Content-Type, then inject CSRF token when needed.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (CSRF_MUTATION_METHODS.has(method)) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    // If token is absent the backend will return 403; the user needs to reload.
    // This should be rare: the token is set on the first GET to any endpoint.
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    // credentials:'include' ensures the csrf_token cookie is sent cross-origin
    // (required when API and frontend run on different ports in development).
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface Station {
  id: string;
  name: string;
  tagline: string;
  description: string;
  frequency: string;
  genre: string;
  sub_genres: string;
  mood: string;
  era: string;
  broadcast_style: string;
  color_palette: string;
  art_path: string | null;
  style_seed: string;
  location: string;
  founded_year: string;
  owner: string;
  lore_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  name: string;
  display_name: string;
  artist_type: string;
  station_id: string | null;
  bio: string;
  personality: string;
  catchphrases: string;
  quirks: string;
  speaking_style: string;
  accent: string;
  age: string;
  gender: string;
  voice_seed: string;
  voice_description: string;
  portrait_path: string | null;
  appearance: string;
  genre: string;
  influences: string;
  signature_sound: string;
  rivals: string;
  allies: string;
  total_tracks: number;
  /** AI staging workflow status: "published" | "draft" | "pending_publish" */
  status: string;
  created_by: string | null;
  expires_at: string | null;
  undo_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Stage multiple AI-generated DJs for a specific station in parallel.
 * Each DJ is staged individually so partial failures don't block others.
 * Requires at least `name` in each artist record; `artist_type` defaults to "dj".
 *
 * @param artists  - Array of partial artist records from ChatAssistant
 * @param stationId - The station to associate all DJs with
 * @returns Array of successfully staged Artist records (throws on first error)
 */
export const stageBulkArtistsFromChat = async (
  artists: Array<Partial<Artist>>,
  stationId: string,
): Promise<Artist[]> => {
  return Promise.all(
    artists.map(artist =>
      request<Artist>('/api/v1/artists/staged', {
        method: 'POST',
        body: JSON.stringify({
          ...artist,
          station_id: stationId,
          artist_type: artist.artist_type || 'dj',
        }),
      }),
    ),
  );
};

export interface BulkRejectResult {
  deleted_count: number;
}

export interface BulkUndoResult {
  reverted_count: number;
}

export interface Brand {
  id: string;
  name: string;
  slogan: string;
  industry: string;
  description: string;
  tone: string;
  target_audience: string;
  ad_style: string;
  products: string;
  product_descriptions: string;
  logo_path: string | null;
  color_primary: string;
  color_secondary: string;
  founded_year: string;
  headquarters: string;
  reputation: string;
  controversies: string;
  lore_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Jingle {
  id: string;
  station_id: string;
  name: string;
  jingle_type: string;
  description: string;
  audio_path: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
}

export interface Draft {
  id: string;
  station_id: string | null;
  artist_id: string | null;
  brand_id: string | null;
  station_name: string;
  artist_name: string;
  genre: string;
  mood: string;
  items: string;
  script: string;
  backstory: string;
  market_research: string;
  filler_protocol: boolean;
  status: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  task_id: string;
  draft_id: string;
  status: string;
  progress: number;
  estimated_time_remaining?: number;
  output_file?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  API Methods
// ═══════════════════════════════════════════════════════════════════

export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // ── Stations ──────────────────────────────────────────────────
  createStation: (data: Partial<Station>) =>
    request<Station>('/api/v1/stations', { method: 'POST', body: JSON.stringify(data) }),

  listStations: () =>
    request<Station[]>('/api/v1/stations'),

  getStation: (id: string) =>
    request<Station>(`/api/v1/stations/${id}`),

  updateStation: (id: string, data: Partial<Station>) =>
    request<Station>(`/api/v1/stations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteStation: (id: string) =>
    request<{ deleted: string }>(`/api/v1/stations/${id}`, { method: 'DELETE' }),

  generateStationArt: (id: string) =>
    request<{ art_path: string }>(`/api/v1/stations/${id}/art`, { method: 'POST' }),

  listJingles: (stationId: string) =>
    request<Jingle[]>(`/api/v1/stations/${stationId}/jingles`),

  // ── Artists ───────────────────────────────────────────────────
  createArtist: (data: Partial<Artist>) =>
    request<Artist>('/api/v1/artists', { method: 'POST', body: JSON.stringify(data) }),

  listArtists: (stationId?: string) =>
    request<Artist[]>(`/api/v1/artists${stationId ? `?station_id=${stationId}` : ''}`),

  getArtist: (id: string) =>
    request<Artist>(`/api/v1/artists/${id}`),

  updateArtist: (id: string, data: Partial<Artist>) =>
    request<Artist>(`/api/v1/artists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteArtist: (id: string) =>
    request<{ deleted: string }>(`/api/v1/artists/${id}`, { method: 'DELETE' }),

  generatePortrait: (id: string) =>
    request<{ portrait_path: string }>(`/api/v1/artists/${id}/portrait`, { method: 'POST' }),

  // ── AI DJ Staging ─────────────────────────────────────────────
  /** Stage an AI-generated DJ for user review (status=draft). */
  stageArtist: (artistData: Partial<Artist>) =>
    request<Artist>('/api/v1/artists/staged', { method: 'POST', body: JSON.stringify(artistData) }),

  /** List staged (draft) artists with optional filters. */
  listStagedArtists: (filters?: { status?: string; stationId?: string }) => {
    const params = new URLSearchParams();
    params.set('status', filters?.status ?? 'draft');
    if (filters?.stationId) params.set('station_id', filters.stationId);
    return request<Artist[]>(`/api/v1/artists?${params.toString()}`);
  },

  /** Move a draft DJ to pending_publish and start 30-second undo window. */
  publishArtist: (artistId: string) =>
    request<Artist>(`/api/v1/artists/${artistId}/publish`, { method: 'POST' }),

  /** Revert a pending_publish DJ back to draft (must be within 30s window). */
  undoPublish: (artistId: string) =>
    request<Artist>(`/api/v1/artists/${artistId}/undo`, { method: 'POST' }),

  /** Atomically move multiple draft DJs to pending_publish with shared undo window. */
  bulkPublish: (artistIds: string[]) =>
    request<Artist[]>('/api/v1/artists/bulk-publish', { method: 'POST', body: JSON.stringify({ artist_ids: artistIds }) }),

  /** Hard-delete multiple draft DJs (ignores non-draft IDs). */
  bulkReject: (artistIds: string[]) =>
    request<BulkRejectResult>('/api/v1/artists/bulk-reject', { method: 'POST', body: JSON.stringify({ artist_ids: artistIds }) }),

  /**
   * Revert multiple pending_publish DJs back to draft within the undo window.
   * Only artists that are still in status='pending_publish' AND within their
   * undo_expires_at window are reverted; others are silently skipped.
   */
  bulkUndo: (artistIds: string[]) =>
    request<BulkUndoResult>('/api/v1/artists/bulk-undo', { method: 'POST', body: JSON.stringify({ artist_ids: artistIds }) }),

  /** Delete a single draft DJ by ID (only works for status=draft). */
  rejectArtist: (artistId: string) =>
    request<{ deleted: string }>(`/api/v1/artists/${artistId}`, { method: 'DELETE' }),

  // ── Brands ────────────────────────────────────────────────────
  createBrand: (data: Partial<Brand>) =>
    request<Brand>('/api/v1/brands', { method: 'POST', body: JSON.stringify(data) }),

  listBrands: () =>
    request<Brand[]>('/api/v1/brands'),

  getBrand: (id: string) =>
    request<Brand>(`/api/v1/brands/${id}`),

  updateBrand: (id: string, data: Partial<Brand>) =>
    request<Brand>(`/api/v1/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteBrand: (id: string) =>
    request<{ deleted: string }>(`/api/v1/brands/${id}`, { method: 'DELETE' }),

  // ── Jingles ───────────────────────────────────────────────────
  createJingle: (data: { station_id: string; name: string; jingle_type?: string; description?: string }) =>
    request<Jingle>('/api/v1/jingles', { method: 'POST', body: JSON.stringify(data) }),

  deleteJingle: (id: string) =>
    request<{ deleted: string }>(`/api/v1/jingles/${id}`, { method: 'DELETE' }),

  // ── Drafts ────────────────────────────────────────────────────
  ingest: (rows: Array<{ station_name: string; artist_name: string; genre?: string; mood?: string; items?: string; station_id?: string; artist_id?: string; brand_id?: string }>) =>
    request<{ created: number; draft_ids: string[] }>('/api/v1/ingest', { method: 'POST', body: JSON.stringify({ rows }) }),

  listDrafts: (filters?: { status?: string; station_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.station_id) params.set('station_id', filters.station_id);
    const qs = params.toString();
    return request<{ total: number; drafts: Draft[] }>(`/api/v1/drafts${qs ? `?${qs}` : ''}`);
  },

  updateDraft: (id: string, data: Partial<Draft>) =>
    request<Draft>(`/api/v1/drafts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDraft: (id: string) =>
    request<{ deleted: string }>(`/api/v1/drafts/${id}`, { method: 'DELETE' }),

  retryDraft: (id: string) =>
    request<Draft>(`/api/v1/drafts/${id}/retry`, { method: 'POST' }),

  commitDrafts: (draftIds: string[]) =>
    request<{ queued: number; tasks: Array<{ draft_id: string; task_id: string }> }>('/api/v1/commit', { method: 'POST', body: JSON.stringify({ draft_ids: draftIds }) }),

  // ── Tasks ─────────────────────────────────────────────────────
  getTask: (taskId: string) =>
    request<TaskStatus>(`/api/v1/tasks/${taskId}`),

  // ── Settings ──────────────────────────────────────────────────
  setApiKey: (apiKey: string) =>
    request<{ valid: boolean; message: string }>('/api/v1/settings/api-key', { method: 'POST', body: JSON.stringify({ api_key: apiKey }) }),

  checkApiKey: () =>
    request<{ configured: boolean; masked_key: string }>('/api/v1/settings/api-key'),

  exportData: () =>
    request<any>('/api/v1/settings/export'),

  getLogs: (lines: number = 500) =>
    request<{ logs: string }>(`/api/v1/settings/logs?lines=${lines}`),
};
