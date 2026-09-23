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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  ticketTypeId: string;
  ticketType: TicketType;
  quantity: number;
  notes: string | null;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'UTILIZADO';
  qrCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
}

export const api = {
  ticketTypes: {
    list: () => request<TicketType[]>('/ticket-types'),
  },
  reservations: {
    create: (data: { fullName: string; contact: string; ticketTypeId: string; quantity: number; notes?: string }) =>
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
    metrics: () =>
      request<{
        total: number;
        byStatus: { status: string; reservas: number; pessoas: number }[];
        byType: { ticketTypeId: string; name: string; reservas: number; pessoas: number }[];
      }>('/reservations/metrics'),
    exportUrl: () => `${API_URL}/reservations/export.csv`,
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
    validate: (code: string) =>
      request<
        | { outcome: 'ok'; fullName: string; ticketType: string; quantity: number; checkedInAt: string }
        | { outcome: 'already_used'; fullName: string; ticketType: string; checkedInAt: string | null }
        | { outcome: 'not_confirmed'; status: string }
        | { outcome: 'not_found' }
      >('/checkin', { method: 'POST', body: JSON.stringify({ code }) }),
  },
};

export { API_URL };
