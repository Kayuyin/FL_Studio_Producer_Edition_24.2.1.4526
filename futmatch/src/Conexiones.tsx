import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { Mensaje, Solicitud } from './solicitudes'
import { confirmarIncorporacion, enviarMensaje, observarMensajes, responderSolicitud } from './solicitudes'
import type { Publicacion } from './publicaciones'
import { obtenerPublicacionPorId } from './publicaciones'
import type { Partido } from './partidos'
import { programarPartido } from './partidos'
import type { EquipoRegistrado } from './equipos'
import { incorporarJugador } from './equipos'

function otherName(solicitud: Solicitud, uid: string): string {
  return solicitud.interesadoUid === uid ? solicitud.nombreAutor : solicitud.nombreInteresado
}
function statusName(status: Solicitud['estado']): string {
  return status === 'pendiente' ? 'Pendiente' : status === 'aceptada' ? 'Aceptada' : 'Rechazada'
}

function SolicitudItem({
  solicitud, user, onOpenChat, onChange, children,
}: {
  solicitud: Solicitud
  user: User
  onOpenChat: (id: string) => void
  onChange: (id: string, estado: 'aceptada' | 'rechazada') => Promise<void>
  children?: ReactNode
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
      {children}
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
  </article>
}

export function Matches({
  user, solicitudes, loading, error, onOpenChat, publicaciones, miEquipo,
  equipos, onOpenTeam, onFindCanchas, partidos, onOpenPartidos, onNotice,
}: {
  user: User
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  onOpenChat: (solicitudId: string) => void
  publicaciones: Publicacion[]
  miEquipo: EquipoRegistrado | null
  equipos: EquipoRegistrado[]
  onOpenTeam: (id: string) => void
  onFindCanchas: (partidoId: string) => void
  partidos: Partido[]
  onOpenPartidos: () => void
  onNotice: (text: string) => void
}) {
  const [creatingMatch, setCreatingMatch] = useState('')
  const [adding, setAdding] = useState('')
  const [confirming, setConfirming] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const recibidas = solicitudes.filter((item) => item.autorPublicacionUid === user.uid)
  const enviadas = solicitudes.filter((item) => item.interesadoUid === user.uid)
  async function changeRequest(id: string, estado: 'aceptada' | 'rechazada') {
    await responderSolicitud(id, estado)
  }
  async function confirmMembership(item: Solicitud) {
    setConfirming(item.id)
    setActionError('')
    setActionSuccess('')
    try {
      await confirmarIncorporacion(item.id)
      setActionSuccess('Confirmaste que quieres aparecer en la plantilla del equipo. Su responsable ya puede incorporarte.')
    } catch {
      setActionError('No se pudo confirmar la incorporación. Comprueba las reglas y que el contacto esté aceptado.')
    } finally { setConfirming('') }
  }
  async function addToRoster(item: Solicitud) {
    if (!miEquipo) return
    setAdding(item.id)
    setActionError('')
    setActionSuccess('')
    try {
      await incorporarJugador(miEquipo.id, item)
      setActionSuccess('Jugador incorporado a la plantilla de tu equipo. Puedes verlo en Mi equipo.')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setActionError(code === 'permission-denied'
        ? 'No se pudo incorporar al jugador. Comprueba que la solicitud aceptada corresponde a tu equipo y las nuevas reglas estén publicadas.'
        : 'No se pudo incorporar: el jugador puede estar ya registrado en la plantilla.')
    } finally { setAdding('') }
  }
  async function createMatch(item: Solicitud) {
    setCreatingMatch(item.id)
    setActionError('')
    setActionSuccess('')
    try {
      const post = publicaciones.find(entry => entry.id === item.publicacionId)
        ?? await obtenerPublicacionPorId(item.publicacionId)
      if (!post || post.categoria !== 'equipo_busca_rival') {
        throw new Error('El desafío ya no está disponible. No se pudo programar el partido.')
      }
      const local = equipos.find(e => e.id === post.equipoId)
      const visita = equipos.find(e => e.id === item.interesadoUid)
      if (!local || !visita) throw new Error('Los dos equipos deben estar registrados.')
      await programarPartido(item, post, local, visita, user.uid)
      onNotice('Partido propuesto. El otro equipo debe confirmarlo en Mis partidos.')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setActionError(code === 'permission-denied'
        ? 'Firestore rechazó la programación del partido. Revisa las reglas y los equipos participantes.'
        : (cause as Error).message || 'No fue posible programar el partido.')
    } finally { setCreatingMatch('') }
  }
  function actions(item: Solicitud) {
    if (item.estado !== 'aceptada') return null
    const post = publicaciones.find((entry) => entry.id === item.publicacionId)
    const canConfirm = !item.incorporacionConfirmada && (
      (item.tipoSolicitud === 'postulacion' && item.interesadoUid === user.uid)
      || (item.tipoSolicitud === 'contacto' && item.autorPublicacionUid === user.uid
        && post?.categoria === 'persona_busca_equipo')
    )
    const canIncorporate = !!miEquipo && !!post && item.incorporacionConfirmada && (
      (item.tipoSolicitud === 'postulacion' && item.autorPublicacionUid === user.uid
        && post.categoria === 'equipo_busca_jugadores' && post.equipoId === miEquipo.id)
      || (item.tipoSolicitud === 'contacto' && item.interesadoUid === user.uid
        && post.categoria === 'persona_busca_equipo')
    )
    const rivalMatch = post?.categoria === 'equipo_busca_rival'
      && item.tipoSolicitud === 'contacto' && miEquipo != null
    const partido = partidos.find(p => p.solicitudId === item.id)
    const otherUid = item.interesadoUid === user.uid ? item.autorPublicacionUid : item.interesadoUid
    const rival = equipos.find((team) => team.ownerUid === otherUid)
    return <>
      {canConfirm && <button type="button" className="primary-button" disabled={!!confirming}
        onClick={() => { void confirmMembership(item) }}>
        {confirming === item.id ? 'Confirmando…' : 'Confirmar ingreso a la plantilla'}
      </button>}
      {canIncorporate && <button type="button" className="secondary-button"
        disabled={!!adding} onClick={() => { void addToRoster(item) }}>
        {adding === item.id ? 'Incorporando…' : 'Añadir jugador a mi plantilla'}
      </button>}
      {rivalMatch && rival && <>
        <button type="button" className="secondary-button" onClick={() => onOpenTeam(rival.id)}>
          Ver equipo rival y plantilla
        </button>
        {!partido
          ? <button type="button" className="primary-button" disabled={!!creatingMatch}
              onClick={() => { void createMatch(item) }}>
              {creatingMatch === item.id ? 'Programando…' : 'Programar partido'}
            </button>
          : <button type="button" className="secondary-button" onClick={onOpenPartidos}>
              {partido.estado === 'propuesto' ? 'Confirmar propuesta en Mis partidos' : 'Ver partido'}
            </button>}
        {partido?.estado === 'confirmado' && !partido.reservaConfirmadaId &&
          <button type="button" className="primary-button" onClick={() => onFindCanchas(partido.id)}>
            ▣ Buscar cancha para el partido
          </button>}
      </>}
    </>
  }
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">CONECTA CON LA COMUNIDAD</p><h1>Mis matches</h1><p className="muted">Revisa solicitudes, postulaciones a equipos y contactos enviados o recibidos.</p></div></div>
    {error && <p role="alert" className="posts-feedback posts-error">{error}</p>}
    {loading && !error && <p className="posts-feedback" role="status">Cargando tus solicitudes…</p>}
    {actionError && <p className="posts-feedback posts-error" role="alert">{actionError}</p>}
    {actionSuccess && <p className="posts-feedback" role="status">{actionSuccess}</p>}
    <section className="requests-section">
      <h2>Solicitudes recibidas <span className="request-count">{recibidas.length}</span></h2>
      {recibidas.length
        ? <div className="requests-grid">{recibidas.map((item) => <SolicitudItem key={item.id} solicitud={item} user={user} onOpenChat={onOpenChat} onChange={changeRequest}>{actions(item)}</SolicitudItem>)}</div>
        : <p className="posts-feedback">Cuando alguien presione «Me interesa» en una de tus publicaciones, aparecerá aquí.</p>}
    </section>
    <section className="requests-section">
      <h2>Solicitudes enviadas <span className="request-count">{enviadas.length}</span></h2>
      {enviadas.length
        ? <div className="requests-grid">{enviadas.map((item) => <SolicitudItem key={item.id} solicitud={item} user={user} onOpenChat={onOpenChat} onChange={changeRequest}>{actions(item)}</SolicitudItem>)}</div>
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
