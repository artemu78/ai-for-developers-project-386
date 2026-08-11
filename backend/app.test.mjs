import assert from 'node:assert/strict'
import test from 'node:test'
import { handler } from './app.mjs'

function request(method, path, body, queryStringParameters) {
  return handler({ rawPath: path, requestContext: { http: { method } }, queryStringParameters, body: body && JSON.stringify(body) })
}

test('lists event types and available slots', async () => {
  const types = await request('GET', '/public/event-types')
  assert.equal(types.statusCode, 200)
  const eventType = JSON.parse(types.body)[0]
  const slots = await request('GET', '/public/slots', null, { eventTypeId: eventType.id })
  assert.equal(slots.statusCode, 200)
  assert.ok(JSON.parse(slots.body).length > 0)
})

test('creates a booking and rejects the occupied slot', async () => {
  const slots = await request('GET', '/public/slots', null, { eventTypeId: 'intro-30' })
  const slot = JSON.parse(slots.body)[0]
  const input = { eventTypeId: 'intro-30', startsAt: slot.startsAt, guestName: 'Тестовый гость', guestEmail: 'guest@example.com' }
  const created = await request('POST', '/public/bookings', input)
  assert.equal(created.statusCode, 201)
  const conflict = await request('POST', '/public/bookings', input)
  assert.equal(conflict.statusCode, 409)
  assert.equal(JSON.parse(conflict.body).code, 'SLOT_ALREADY_BOOKED')
})
