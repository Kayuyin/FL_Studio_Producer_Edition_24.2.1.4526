import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { CanchaRegistrada } from './canchas'
import { editarCancha, escucharCanchasPorComuna } from './canchas'
import { escucharCanchasDemo } from './canchasDemo'
import type { CanchaDemo } from './canchasDemo'
import { FutIcon } from './FutIcon'
import type { Solicitud } from './solicitudes'
import type { Partido } from './partidos'
import type { ReservaCancha } from './reservas'
import { REGIONES_CHILE } from './territorioChile'

export function CatalogoCanchas({
  canchas, loading, error, solicitudes, userUid, onContact, initialComunaCodigo,
  partidos, reservas, partidoSeleccionadoId, onSelectPartido, onSolicitarReserva,
}: {
  canchas: CanchaRegistrada[]
  loading: boolean
  error: string
  solicitudes: Solicitud[]
  userUid: string
  onContact: (cancha: CanchaRegistrada) => Promise<void>
  initialComunaCodigo: string
  partidos: Partido[]
  reservas: ReservaCancha[]
  partidoSeleccionadoId: string
  onSelectPartido: (id: string) => void
  onSolicitarReserva: (cancha: CanchaRegistrada, partido: Partido, nota: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [comunaCodigo, setComunaCodigo] = useState(initialComunaCodigo)
  const [canchasComuna, setCanchasComuna] = useState<CanchaRegistrada[]>([])
  const [demoCanchas, setDemoCanchas] = useState<CanchaDemo[]>([])
  const [loadingComuna, setLoadingComuna] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [errorComuna, setErrorComuna] = useState('')
  const [errorDemo, setErrorDemo] = useState('')

  useEffect(() => {
    setComunaCodigo(actual => actual || initialComunaCodigo)
  }, [initialComunaCodigo])

  useEffect(() => {
    if (!comunaCodigo) {
      setCanchasComuna([])
      setDemoCanchas([])
      setLoadingComuna(false)
      setLoadingDemo(false)
      setErrorComuna('')
      setErrorDemo('')
      return
    }
    setLoadingComuna(true)
    setLoadingDemo(true)
    setCanchasComuna([])
    setDemoCanchas([])
    setErrorComuna('')
    setErrorDemo('')
    const stopReales = escucharCanchasPorComuna(comunaCodigo,
      items => { setCanchasComuna(items); setLoadingComuna(false) },
      cause => { setErrorComuna(cause.message); setLoadingComuna(false) })
    const stopDemo = escucharCanchasDemo(comunaCodigo,
      items => { setDemoCanchas(items); setLoadingDemo(false) },
      cause => { setErrorDemo(cause.message); setLoadingDemo(false) })
    return () => { stopReales(); stopDemo() }
  }, [comunaCodigo])
  const [busyId, setBusyId] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const [aviso, setAviso] = useState('')
  const [nota, setNota] = useState('')
  const partidosConfirmados = partidos.filter(p => p.estado === 'confirmado' && !p.reservaConfirmadaId)
  const partidoElegido = partidosConfirmados.find(p => p.id === partidoSeleccionadoId) ?? partidosConfirmados[0]
  const term = search.trim().toLocaleLowerCase('es-CL')
  const filtered = (comunaCodigo ? canchasComuna : canchas).filter((item) =>
    (!term || [item.nombre, item.descripcion, item.comuna, item.futbol, item.direccion]
      .some((value) => value.toLocaleLowerCase('es-CL').includes(term))))
  const demoFiltradas = demoCanchas.filter(item => !term ||
    [item.nombre, item.comuna, item.modalidad].some(value => value.toLocaleLowerCase('es-CL').includes(term)))

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
      <label className="search-box"><FutIcon name="search" /> <input value={search} aria-label="Buscar cancha"
        onChange={event => setSearch(event.target.value)} placeholder="Nombre, modalidad o comuna" /></label>
      <select aria-label="Filtrar por comuna" value={comunaCodigo} onChange={event => setComunaCodigo(event.target.value)}>
        <option value="">Últimas 100 canchas registradas</option>
        {REGIONES_CHILE.flatMap(region => region.comunas.map(item =>
          <option key={item.codigo} value={item.codigo}>{item.nombre} · {region.nombre}</option>))}
      </select>
    </div>
    <p className="muted">Selecciona una comuna para consultar todos sus recintos reales y cinco ejemplos de demostración, si fueron importados. Los ejemplos no admiten reservas ni contactos.</p>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {errorComuna && <p className="posts-feedback posts-error" role="alert">No se pudieron consultar las canchas de la comuna: {errorComuna}</p>}
    {errorDemo && <p className="posts-feedback posts-error" role="alert">No se pudieron consultar las canchas de prueba: {errorDemo}</p>}
    {(loadingComuna || loadingDemo) && <p className="posts-feedback" role="status">Buscando canchas de la comuna…</p>}
    {errorLocal && <p className="posts-feedback posts-error" role="alert">{errorLocal}</p>}
    {aviso && <p className="posts-feedback" role="status">{aviso}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando canchas registradas…</p>}
    {!(comunaCodigo ? loadingComuna : loading) && !error && !errorComuna && (filtered.length
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
      : <p className="posts-feedback">No hay canchas reales registradas con estos filtros. Los dueños pueden anunciarlas desde su cuenta.</p>)}
    {comunaCodigo && <section className="role-section" aria-label="Canchas de demostración">
      <div className="section-heading">
        <div><h2>Canchas de demostración</h2>
          <p className="muted">Datos ficticios para probar los filtros. No son instalaciones verificadas ni reservables.</p>
        </div>
      </div>
      {!loadingDemo && !errorDemo && (demoFiltradas.length
        ? <div className="post-grid">{demoFiltradas.map(item =>
          <article className="team-card" key={item.id}>
            <div className="team-shield"><FutIcon name="football" /></div>
            <h2>{item.nombre}</h2>
            <p className="muted"><FutIcon name="map-pin" /> {item.comuna} · {item.region}</p>
            <p className="team-captain"><strong>Modalidad:</strong> {item.modalidad}</p>
            <p className="type-pill" style={{ color: '#7651df', background: '#f0edff' }}>Solo demostración</p>
            <p className="team-description">{item.descripcion}</p>
            <button type="button" className="secondary-button" disabled title="No admite reservas ni contacto real">
              No disponible para reservas
            </button>
          </article>)}</div>
        : <p className="posts-feedback">Aún no hay datos demo para esta comuna. Ejecuta el script de importación de canchas demo en Firestore.</p>)}
    </section>}
  </div>
}

/** Edición de los datos comerciales del recinto por la cuenta propietaria. */
export function EditarMisCanchas({
  canchas, uid, onNotice,
}: {
  canchas: CanchaRegistrada[]
  uid: string
  onNotice: (text: string) => void
}) {
  const propias = canchas.filter(cancha => cancha.duenoUid === uid)
  return <div className="page">
    <section className="sports-panel">
      <h2>Actualizar datos de mis canchas</h2>
      <p className="muted">Mantén la dirección, el precio y el horario habitual actualizados. Las reservas ya solicitadas mantienen el precio indicado al solicitarlas.</p>
      {!propias.length && <p className="posts-feedback">No hay canchas registradas en la colección nueva. Si tienes anuncios antiguos, vuelve a publicarlos para crear su ficha.</p>}
      {propias.map(cancha => <FormularioCancha key={cancha.id} cancha={cancha} onNotice={onNotice} />)}
    </section>
  </div>
}

function FormularioCancha({ cancha, onNotice }: { cancha: CanchaRegistrada; onNotice: (text: string) => void }) {
  const [direccion, setDireccion] = useState(cancha.direccion)
  const [precio, setPrecio] = useState(String(cancha.precioHora))
  const [horarios, setHorarios] = useState(cancha.informacionHorarios)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await editarCancha(cancha.id, direccion, Number(precio), horarios)
      onNotice(`Datos de ${cancha.nombre} actualizados.`)
    } catch (cause) {
      setError((cause as Error).message || 'No se pudieron guardar los datos de la cancha.')
    } finally { setBusy(false) }
  }
  return <form className="court-edit-form" onSubmit={event => { void guardar(event) }}>
    <h3>▣ {cancha.nombre}</h3>
    <div className="form-columns">
      <label>Dirección
        <input required minLength={5} maxLength={160} value={direccion}
          onChange={event => setDireccion(event.target.value)} />
      </label>
      <label>Precio por hora (CLP)
        <input required type="number" min={0} max={1000000} step={1}
          value={precio} onChange={event => setPrecio(event.target.value)} />
      </label>
      <label>Horarios habituales
        <input maxLength={200} value={horarios} onChange={event => setHorarios(event.target.value)} />
      </label>
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    <button type="submit" className="primary-button" disabled={busy}>
      {busy ? 'Guardando…' : 'Guardar datos de cancha'}
    </button>
  </form>
}
