import { randomUUID } from 'node:crypto'

const owner = { id: 'owner-1', name: 'Артём Рева', timezone: 'Europe/Moscow' }
const eventTypes = [
  { id: 'intro-30', title: 'Знакомство', description: 'Короткий звонок, чтобы познакомиться и обсудить задачу.', durationMinutes: 30 },
  { id: 'consultation-60', title: 'Консультация', description: 'Подробный разговор о проекте и следующих шагах.', durationMinutes: 60 },
]
const bookings = []
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'content-type': 'application/json; charset=utf-8',
}

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

function error(statusCode, code, message) {
  return response(statusCode, { code, message })
}

function moscowToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: owner.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function isPlainDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function overlaps(startsAt, endsAt, booking) {
  return startsAt < Date.parse(booking.endsAt) && endsAt > Date.parse(booking.startsAt)
}

function slotsFor(eventType, from, to) {
  const slots = []
  const times = ['10:00', '11:30', '14:00', '15:30']
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    for (const time of times) {
      // Europe/Moscow has used UTC+03:00 year-round since 2014.
      const startsAt = Date.parse(`${date}T${time}:00+03:00`)
      const endsAt = startsAt + eventType.durationMinutes * 60_000
      if (startsAt <= Date.now() || bookings.some((item) => overlaps(startsAt, endsAt, item))) continue
      slots.push({ eventTypeId: eventType.id, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() })
    }
  }
  return slots
}

function parseBody(event) {
  try { return JSON.parse(event.body ?? '{}') } catch { return null }
}

export async function handler(event) {
  const method = event.requestContext?.http?.method ?? event.httpMethod
  const path = event.rawPath ?? event.path ?? '/'
  const query = event.queryStringParameters ?? {}

  if (method === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (method === 'GET' && path === '/owner') return response(200, owner)
  if (method === 'GET' && path === '/owner/event-types') return response(200, eventTypes)
  if (method === 'GET' && path === '/public/event-types') return response(200, eventTypes)

  if (method === 'GET' && path.startsWith('/public/event-types/')) {
    const id = decodeURIComponent(path.slice('/public/event-types/'.length))
    const eventType = eventTypes.find((item) => item.id === id)
    return eventType ? response(200, eventType) : error(404, 'EVENT_TYPE_NOT_FOUND', 'Тип встречи не найден.')
  }

  if (method === 'POST' && path === '/owner/event-types') {
    const input = parseBody(event)
    if (!input || !input.id || !input.title || !input.description || !Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
      return error(400, 'INVALID_EVENT_TYPE', 'Заполните id, название, описание и корректную длительность встречи.')
    }
    if (eventTypes.some((item) => item.id === input.id)) return error(409, 'EVENT_TYPE_EXISTS', 'Тип встречи с таким id уже существует.')
    const created = { id: String(input.id), title: String(input.title).trim(), description: String(input.description).trim(), durationMinutes: input.durationMinutes }
    eventTypes.push(created)
    return response(201, created)
  }

  if (method === 'GET' && path === '/owner/bookings') {
    return response(200, bookings.filter((item) => Date.parse(item.endsAt) > Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
  }

  if (method === 'GET' && path === '/public/slots') {
    const eventType = eventTypes.find((item) => item.id === query.eventTypeId)
    if (!eventType) return error(404, 'EVENT_TYPE_NOT_FOUND', 'Тип встречи не найден.')
    const today = moscowToday()
    const lastDay = addDays(today, 13)
    const from = query.from ?? today
    const to = query.to ?? lastDay
    if (!isPlainDate(from) || !isPlainDate(to) || from < today || to > lastDay || from > to) {
      return error(400, 'INVALID_DATE_RANGE', 'Диапазон должен находиться в ближайшем 14-дневном окне.')
    }
    return response(200, slotsFor(eventType, from, to))
  }

  if (method === 'POST' && path === '/public/bookings') {
    const input = parseBody(event)
    if (!input || !input.eventTypeId || !input.startsAt || !input.guestName || !input.guestEmail) return error(400, 'INVALID_BOOKING', 'Заполните тип встречи, слот, имя и email.')
    if (!/^\S+@\S+\.\S+$/.test(input.guestEmail)) return error(400, 'INVALID_EMAIL', 'Укажите корректный email.')
    const eventType = eventTypes.find((item) => item.id === input.eventTypeId)
    if (!eventType) return error(404, 'EVENT_TYPE_NOT_FOUND', 'Тип встречи не найден.')

    const requestedStart = Date.parse(input.startsAt)
    const requestedEnd = requestedStart + eventType.durationMinutes * 60_000
    if (bookings.some((item) => overlaps(requestedStart, requestedEnd, item))) return error(409, 'SLOT_ALREADY_BOOKED', 'Выбранный слот уже занят.')
    const available = slotsFor(eventType, moscowToday(), addDays(moscowToday(), 13)).find((item) => item.startsAt === input.startsAt)
    if (!available) return error(400, 'INVALID_SLOT', 'Выберите доступный слот из календаря.')

    const booking = {
      id: randomUUID(), eventTypeId: eventType.id, eventTypeTitle: eventType.title,
      startsAt: available.startsAt, endsAt: available.endsAt,
      guestName: String(input.guestName).trim(), guestEmail: String(input.guestEmail).trim(), createdAt: new Date().toISOString(),
    }
    bookings.push(booking)
    return response(201, booking)
  }

  return error(404, 'NOT_FOUND', 'Маршрут не найден.')
}
