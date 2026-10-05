const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('kwamikon_token');

  // Com FormData o browser define o Content-Type multipart (com o boundary) sozinho.
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Ficheiro protegido (ex.: CSV do backoffice). Um link simples não leva o token no
 * cabeçalho e a API responde 401, por isso o ficheiro é pedido por fetch.
 */
async function requestBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('kwamikon_token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      message = (await res.json()).message ?? message;
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(message, res.status);
  }
  return res.blob();
}

export interface TicketType {
  id: string;
  name: string;
  description: string;
  refPrice: number;
  peopleCount: number;
  active: boolean;
  sortOrder: number;
}

export interface Reservation {
  id: string;
  fullName: string;
  contact: string;
  email: string | null;
  ticketEmailSentAt?: string | null;
  ticketTypeId: string;
  ticketType: TicketType;
  quantity: number;
  notes: string | null;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'UTILIZADO';
  /** Preenchido quando o sistema cancelou o pedido por falta de pagamento. */
  cancelReason?: 'PAGAMENTO_EXPIRADO' | 'PAGAMENTO_FALHOU' | null;
  qrCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
  payments?: Payment[];
  checkIns?: CheckIn[];
}

export interface CheckIn {
  id: string;
  eventDay: string;
  checkedInAt: string;
}

/** Resumo público do bilhete mostrado na página de sucesso da compra. */
export interface PurchasedTicket {
  id: string;
  fullName: string;
  ticketType: string;
  quantity: number;
  status: Reservation['status'];
  paymentStatus: PaymentStatus | null;
  amountKz: number;
  /** Email mascarado (ex.: "ma***@gmail.com"). */
  email: string | null;
  ticketEmailSent: boolean;
  /** Só existe depois de o pagamento estar confirmado. */
  qrDataUrl: string | null;
}

export interface GalleryPhoto {
  id: string;
  caption: string | null;
  createdAt: string;
  /** Endereço completo da imagem. */
  url: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface ProgramItem {
  id: string;
  /** Dia do evento (YYYY-MM-DD) e horas "14:00". */
  eventDay: string;
  startTime: string;
  endTime: string | null;
  title: string;
  zone: string | null;
  description: string | null;
}

export type ProgramItemInput = Omit<ProgramItem, 'id'>;

export type PaymentMethod = 'GPO' | 'REF';
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled';

/** Campos comuns às cobranças dos bilhetes e das inscrições nos torneios. */
export interface PaymentBase {
  id: string;
  method: PaymentMethod;
  amountKz: number;
  status: PaymentStatus;
  customerPhone: string | null;
  /** Página de pagamento da Vero, para onde o cliente é redireccionado. */
  paymentUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Payment extends PaymentBase {
  reservationId: string;
}

export interface TournamentPayment extends PaymentBase {
  entryId: string;
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  /** null: joga-se nos equipamentos da organização, sem plataforma anunciada. */
  platform: string | null;
  description: string | null;
  /** Dia do evento (YYYY-MM-DD) e hora ("14:00"); null enquanto não estiverem definidos. */
  eventDay: string | null;
  startTime: string | null;
  entryFeeKz: number;
  maxPlayers: number;
  registrationOpen: boolean;
  spotsLeft: number;
}

export interface AdminTournament extends Tournament {
  sortOrder: number;
  confirmed: number;
  pending: number;
}

export type TournamentInput = Omit<Tournament, 'id' | 'spotsLeft'>;

export type EntryStatus = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  fullName: string;
  gamerTag: string;
  contact: string;
  email: string;
  status: EntryStatus;
  cancelReason?: 'PAGAMENTO_EXPIRADO' | 'PAGAMENTO_FALHOU' | null;
  emailSentAt?: string | null;
  createdAt: string;
  confirmedAt: string | null;
  tournament: { id: string; name: string; entryFeeKz: number; game?: string; platform?: string | null };
  payments?: TournamentPayment[];
}

/** Resumo público da inscrição para a página de sucesso. */
export interface EntrySummary {
  id: string;
  fullName: string;
  gamerTag: string;
  tournament: { name: string; game: string; platform: string | null; eventDay: string | null; startTime: string | null };
  status: EntryStatus;
  paymentStatus: PaymentStatus | null;
  amountKz: number;
  /** Email mascarado (ex.: "ma***@gmail.com"). */
  email: string;
  emailSent: boolean;
}

export const api = {
  ticketTypes: {
    list: () => request<TicketType[]>('/ticket-types'),
    listAll: () => request<TicketType[]>('/ticket-types/all'),
    updatePrice: (id: string, refPrice: number) =>
      request<TicketType>(`/ticket-types/${encodeURIComponent(id)}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ refPrice }),
      }),
  },
  gallery: {
    list: () =>
      request<Array<Omit<GalleryPhoto, 'url'> & { path: string }>>('/gallery').then((photos) =>
        photos.map(({ path, ...photo }) => ({ ...photo, url: `${API_URL}${path}` })),
      ),
    upload: (photo: File, caption?: string) => {
      const form = new FormData();
      form.append('photo', photo);
      if (caption) form.append('caption', caption);
      return request<unknown>('/gallery', { method: 'POST', body: form });
    },
    updateCaption: (id: string, caption: string) =>
      request<unknown>(`/gallery/${id}`, { method: 'PATCH', body: JSON.stringify({ caption }) }),
    remove: (id: string) => request<void>(`/gallery/${id}`, { method: 'DELETE' }),
  },
  faq: {
    list: () => request<FaqItem[]>('/faq'),
    create: (data: { question: string; answer: string }) =>
      request<FaqItem>('/faq', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { question: string; answer: string }) =>
      request<FaqItem>(`/faq/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    reorder: (ids: string[]) => request<FaqItem[]>('/faq/order', { method: 'PUT', body: JSON.stringify({ ids }) }),
    remove: (id: string) => request<void>(`/faq/${id}`, { method: 'DELETE' }),
  },
  reservations: {
    create: (data: {
      fullName: string;
      contact: string;
      email: string;
      ticketTypeId: string;
      quantity: number;
      notes?: string;
    }) =>
      request<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(data) }),
    list: (filters: { status?: string; ticketTypeId?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.ticketTypeId) params.set('ticketTypeId', filters.ticketTypeId);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();
      return request<Reservation[]>(`/reservations${qs ? `?${qs}` : ''}`);
    },
    updateStatus: (id: string, status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO') =>
      request<Reservation>(`/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    qrCode: (id: string) => request<{ dataUrl: string }>(`/reservations/${id}/qrcode`),
    sendTicket: (id: string) => request<{ sentTo: string }>(`/reservations/${id}/send-ticket`, { method: 'POST' }),
    metrics: () =>
      request<{
        total: number;
        byStatus: { status: string; reservas: number; pessoas: number }[];
        byType: { ticketTypeId: string; name: string; reservas: number; pessoas: number }[];
      }>('/reservations/metrics'),
    exportCsv: () => requestBlob('/reservations/export.csv'),
  },
  payments: {
    create: (data: { reservationId: string; method: PaymentMethod; phone: string }) =>
      request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    status: (id: string) => request<Payment>(`/payments/${id}`),
    ticket: (reservationId: string) => request<PurchasedTicket>(`/payments/reservation/${reservationId}/ticket`),
    syncReservation: (reservationId: string) =>
      request<Reservation>(`/payments/reservation/${reservationId}/sync`, { method: 'POST' }),
  },
  program: {
    list: () => request<{ eventDays: string[]; items: ProgramItem[] }>('/program'),
    create: (data: ProgramItemInput) =>
      request<ProgramItem>('/program', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: ProgramItemInput) =>
      request<ProgramItem>(`/program/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/program/${id}`, { method: 'DELETE' }),
  },
  tournaments: {
    list: () => request<Tournament[]>('/tournaments'),
    admin: () => request<{ eventDays: string[]; tournaments: AdminTournament[] }>('/tournaments/admin'),
    create: (data: TournamentInput) =>
      request<AdminTournament>('/tournaments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: TournamentInput) =>
      request<AdminTournament>(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/tournaments/${id}`, { method: 'DELETE' }),
    register: (tournamentId: string, data: { fullName: string; gamerTag: string; contact: string; email: string }) =>
      request<TournamentEntry>(`/tournaments/${tournamentId}/entries`, { method: 'POST', body: JSON.stringify(data) }),
  },
  tournamentEntries: {
    list: (tournamentId?: string) =>
      request<TournamentEntry[]>(
        `/tournament-entries${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''}`,
      ),
    summary: (id: string) => request<EntrySummary>(`/tournament-entries/${id}/summary`),
    updateStatus: (id: string, status: EntryStatus) =>
      request<TournamentEntry>(`/tournament-entries/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    sync: (id: string) => request<TournamentEntry>(`/tournament-entries/${id}/sync`, { method: 'POST' }),
    exportCsv: (tournamentId?: string) =>
      requestBlob(
        `/tournament-entries/export.csv${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''}`,
      ),
  },
  tournamentPayments: {
    create: (data: { entryId: string; method: PaymentMethod; phone: string }) =>
      request<TournamentPayment>('/tournament-payments', { method: 'POST', body: JSON.stringify(data) }),
    status: (id: string) => request<TournamentPayment>(`/tournament-payments/${id}`),
  },
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    me: () => request<{ sub: string; email: string; name: string; role: string }>('/auth/me'),
  },
  checkin: {
    validate: (code: string, scannedAt?: string) =>
      request<
        | {
            outcome: 'ok';
            fullName: string;
            ticketType: string;
            quantity: number;
            checkedInAt: string;
            eventDay: string;
            remainingDays: string[];
          }
        | { outcome: 'already_used'; fullName: string; ticketType: string; checkedInAt: string | null; eventDay: string }
        | { outcome: 'not_event_day'; day: string; eventDays: string[] }
        | { outcome: 'not_confirmed'; status: string }
        | { outcome: 'not_found' }
      >('/checkin', { method: 'POST', body: JSON.stringify({ code, scannedAt }) }),
    today: () =>
      request<{ day: string; isEventDay: boolean; eventDays: string[]; entries: number }>('/checkin/today'),
  },
};

export { API_URL };
