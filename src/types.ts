export type Owner = { id: string; name: string; timezone: string }

export type EventType = {
  id: string
  title: string
  description: string
  durationMinutes: number
}

export type Slot = { eventTypeId: string; startsAt: string; endsAt: string }

export type Booking = {
  id: string
  eventTypeId: string
  eventTypeTitle: string
  startsAt: string
  endsAt: string
  guestName: string
  guestEmail: string
  createdAt: string
}

export type CreateEventTypeRequest = EventType
export type CreateBookingRequest = Pick<Booking, 'eventTypeId' | 'startsAt' | 'guestName' | 'guestEmail'>
export type ApiError = { code: string; message: string }
