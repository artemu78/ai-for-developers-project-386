import { FormEvent, useEffect, useState } from 'react'
import { api } from './api'
import type { Booking, EventType, Owner, Slot } from './types'

type View = 'book' | 'owner'

const formatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
})

function formatDate(value: string) {
  return formatter.format(new Date(value))
}

function App() {
  const [view, setView] = useState<View>('book')
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [owner, setOwner] = useState<Owner | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<EventType | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slot, setSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadPublic() {
    setLoading(true); setError('')
    try {
      const data = await api.getPublicEventTypes()
      setEventTypes(data)
      setSelected((current) => current ?? data[0] ?? null)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  async function loadOwner() {
    setLoading(true); setError('')
    try {
      const [profile, types, upcoming] = await Promise.all([
        api.getOwner(), api.getOwnerEventTypes(), api.getBookings(),
      ])
      setOwner(profile); setEventTypes(types); setBookings(upcoming)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void (view === 'book' ? loadPublic() : loadOwner()) }, [view])

  useEffect(() => {
    if (!selected || view !== 'book') return
    setSlot(null); setSlots([]); setError('')
    api.getSlots(selected.id).then(setSlots).catch((e: Error) => setError(e.message))
  }, [selected, view])

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !slot) return
    const form = new FormData(event.currentTarget)
    setError(''); setSuccess('')
    try {
      await api.createBooking({
        eventTypeId: selected.id,
        startsAt: slot.startsAt,
        guestName: String(form.get('name')),
        guestEmail: String(form.get('email')),
      })
      setSuccess(`Готово! Звонок назначен на ${formatDate(slot.startsAt)}.`)
      setSlots((items) => items.filter((item) => item.startsAt !== slot.startsAt))
      setSlot(null); event.currentTarget.reset()
    } catch (e) { setError((e as Error).message) }
  }

  async function createType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setError(''); setSuccess('')
    try {
      const created = await api.createEventType({
        id: crypto.randomUUID(),
        title: String(form.get('title')),
        description: String(form.get('description')),
        durationMinutes: Number(form.get('duration')),
      })
      setEventTypes((items) => [...items, created]); setSuccess('Тип встречи создан.')
      formElement.reset()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="#">call<span>•</span>cal</a>
        <nav aria-label="Основная навигация">
          <button className={view === 'book' ? 'active' : ''} onClick={() => setView('book')}>Записаться</button>
          <button className={view === 'owner' ? 'active' : ''} onClick={() => setView('owner')}>Мой календарь</button>
        </nav>
      </header>

      <main>
        {error && <div className="notice error" role="alert">{error}</div>}
        {success && <div className="notice success" role="status">{success}</div>}
        {loading ? <div className="loading">Загружаем календарь…</div> : view === 'book' ? (
          <section className="booking-page">
            <div className="intro">
              <p className="eyebrow">Личная встреча</p>
              <h1>Найдём время<br />для разговора.</h1>
              <p>Выберите формат и удобный свободный слот. Подтверждение появится сразу после записи.</p>
            </div>
            <div className="booking-card">
              <div className="step"><b>01</b><div><h2>Формат встречи</h2><div className="types">
                {eventTypes.map((type) => <button key={type.id} className={selected?.id === type.id ? 'selected' : ''} onClick={() => setSelected(type)}>
                  <span>{type.title}</span><small>{type.durationMinutes} мин</small>
                </button>)}
              </div>{selected && <p className="description">{selected.description}</p>}</div></div>
              <div className="step"><b>02</b><div><h2>Свободное время</h2><div className="slots">
                {slots.length ? slots.map((item) => <button key={item.startsAt} className={slot?.startsAt === item.startsAt ? 'selected' : ''} onClick={() => setSlot(item)}>{formatDate(item.startsAt)}</button>) : <p className="muted">Нет доступных слотов</p>}
              </div></div></div>
              <form className="step" onSubmit={book}><b>03</b><div><h2>Ваши данные</h2><div className="fields">
                <label>Имя<input name="name" required autoComplete="name" /></label>
                <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              </div><button className="primary" disabled={!slot}>Подтвердить запись <span>→</span></button></div></form>
            </div>
          </section>
        ) : (
          <section className="owner-page">
            <div className="owner-head"><div><p className="eyebrow">Панель владельца</p><h1>{owner?.name ?? 'Мой календарь'}</h1><p>{owner?.timezone}</p></div><div className="stat"><strong>{bookings.length}</strong><span>предстоящих встреч</span></div></div>
            <div className="owner-grid">
              <div className="panel"><div className="panel-title"><h2>Ближайшие звонки</h2></div>
                {bookings.length ? bookings.map((item) => <article className="meeting" key={item.id}><time>{formatDate(item.startsAt)}</time><div><strong>{item.eventTypeTitle}</strong><span>{item.guestName} · {item.guestEmail}</span></div></article>) : <p className="empty">Пока нет запланированных встреч.</p>}
              </div>
              <div className="panel"><div className="panel-title"><h2>Типы встреч</h2><span>{eventTypes.length}</span></div>
                {eventTypes.map((type) => <article className="event-type" key={type.id}><div><strong>{type.title}</strong><p>{type.description}</p></div><span>{type.durationMinutes} мин</span></article>)}
                <form className="new-type" onSubmit={createType}><h3>Новый тип встречи</h3><label>Название<input name="title" required /></label><label>Описание<textarea name="description" required /></label><label>Длительность, минут<input name="duration" type="number" min="1" defaultValue="30" required /></label><button className="primary">Создать <span>+</span></button></form>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer><span>© 2026 call•cal</span><span>Планируйте меньше. Разговаривайте больше.</span></footer>
    </div>
  )
}

export default App
