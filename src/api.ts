import type {
  ApiError,
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  EventType,
  Owner,
  Slot,
} from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(body?.message ?? `Ошибка API: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  getOwner: () => request<Owner>('/owner'),
  getOwnerEventTypes: () => request<EventType[]>('/owner/event-types'),
  createEventType: (input: CreateEventTypeRequest) =>
    request<EventType>('/owner/event-types', { method: 'POST', body: JSON.stringify(input) }),
  getBookings: () => request<Booking[]>('/owner/bookings'),
  getPublicEventTypes: () => request<EventType[]>('/public/event-types'),
  getSlots: (eventTypeId: string) =>
    request<Slot[]>(`/public/slots?eventTypeId=${encodeURIComponent(eventTypeId)}`),
  createBooking: (input: CreateBookingRequest) =>
    request<Booking>('/public/bookings', { method: 'POST', body: JSON.stringify(input) }),
}
