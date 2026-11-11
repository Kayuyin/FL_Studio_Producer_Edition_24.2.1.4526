import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import type { Mensaje, Solicitud } from './solicitudes'
import { enviarMensaje, observarMensajes, responderSolicitud } from './solicitudes'

function otherName(solicitud: Solicitud, uid: string): string {
  return solicitud.interesadoUid === uid ? solicitud.nombreAutor : solicitud.nombreInteresado
}
function statusName(status: Solicitud['estado']): string {
  return status === 'pendiente' ? 'Pendiente' : status === 'aceptada' ? 'Aceptada' : 'Rechazada'
}

function SolicitudItem({
  solicitud, user, onOpenChat, onChange,
}: {
  solicitud: Solicitud
  user: User
  onOpenChat: (id: string) => void
  onChange: (id: string, estado: 'aceptada' | 'rechazada') => Promise<void>
}) {
  const incoming = solicitud.autorPublicacionUid === user.uid
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function respond(estado: 'aceptada' | 'rechazada') {
    setBusy(true)
    setError('')
    try { await onChange(solicitud.id, estado) }
    catch { setError('No se pudo actualizar esta solicitud. Intenta otra vez.') }
    finally { setBusy(false) }
  }
  return <article className="request-item">
    <div className="request-item-head">
      <strong>{otherName(solicitud, user.uid)}</strong>
      <span className={`request-status request-status-${solicitud.estado}`}>{statusName(solicitud.estado)}</span>
    </div>
    <p className="request-title">{solicitud.tituloPublicacion}</p>
    <p className="muted">{solicitud.tipoSolicitud === 'postulacion'
      ? incoming ? 'Un jugador postula a una vacante de tu equipo.' : 'Tu postulación fue enviada al capitán.'
      : incoming ? 'Quiere contactar por tu publicación.' : 'Solicitud enviada al autor de esta publicación.'}</p>
    {solicitud.tipoSolicitud === 'postulacion' && incoming && solicitud.estado === 'pendiente' &&
      <p className="muted">Aceptar permite conversar por Mensajes; todavía no agrega automáticamente al jugador a la plantilla.</p>}
    <div className="request-actions">
      {incoming && solicitud.estado === 'pendiente' && <>
        <button type="button" className="primary-button" disabled={busy} onClick={() => { void respond('aceptada') }}>{solicitud.tipoSolicitud === 'postulacion' ? 'Aceptar contacto' : 'Aceptar'}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => { void respond('rechazada') }}>Rechazar</button>
      </>}
      {solicitud.estado === 'aceptada' && <button type="button" className="secondary-button" onClick={() => onOpenChat(solicitud.id)}>Abrir conversación →</button>}
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
  </article>
}

export function Matches({
  user, solicitudes, loading, error, onOpenChat,
}: {
  user: User
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  onOpenChat: (solicitudId: string) => void
}) {
  const recibidas = solicitudes.filter((item) => item.autorPublicacionUid === user.uid)
  const enviadas = solicitudes.filter((item) => item.interesadoUid === user.uid)
  async function changeRequest(id: string, estado: 'aceptada' | 'rechazada') {
    await responderSolicitud(id, estado)
  }
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">CONECTA CON LA COMUNIDAD</p><h1>Mis matches</h1><p className="muted">Revisa solicitudes, postulaciones a equipos y contactos enviados o recibidos.</p></div></div>
    {error && <p role="alert" className="posts-feedback posts-error">{error}</p>}
    {loading && !error && <p className="posts-feedback" role="status">Cargando tus solicitudes…</p>}
    <section className="requests-section">
      <h2>Solicitudes recibidas <span className="request-count">{recibidas.length}</span></h2>
      {recibidas.length
        ? <div className="requests-grid">{recibidas.map((item) => <SolicitudItem key={item.id} solicitud={item} user={user} onOpenChat={onOpenChat} onChange={changeRequest} />)}</div>
        : <p className="posts-feedback">Cuando alguien presione «Me interesa» en una de tus publicaciones, aparecerá aquí.</p>}
    </section>
    <section className="requests-section">
      <h2>Solicitudes enviadas <span className="request-count">{enviadas.length}</span></h2>
      {enviadas.length
        ? <div className="requests-grid">{enviadas.map((item) => <SolicitudItem key={item.id} solicitud={item} user={user} onOpenChat={onOpenChat} onChange={changeRequest} />)}</div>
        : <p className="posts-feedback">Visita Explorar: los jugadores pueden «Postular al equipo» en vacantes de capitanes y otras cuentas pueden utilizar «Me interesa».</p>}
    </section>
  </div>
}

export function Mensajes({
  user, solicitudes, initialSelectedId, embedded = false,
}: {
  user: User
  solicitudes: Solicitud[]
  initialSelectedId?: string
  embedded?: boolean
}) {
  const conversations = solicitudes.filter((item) => item.estado === 'aceptada')
  const [selectedId, setSelectedId] = useState(initialSelectedId || '')
  const activeId = conversations.some((item) => item.id === selectedId)
    ? selectedId : (conversations[0]?.id ?? '')
  const current = conversations.find((item) => item.id === activeId)
  const [messages, setMessages] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!activeId) { setMessages([]); setMessageError(''); return }
    const stop = observarMensajes(activeId, (items) => {
      setMessages(items)
      setLoading(false)
      setMessageError('')
    }, () => {
      setLoading(false)
      setMessageError('No se pudieron leer los mensajes. Verifica las reglas de Firestore.')
    })
    return stop
  }, [activeId])

  function chooseConversation(id: string) {
    setLoading(true)
    setSelectedId(id)
    setMessages([])
    setMessageError('')
    setDraft('')
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current || !draft.trim() || sending) return
    setSending(true)
    setMessageError('')
    try {
      await enviarMensaje(current.id, user, draft)
      setDraft('')
    } catch {
      setMessageError('No se pudo enviar el mensaje. Intenta nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return <div className={embedded ? 'chat-subview' : 'page'}>
    {embedded
      ? <h2 className="chat-section-title">Conversaciones activas <span className="request-count">{conversations.length}</span></h2>
      : <div className="page-heading"><div><p className="eyebrow">CONVERSACIONES</p><h1>Mensajes</h1><p className="muted">Solo puedes conversar cuando el autor acepta una solicitud de interés.</p></div></div>}
    {conversations.length === 0
      ? <p className="posts-feedback">{embedded
        ? 'Todavía no tienes conversaciones. Cuando aceptes una solicitud para tu cancha, podrás escribir aquí.'
        : 'Todavía no tienes conversaciones abiertas. Envía una solicitud desde Explorar o acepta una en Matches.'}</p>
      : <div className="chat-layout">
        <aside className="chat-sidebar" aria-label="Conversaciones">
          {conversations.map((item) => <button
            key={item.id}
            type="button"
            className={item.id === activeId ? 'chat-peer active' : 'chat-peer'}
            onClick={() => chooseConversation(item.id)}
          >
            <strong>{otherName(item, user.uid)}</strong>
            <small>{item.tituloPublicacion}</small>
          </button>)}
        </aside>
        <section className="chat-panel">
          <header className="chat-header"><strong>{current ? otherName(current, user.uid) : 'Conversación'}</strong><span>{current?.tituloPublicacion}</span></header>
          <div className="chat-messages" aria-live="polite">
            {loading && <p className="muted">Cargando mensajes…</p>}
            {!loading && messages.length === 0 && <p className="muted">La conversación está abierta. Envía el primer mensaje.</p>}
            {messages.map((message) => <div key={message.id} className={`chat-bubble ${message.autorUid === user.uid ? 'mine' : ''}`}>
              <p>{message.texto}</p>
              <small>{message.creadoEn?.toDate().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) ?? 'Enviando…'}</small>
            </div>)}
          </div>
          {messageError && <p role="alert" className="posts-feedback posts-error">{messageError}</p>}
          <form onSubmit={(event) => { void send(event) }} className="chat-compose">
            <input aria-label="Escribir mensaje" maxLength={1000} placeholder="Escribe tu mensaje..." value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button className="primary-button" disabled={sending || !draft.trim()} type="submit">{sending ? 'Enviando…' : 'Enviar'}</button>
          </form>
        </section>
      </div>}
  </div>
}

/**
 * Bandeja única del dueño de cancha: aceptar solicitudes recibidas
 * y conversar con personas cuyo contacto ya fue aceptado.
 * No muestra solicitudes enviadas ni opciones para buscar anuncios ajenos.
 */
export function ConversacionesCanchas({
  user, solicitudes, loading, error, initialSelectedId,
}: {
  user: User
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  initialSelectedId?: string
}) {
  const recibidas = solicitudes.filter((item) => item.autorPublicacionUid === user.uid)
  const pendientes = recibidas.filter((item) => item.estado === 'pendiente')
  const [focusedChatId, setFocusedChatId] = useState(initialSelectedId || '')

  async function changeRequest(id: string, estado: 'aceptada' | 'rechazada') {
    await responderSolicitud(id, estado)
    if (estado === 'aceptada') setFocusedChatId(id)
  }

  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">GESTIÓN DE CONTACTOS</p><h1>Conversaciones de mis canchas</h1>
        <p className="muted">Recibe solicitudes por tus anuncios. Acepta una para iniciar el chat con la persona interesada.</p></div>
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {loading && !error && <p className="posts-feedback" role="status">Cargando solicitudes de tus canchas…</p>}
    <section className="requests-section">
      <h2>Solicitudes por responder <span className="request-count">{pendientes.length}</span></h2>
      {pendientes.length
        ? <div className="requests-grid">
            {pendientes.map((item) => <SolicitudItem key={item.id} solicitud={item} user={user}
              onOpenChat={setFocusedChatId} onChange={changeRequest} />)}
          </div>
        : <p className="posts-feedback">No tienes solicitudes pendientes. Cuando alguien quiera contactar por un anuncio de cancha, aparecerá aquí.</p>}
    </section>
    <section className="requests-section">
      <Mensajes key={focusedChatId} user={user} solicitudes={recibidas} initialSelectedId={focusedChatId} embedded />
    </section>
  </div>
}
