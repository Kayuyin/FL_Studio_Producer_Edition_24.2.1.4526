import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { categorias, crearPublicacion } from './publicaciones'
import { registrarCanchaYAnuncio } from './canchas'
import type { EquipoRegistrado } from './equipos'
import { REGIONES_CHILE, obtenerComuna, obtenerRegion } from './territorioChile'
import { cuentaConCancha } from './tiposCuenta'
import type { TipoCuenta } from './tiposCuenta'
import type { Categoria, Nivel, NuevaPublicacion, Publicacion, TipoFutbol } from './publicaciones'
import type { Solicitud } from './solicitudes'

const tipos = Object.keys(categorias) as Categoria[]
const tiposPublicables: Record<TipoCuenta, Categoria[]> = {
  jugador: ['persona_busca_equipo'],
  equipo: ['equipo_busca_rival', 'busca_cancha'],
  capitan: ['equipo_busca_jugadores', 'equipo_busca_rival', 'busca_cancha'],
  dueno_cancha: ['ofrece_cancha'],
}
const opcionesFutbol: TipoFutbol[] = ['Fútbol 5', 'Fútbol 7', 'Fútbol 8', 'Fútbol 11']
const niveles: Nivel[] = ['Amateur', 'Intermedio', 'Avanzado']
const opciones = {
  persona_busca_equipo: {
    description: 'Un jugador quiere unirse a un equipo',
    example: 'Ej: Soy arquero y busco equipo en Ñuñoa',
  },
  equipo_busca_jugadores: {
    description: 'Un equipo necesita nuevos jugadores',
    example: 'Ej: Buscamos defensa para fútbol 7',
  },
  equipo_busca_rival: {
    description: 'Un equipo busca otro equipo para jugar',
    example: 'Ej: Buscamos rival para el domingo',
  },
  busca_cancha: {
    description: 'Indica en qué comuna necesitas una cancha',
    example: 'Ej: Busco cancha de fútbol 7 para el sábado',
  },
  ofrece_cancha: {
    description: 'Anuncia una cancha para que otros usuarios puedan contactarte',
    example: 'Ej: Cancha de fútbol 7 disponible en La Florida',
  },
} as const

function fechaLegible(fecha: string): string {
  if (!fecha) return 'Por coordinar'
  const [year, month, day] = fecha.split('-').map(Number)
  if (!year || !month || !day) return 'Por coordinar'
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day))
}

function EstadoListado({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="posts-feedback" role="status">Cargando publicaciones…</p>
  if (error) return <p className="posts-feedback posts-error" role="alert">{error}</p>
  return <p className="posts-feedback">Todavía no hay publicaciones en esta categoría. ¡Sé el primero en publicar!</p>
}

export function PublicacionCard({
  post, userUid, solicitudes, onInterest, onDelete, viewerTipoCuenta = 'jugador',
}: {
  post: Publicacion
  userUid: string
  solicitudes: Solicitud[]
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
  viewerTipoCuenta?: TipoCuenta
}) {
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const alreadySent = solicitudes.find((item) =>
    item.publicacionId === post.id && item.interesadoUid === userUid)
  const esVacanteCapitan = post.categoria === 'equipo_busca_jugadores' && post.autorTipoCuenta === 'capitan'
  const puedeContactar = viewerTipoCuenta !== 'jugador' || esVacanteCapitan
  async function interest() {
    if (sending || alreadySent || post.autorUid === userUid || !puedeContactar) return
    setSending(true)
    setError('')
    try { await onInterest(post) }
    catch { setError('No se pudo enviar tu solicitud. Revisa tu conexión y las reglas de Firestore.') }
    finally { setSending(false) }
  }
  async function removeOwnPost() {
    if (deleting || post.autorUid !== userUid) return
    setDeleting(true)
    setError('')
    try {
      await onDelete(post)
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setError(code === 'permission-denied'
        ? 'Firestore no autorizó eliminar esta publicación.'
        : (cause as Error).message || 'No se pudo eliminar la publicación.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const category = categorias[post.categoria]
  const autor = post.nombreCancha || post.equipoNombre || post.autorNombre
  const initials = autor.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  const publicado = post.creadoEn?.toDate()
  return <article className="post-card">
    <div className="card-top">
      <span className="type-pill" style={{ color: category.color, backgroundColor: `${category.color}16` }}>
        {category.icon} {category.label}
      </span>
    </div>
    <div className="author">
      <div className="avatar" style={{ backgroundColor: category.color }}>{initials || '⚽'}</div>
      <div><strong>{autor}</strong><small>Publicado por {post.autorNombre}{publicado ? ` · ${publicado.toLocaleDateString('es-CL')}` : ''}</small></div>
    </div>
    <h3>{post.titulo}</h3>
    <p className="card-description">{post.descripcion}</p>
    <div className="details">
      <span>⌖ {post.comuna}</span>
      <span>◷ {fechaLegible(post.fecha)}</span>
      <span>◷ {post.hora || 'Por coordinar'}</span>
      <span>⚽ {post.futbol}</span>
    </div>
    <div className="card-footer">
      <span className="level">{post.categoria === 'busca_cancha' ? 'Solicitud de cancha' : post.categoria === 'ofrece_cancha' ? 'Oferta de cancha' : post.nivel}</span>
      {post.autorUid === userUid
        ? <div className="owner-actions">
            <span className="publication-active">Tu publicación</span>
            <button type="button" className="delete-post-button"
              disabled={deleting} onClick={() => setConfirmDelete((value) => !value)}>
              Eliminar
            </button>
          </div>
        : puedeContactar && <button type="button" className="interest-button"
            disabled={!!alreadySent || sending} onClick={() => { void interest() }}>
            {sending ? 'Enviando…' : alreadySent
              ? alreadySent.estado === 'aceptada' ? '✓ Contacto aceptado'
                : alreadySent.estado === 'rechazada' ? 'Postulación rechazada'
                : esVacanteCapitan ? '✓ Postulación enviada' : '✓ Solicitud enviada'
              : viewerTipoCuenta === 'jugador' ? 'Postular al equipo' : '♡ Me interesa'}
          </button>}
    </div>
    {confirmDelete && post.autorUid === userUid && <div className="post-delete-confirm" role="group" aria-label="Confirmar eliminación">
      <p>¿Quieres eliminar «{post.titulo}»? Esta acción no se puede deshacer. Las conversaciones que ya se iniciaron se conservarán.</p>
      <div className="post-delete-actions">
        <button type="button" className="delete-post-confirm" disabled={deleting} onClick={() => { void removeOwnPost() }}>
          {deleting ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
        <button type="button" className="secondary-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</button>
      </div>
    </div>}
    {error && <p role="alert" className="posts-feedback posts-error">{error}</p>}
  </article>
}

export function Home({
  name, onNavigate, publicaciones, loading, error, userUid, solicitudes, onInterest, onDelete,
}: {
  name: string
  onNavigate: (view: 'explorar' | 'publicar') => void
  publicaciones: Publicacion[]
  loading: boolean
  error: string
  userUid: string
  solicitudes: Solicitud[]
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
}) {
  const personas = publicaciones.filter((post) => post.categoria === 'persona_busca_equipo').length
  const refuerzos = publicaciones.filter((post) => post.categoria === 'equipo_busca_jugadores').length
  const rivales = publicaciones.filter((post) => post.categoria === 'equipo_busca_rival').length
  const canchas = publicaciones.filter((post) => post.categoria === 'busca_cancha' || post.categoria === 'ofrece_cancha').length
  return <div className="page">
    <section className="welcome">
      <div>
        <p className="eyebrow">{new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()}</p>
        <h1>Hola, {name.split(' ')[0]} <span>👋</span></h1>
        <p className="muted">Encuentra jugadores, equipos, rivales y canchas cerca de ti.</p>
      </div>
      <button className="primary-button" onClick={() => onNavigate('publicar')}>＋ Crear publicación</button>
    </section>
    <section className="hero-banner">
      <div>
        <span className="hero-label">TU PRÓXIMO PARTIDO</span>
        <h2>El fútbol se disfruta<br />mejor en equipo.</h2>
        <p>Conecta con jugadores y equipos cerca de ti.</p>
        <button className="light-button" onClick={() => onNavigate('explorar')}>Explorar ahora <span>→</span></button>
      </div>
      <div className="hero-ball">⚽</div>
    </section>
    <section className="section-heading">
      <div><h2>Últimas publicaciones</h2><p className="muted">Convocatorias de la comunidad FutMatch</p></div>
      <button className="text-button" onClick={() => onNavigate('explorar')}>Ver todas <span>→</span></button>
    </section>
    {publicaciones.length ? <div className="post-grid">{publicaciones.slice(0, 3).map((post) => <PublicacionCard key={post.id} post={post} userUid={userUid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />)}</div> : <EstadoListado loading={loading} error={error} />}
    <section className="quick-stats" aria-label="Publicaciones por categoría">
      <div><strong>{personas}</strong><span>Personas buscan<br />equipo</span></div>
      <div><strong>{refuerzos}</strong><span>Equipos buscan<br />jugadores</span></div>
      <div><strong>{rivales}</strong><span>Equipos buscan<br />rival</span></div>
      <div><strong>{canchas}</strong><span>Solicitudes y ofertas<br />de canchas</span></div>
    </section>
  </div>
}

export function Explore({
  publicaciones, filter, setFilter, loading, error, userUid, solicitudes, onInterest, onDelete, viewerTipoCuenta,
}: {
  publicaciones: Publicacion[]
  filter: Categoria | 'todos'
  setFilter: (filter: Categoria | 'todos') => void
  loading: boolean
  error: string
  userUid: string
  solicitudes: Solicitud[]
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
  viewerTipoCuenta: TipoCuenta
}) {
  const [search, setSearch] = useState('')
  const [nivel, setNivel] = useState<Nivel | 'todos'>('todos')
  const [comunaCancha, setComunaCancha] = useState('')
  const categoriasVisibles = viewerTipoCuenta === 'equipo'
    ? tipos.filter((tipo) => tipo !== 'equipo_busca_jugadores')
    : tipos
  const filtroActivo = viewerTipoCuenta === 'jugador'
    ? 'equipo_busca_jugadores'
    : viewerTipoCuenta === 'equipo' && filter === 'equipo_busca_jugadores' ? 'todos' : filter
  const result = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CL')
    return publicaciones.filter((post) =>
      (viewerTipoCuenta !== 'jugador' || post.autorTipoCuenta === 'capitan')
      && (viewerTipoCuenta !== 'equipo' || post.categoria !== 'equipo_busca_jugadores')
      && (filtroActivo === 'todos' || post.categoria === filtroActivo)
      && (filtroActivo === 'busca_cancha' || filtroActivo === 'ofrece_cancha' || nivel === 'todos' || post.nivel === nivel)
      && (!['busca_cancha', 'ofrece_cancha'].includes(filtroActivo) || !comunaCancha || post.comuna === comunaCancha)
      && (!term || [post.titulo, post.descripcion, post.comuna, post.autorNombre, post.equipoNombre]
        .some((value) => value.toLocaleLowerCase('es-CL').includes(term))),
    )
  }, [publicaciones, filtroActivo, search, nivel, comunaCancha, viewerTipoCuenta])

  return <div className="page">
    <div className="page-heading"><div>
      <p className="eyebrow">DESCUBRE OPORTUNIDADES</p>
      <h1>Explorar publicaciones</h1>
      <p className="muted">{viewerTipoCuenta === 'jugador'
        ? 'Revisa las vacantes publicadas por capitanes y postula al equipo que te interese.'
        : viewerTipoCuenta === 'equipo'
          ? 'Encuentra jugadores que buscan equipo, equipos rivales y canchas. Las vacantes de otros equipos no aparecen aquí.'
          : 'Encuentra jugadores, equipos, rivales, ofertas y solicitudes de canchas.'}</p>
    </div></div>
    <div className="filters" role="group" aria-label="Filtrar por categoría">
      {viewerTipoCuenta === 'jugador'
        ? <span className="player-vacancy-label">⚽ Vacantes publicadas por capitanes</span>
        : <>
            <button className={filtroActivo === 'todos' ? 'selected' : ''} aria-pressed={filtroActivo === 'todos'} onClick={() => setFilter('todos')}>Todas</button>
            {categoriasVisibles.map((tipo) => <button key={tipo} className={filtroActivo === tipo ? 'selected' : ''} aria-pressed={filtroActivo === tipo} onClick={() => setFilter(tipo)}>{categorias[tipo].icon} {categorias[tipo].label}</button>)}
          </>}
    </div>
    <div className="filter-row">
      <label className="search-box" aria-label="Buscar publicaciones">⌕ <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por comuna, nombre o publicación" /></label>
      {['busca_cancha', 'ofrece_cancha'].includes(filtroActivo) && <select aria-label="Filtrar canchas por comuna" value={comunaCancha} onChange={(event) => setComunaCancha(event.target.value)}>
        <option value="">Todas las comunas</option>
        {REGIONES_CHILE.flatMap((region) => region.comunas.map((item) =>
          <option key={item.codigo} value={item.nombre}>{item.nombre} · {region.nombre}</option>))}
      </select>}
      {!['busca_cancha', 'ofrece_cancha'].includes(filtroActivo) && <select aria-label="Filtrar por nivel" value={nivel} onChange={(event) => setNivel(event.target.value as Nivel | 'todos')}>
        <option value="todos">Cualquier nivel</option>
        {niveles.map((item) => <option key={item}>{item}</option>)}
      </select>}
    </div>
    <div className="result-heading"><h2>{result.length} {result.length === 1 ? 'publicación encontrada' : 'publicaciones encontradas'}</h2><span className="muted">Más recientes primero</span></div>
    {result.length ? <div className="post-grid explore-grid">{result.map((post) => <PublicacionCard key={post.id} post={post} userUid={userUid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} viewerTipoCuenta={viewerTipoCuenta} />)}</div> : <EstadoListado loading={loading} error={error} />}
  </div>
}

export function Publish({
  user, nombreAutor, tipoCuenta, equipoRegistrado, canchaRegistrada,
  regionPerfil, comunaPerfil, categoriaInicial, equipo, onGoToEquipo, onCreated,
}: {
  user: User
  nombreAutor: string
  tipoCuenta: TipoCuenta
  equipoRegistrado: string
  canchaRegistrada: string
  regionPerfil: string
  comunaPerfil: string
  categoriaInicial: Categoria
  equipo: EquipoRegistrado | null
  onGoToEquipo: () => void
  onCreated: (categoria: Categoria) => void
}) {
  const permitidas = tiposPublicables[tipoCuenta]
  const [categoria, setCategoria] = useState<Categoria>(
    permitidas.includes(categoriaInicial) ? categoriaInicial : permitidas[0],
  )
  const [equipoNombre, setEquipoNombre] = useState(equipoRegistrado)
  const [nombreCancha, setNombreCancha] = useState(canchaRegistrada)
  const [direccionCancha, setDireccionCancha] = useState('')
  const [precioHora, setPrecioHora] = useState('')
  const [horariosCancha, setHorariosCancha] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [regionCodigo, setRegionCodigo] = useState(regionPerfil)
  const [comunaCodigo, setComunaCodigo] = useState(comunaPerfil)
  const region = obtenerRegion(regionCodigo)
  const comunaSeleccionada = obtenerComuna(regionCodigo, comunaCodigo)
  const comuna = comunaSeleccionada?.nombre || ''
  const [futbol, setFutbol] = useState<TipoFutbol>('Fútbol 7')
  const [nivel, setNivel] = useState<Nivel>('Amateur')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const isEquipo = categoria === 'equipo_busca_jugadores' || categoria === 'equipo_busca_rival'
  const isCancha = categoria === 'busca_cancha' || categoria === 'ofrece_cancha'
  const isOffer = categoria === 'ofrece_cancha'
  const today = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (titulo.trim().length < 5 || descripcion.trim().length < 15 || !comunaSeleccionada) {
      setError('Completa el título, la descripción (mínimo 15 caracteres) y selecciona una región y comuna de Chile.')
      return
    }
    if (!permitidas.includes(categoria)) {
      setError('Esta categoría no corresponde a tu tipo de cuenta.')
      return
    }
    if (isOffer && (!cuentaConCancha(tipoCuenta) || nombreCancha.trim().length < 2)) {
      setError('Debes registrar el nombre de tu cancha en el perfil o en esta publicación.')
      return
    }
    if (isOffer && (direccionCancha.trim().length < 5 || precioHora.trim() === ''
      || !Number.isInteger(Number(precioHora)) || Number(precioHora) < 0 || Number(precioHora) > 1000000
      || horariosCancha.length > 200)) {
      setError('Indica la dirección y el precio por hora de la cancha. Si es gratuita, escribe 0.')
      return
    }
    if (isEquipo && !equipo) {
      setError('Antes de publicar una convocatoria o buscar rival, registra tu equipo en Mi equipo.')
      return
    }
    if (isEquipo && (equipo?.nombre || equipoNombre).trim().length < 2) {
      setError('Registra primero el nombre del equipo.')
      return
    }
    if (categoria === 'equipo_busca_rival' && (!fecha || !hora)) {
      setError('Para buscar un rival, indica la fecha y hora propuestas.')
      return
    }
    if (categoria === 'equipo_busca_rival' && !/^([01]\d|2[0-3]):00$/.test(hora)) {
      setError('Para reservar cancha, los partidos deben empezar a una hora exacta: 18:00, 19:00, 20:00, etc.')
      return
    }
    if (fecha && fecha < minDate) {
      setError('La fecha no puede ser anterior a hoy.')
      return
    }
    const datos: NuevaPublicacion = {
      categoria,
      autorUid: user.uid,
      autorNombre: nombreAutor.trim(),
      autorTipoCuenta: tipoCuenta,
      equipoId: isEquipo ? (equipo?.id ?? '') : '',
      canchaId: '',
      equipoNombre: isEquipo ? (equipo?.nombre ?? '').trim() : '',
      nombreCancha: isOffer ? nombreCancha.trim() : '',
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      comuna: comuna.trim(),
      futbol,
      nivel,
      fecha,
      hora,
    }
    setSending(true)
    try {
      if (isOffer) {
        await registrarCanchaYAnuncio(datos, region!.nombre, regionCodigo, comunaCodigo,
          direccionCancha, Number(precioHora), horariosCancha)
      } else {
        await crearPublicacion(datos)
      }
      onCreated(categoria)
    } catch (reason) {
      const code = (reason as { code?: string }).code
      setError(code === 'permission-denied'
        ? 'Firestore rechazó la publicación. Revisa que las reglas nuevas estén publicadas.'
        : 'No se pudo publicar. Comprueba la conexión e intenta nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return <div className="page narrow-page">
    <div className="page-heading"><div>
      <p className="eyebrow">COMPARTE CON LA COMUNIDAD</p>
      <h1>Crear publicación</h1>
      <p className="muted">{isOffer
        ? 'Anuncia tu cancha para recibir solicitudes de contacto. Las reservas y los pagos no se realizan en FutMatch.'
        : 'La publicación quedará disponible para la comunidad de FutMatch.'}</p>
    </div></div>
    <form className="form-card" onSubmit={(event) => { void submit(event) }}>
      <span className="field-label" id="tipo-publicacion-label">¿Qué quieres publicar?</span>
      <div className="choice-grid" role="group" aria-labelledby="tipo-publicacion-label">
        {permitidas.map((tipo) => <button
          key={tipo}
          type="button"
          className={`choice ${categoria === tipo ? 'active' : ''}`}
          aria-pressed={categoria === tipo}
          onClick={() => { setCategoria(tipo); setError('') }}
        >
          {categorias[tipo].icon}<strong>{categorias[tipo].label}</strong><small>{opciones[tipo].description}</small>
        </button>)}
      </div>
      {isEquipo && <>
        {!equipo && <div className="posts-feedback posts-error">
          Para publicar una convocatoria o un desafío primero debes registrar tu equipo.
          <button type="button" className="secondary-button" onClick={onGoToEquipo}>Ir a Mi equipo</button>
        </div>}
        <label>Nombre de tu equipo registrado
          <input value={equipo?.nombre || equipoNombre} onChange={(event) => setEquipoNombre(event.target.value)}
            disabled={!!equipo} maxLength={80} minLength={2} required placeholder="Ej: Deportivo FutMatch" />
        </label>
      </>}
      {isOffer && <>
        <label>Nombre de tu cancha
          <input value={nombreCancha} onChange={(event) => setNombreCancha(event.target.value)} maxLength={100} minLength={2} required placeholder="Ej: Canchas del Parque" />
        </label>
        <label>Dirección del recinto
          <input value={direccionCancha} onChange={(event) => setDireccionCancha(event.target.value)}
            minLength={5} maxLength={160} required placeholder="Ej: Avenida La Florida 1200" />
        </label>
        <div className="form-columns">
          <label>Precio por hora (CLP)
            <input type="number" value={precioHora} onChange={(event) => setPrecioHora(event.target.value)}
              required min={0} max={1000000} step={1} placeholder="Ej: 28000" />
          </label>
          <label>Horarios habituales (informativos)
            <input value={horariosCancha} onChange={(event) => setHorariosCancha(event.target.value)}
              maxLength={200} placeholder="Ej: Lunes a domingo, 17:00–23:00" />
          </label>
        </div>
        <p className="muted">Las reservas se solicitan para partidos confirmados. El dueño acepta o rechaza cada horario; publicar la cancha no garantiza disponibilidad.</p>
      </>}
      <label>Título de la publicación
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={110} minLength={5} required placeholder={opciones[categoria].example} />
      </label>
      <label>Descripción
        <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength={1200} minLength={15} required placeholder="Cuenta qué buscas, posición, horarios o detalles del partido..." rows={4} />
      </label>
      <div className="form-columns">
        <label>Región
          <select value={regionCodigo} onChange={(event) => { setRegionCodigo(event.target.value); setComunaCodigo('') }} required>
            <option value="">Selecciona una región</option>
            {REGIONES_CHILE.map((item) => <option value={item.codigo} key={item.codigo}>{item.nombre}</option>)}
          </select>
        </label>
        <label>{isOffer ? 'Comuna donde se encuentra la cancha' : isCancha ? 'Comuna donde buscas una cancha' : 'Comuna'}
          <select value={comunaCodigo} onChange={(event) => setComunaCodigo(event.target.value)} disabled={!regionCodigo} required>
            <option value="">{regionCodigo ? 'Selecciona una comuna' : 'Primero selecciona una región'}</option>
            {region?.comunas.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
          </select>
        </label>
        <label>Tipo de fútbol
          <select value={futbol} onChange={(event) => setFutbol(event.target.value as TipoFutbol)}>
            {opcionesFutbol.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {!isCancha && <label>Nivel de juego
        <select value={nivel} onChange={(event) => setNivel(event.target.value as Nivel)}>{niveles.map((item) => <option key={item}>{item}</option>)}</select>
      </label>}
      <div className="form-columns">
        <label>Fecha {categoria === 'equipo_busca_rival' ? '' : '(opcional)'}
          <input type="date" min={minDate} required={categoria === 'equipo_busca_rival'} value={fecha} onChange={(event) => setFecha(event.target.value)} />
        </label>
        <label>Hora {categoria === 'equipo_busca_rival' ? '' : '(opcional)'}
          <input type="time" step={categoria === 'equipo_busca_rival' ? 3600 : 60}
            required={categoria === 'equipo_busca_rival'} value={hora} onChange={(event) => setHora(event.target.value)} />
        </label>
      </div>
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
      <button className="primary-button publish-button" type="submit" disabled={sending}>
        {sending ? 'Publicando…' : 'Publicar en FutMatch →'}
      </button>
    </form>
  </div>
}
