import { useState } from 'react'
import type { CanchaRegistrada } from './canchas'
import type { Solicitud } from './solicitudes'
import type { Partido } from './partidos'
import type { ReservaCancha } from './reservas'
import { REGIONES_CHILE } from './territorioChile'

export function CatalogoCanchas({
  canchas, loading, error, solicitudes, userUid, onContact,
  partidos, reservas, partidoSeleccionadoId, onSelectPartido, onSolicitarReserva,
}: {
  canchas: CanchaRegistrada[]
  loading: boolean
  error: string
  solicitudes: Solicitud[]
  userUid: string
  onContact: (cancha: CanchaRegistrada) => Promise<void>
  partidos: Partido[]
  reservas: ReservaCancha[]
  partidoSeleccionadoId: string
  onSelectPartido: (id: string) => void
  onSolicitarReserva: (cancha: CanchaRegistrada, partido: Partido, nota: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [comuna, setComuna] = useState('')
  const [busyId, setBusyId] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const [aviso, setAviso] = useState('')
  const [nota, setNota] = useState('')
  const partidosConfirmados = partidos.filter(p => p.estado === 'confirmado' && !p.reservaConfirmadaId)
  const partidoElegido = partidosConfirmados.find(p => p.id === partidoSeleccionadoId) ?? partidosConfirmados[0]
  const filtered = canchas.filter((item) =>
    (!comuna || item.comuna === comuna)
    && (!search.trim() || [item.nombre, item.descripcion, item.comuna, item.futbol, item.direccion]
      .some((value) => value.toLocaleLowerCase('es-CL').includes(search.trim().toLocaleLowerCase('es-CL')))))

  async function perform(cancha: CanchaRegistrada, reservar: boolean) {
    setBusyId(cancha.id)
    setAviso('')
    setErrorLocal('')
    try {
      if (reservar) {
        if (!partidoElegido) throw new Error('Antes debes tener un partido confirmado entre equipos.')
        await onSolicitarReserva(cancha, partidoElegido, nota)
        setAviso(`Solicitud de reserva enviada a ${cancha.nombre}. El dueño debe confirmarla.`)
      } else {
        await onContact(cancha)
        setAviso(`Solicitud de contacto enviada a ${cancha.nombre}.`)
      }
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setErrorLocal(code === 'permission-denied'
        ? 'Firestore rechazó la solicitud. Comprueba las reglas actualizadas y tu rol.'
        : (cause as Error).message || 'No se pudo realizar la solicitud.')
    } finally { setBusyId('') }
  }

  return <div className="page">
    <div className="page-heading"><div>
      <p className="eyebrow">DÓNDE JUGAR</p><h1>Buscar canchas</h1>
      <p className="muted">Encuentra canchas registradas en FutMatch, consulta su precio por hora y pide una reserva para un partido confirmado.</p>
    </div></div>
    <section className="sports-panel court-booking-context">
      <h2>Reserva para tu partido</h2>
      {partidosConfirmados.length ? <>
        <label>Selecciona un partido ya confirmado
          <select value={partidoElegido?.id || ''} onChange={(e) => onSelectPartido(e.target.value)}>
            {partidosConfirmados.map(p => <option key={p.id} value={p.id}>
              {p.localNombre} vs {p.visitanteNombre} · {p.fecha} {p.hora}
            </option>)}
          </select>
        </label>
        <p className="muted">Las reservas se gestionan por bloques de 60 minutos comenzando en horas exactas. El dueño confirma la disponibilidad.</p>
        <label>Nota para el dueño (opcional)
          <textarea rows={2} maxLength={240} value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Ej: Partido amistoso de fútbol 7" />
        </label>
      </> : <p className="muted">Primero acuerda un desafío con otro equipo en Matches y confirma el partido en Mis partidos. Mientras tanto puedes consultar los recintos.</p>}
    </section>
    <div className="filter-row">
      <label className="search-box">⌕ <input value={search} aria-label="Buscar cancha"
        onChange={event => setSearch(event.target.value)} placeholder="Nombre, modalidad o comuna" /></label>
      <select aria-label="Filtrar por comuna" value={comuna} onChange={event => setComuna(event.target.value)}>
        <option value="">Todas las comunas</option>
        {REGIONES_CHILE.flatMap(region => region.comunas.map(item =>
          <option key={item.codigo} value={item.nombre}>{item.nombre} · {region.nombre}</option>))}
      </select>
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {errorLocal && <p className="posts-feedback posts-error" role="alert">{errorLocal}</p>}
    {aviso && <p className="posts-feedback" role="status">{aviso}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando canchas registradas…</p>}
    {!loading && !error && (filtered.length
      ? <div className="post-grid">
        {filtered.map(item => {
          const contacto = solicitudes.find(s => s.publicacionId === item.anuncioId && s.interesadoUid === userUid)
          const propia = item.duenoUid === userUid
          const reserva = reservas.find(r => r.canchaId === item.id && r.partidoId === partidoElegido?.id)
          return <article className="team-card" key={item.id}>
            <div className="team-shield">▣</div>
            <h2>{item.nombre}</h2>
            <p className="muted">📍 {item.direccion || 'Dirección no disponible'}, {item.comuna} · {item.region}</p>
            <p className="team-captain"><strong>Modalidad:</strong> {item.futbol}</p>
            <p className="team-captain"><strong>Precio/hora:</strong> CLP {item.precioHora.toLocaleString('es-CL')}</p>
            {item.informacionHorarios && <p className="muted"><strong>Horarios:</strong> {item.informacionHorarios}</p>}
            <p className="team-description">{item.descripcion}</p>
            {partidoElegido && <button type="button" className="primary-button"
              disabled={!!busyId || propia || !!(reserva && !['rechazada','cancelada'].includes(reserva.estado))}
              onClick={() => { void perform(item, true) }}>
              {busyId === item.id ? 'Enviando…'
                : reserva && ['rechazada','cancelada'].includes(reserva.estado) ? 'Volver a solicitar reserva'
                : reserva ? `Reserva: ${reserva.estado}`
                : 'Solicitar reserva para este partido'}
            </button>}
            <button type="button" className="secondary-button"
              disabled={!!contacto || propia || !!busyId} onClick={() => { void perform(item, false) }}>
              {contacto ? contacto.estado === 'aceptada' ? 'Contacto aceptado'
                : contacto.estado === 'rechazada' ? 'Solicitud rechazada' : 'Contacto enviado'
                : propia ? 'Tu propia cancha' : 'Consultar al dueño'}
            </button>
          </article>
        })}
      </div>
      : <p className="posts-feedback">Todavía no hay canchas registradas con esos filtros. Los dueños pueden anunciarlas desde su cuenta.</p>)}
  </div>
}
