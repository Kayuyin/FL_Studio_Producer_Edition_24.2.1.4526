import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { categorias, crearPublicacion } from './publicaciones'
import { COMUNAS_RM, esComunaRM } from './comunas'
import type { Categoria, Nivel, NuevaPublicacion, Publicacion, TipoFutbol } from './publicaciones'

const tipos = Object.keys(categorias) as Categoria[]
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

function PublicacionCard({ post }: { post: Publicacion }) {
  const category = categorias[post.categoria]
  const autor = post.equipoNombre || post.autorNombre
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
      <span className="level">{post.categoria === 'busca_cancha' ? 'Solicitud de cancha' : post.nivel}</span>
      <span className="publication-active">● Publicación activa</span>
    </div>
  </article>
}

export function Home({
  name, onNavigate, publicaciones, loading, error,
}: {
  name: string
  onNavigate: (view: 'explorar' | 'publicar') => void
  publicaciones: Publicacion[]
  loading: boolean
  error: string
}) {
  const personas = publicaciones.filter((post) => post.categoria === 'persona_busca_equipo').length
  const refuerzos = publicaciones.filter((post) => post.categoria === 'equipo_busca_jugadores').length
  const rivales = publicaciones.filter((post) => post.categoria === 'equipo_busca_rival').length
  const canchas = publicaciones.filter((post) => post.categoria === 'busca_cancha').length
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
    {publicaciones.length ? <div className="post-grid">{publicaciones.slice(0, 3).map((post) => <PublicacionCard key={post.id} post={post} />)}</div> : <EstadoListado loading={loading} error={error} />}
    <section className="quick-stats" aria-label="Publicaciones por categoría">
      <div><strong>{personas}</strong><span>Personas buscan<br />equipo</span></div>
      <div><strong>{refuerzos}</strong><span>Equipos buscan<br />jugadores</span></div>
      <div><strong>{rivales}</strong><span>Equipos buscan<br />rival</span></div>
      <div><strong>{canchas}</strong><span>Personas buscan<br />cancha</span></div>
    </section>
  </div>
}

export function Explore({
  publicaciones, filter, setFilter, loading, error,
}: {
  publicaciones: Publicacion[]
  filter: Categoria | 'todos'
  setFilter: (filter: Categoria | 'todos') => void
  loading: boolean
  error: string
}) {
  const [search, setSearch] = useState('')
  const [nivel, setNivel] = useState<Nivel | 'todos'>('todos')
  const [comunaCancha, setComunaCancha] = useState('')
  const result = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CL')
    return publicaciones.filter((post) =>
      (filter === 'todos' || post.categoria === filter)
      && (nivel === 'todos' || post.nivel === nivel)
      && (filter !== 'busca_cancha' || !comunaCancha || post.comuna === comunaCancha)
      && (!term || [post.titulo, post.descripcion, post.comuna, post.autorNombre, post.equipoNombre]
        .some((value) => value.toLocaleLowerCase('es-CL').includes(term))),
    )
  }, [publicaciones, filter, search, nivel, comunaCancha])

  return <div className="page">
    <div className="page-heading"><div>
      <p className="eyebrow">DESCUBRE OPORTUNIDADES</p>
      <h1>Explorar publicaciones</h1>
      <p className="muted">Encuentra jugadores, equipos, rivales y solicitudes de canchas.</p>
    </div></div>
    <div className="filters" role="group" aria-label="Filtrar por categoría">
      <button className={filter === 'todos' ? 'selected' : ''} aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>Todas</button>
      {tipos.map((tipo) => <button key={tipo} className={filter === tipo ? 'selected' : ''} aria-pressed={filter === tipo} onClick={() => setFilter(tipo)}>{categorias[tipo].icon} {categorias[tipo].label}</button>)}
    </div>
    <div className="filter-row">
      <label className="search-box" aria-label="Buscar publicaciones">⌕ <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por comuna, nombre o publicación" /></label>
      {filter === 'busca_cancha' && <select aria-label="Filtrar canchas por comuna" value={comunaCancha} onChange={(event) => setComunaCancha(event.target.value)}>
        <option value="">Todas las comunas</option>
        {COMUNAS_RM.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>}
      <select aria-label="Filtrar por nivel" value={nivel} onChange={(event) => setNivel(event.target.value as Nivel | 'todos')}>
        <option value="todos">Cualquier nivel</option>
        {niveles.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
    <div className="result-heading"><h2>{result.length} {result.length === 1 ? 'publicación encontrada' : 'publicaciones encontradas'}</h2><span className="muted">Más recientes primero</span></div>
    {result.length ? <div className="post-grid explore-grid">{result.map((post) => <PublicacionCard key={post.id} post={post} />)}</div> : <EstadoListado loading={loading} error={error} />}
  </div>
}

export function Publish({
  user, onCreated,
}: {
  user: User
  onCreated: (categoria: Categoria) => void
}) {
  const [categoria, setCategoria] = useState<Categoria>('persona_busca_equipo')
  const [equipoNombre, setEquipoNombre] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [comuna, setComuna] = useState('')
  const [futbol, setFutbol] = useState<TipoFutbol>('Fútbol 7')
  const [nivel, setNivel] = useState<Nivel>('Amateur')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const isEquipo = categoria === 'equipo_busca_jugadores' || categoria === 'equipo_busca_rival'
  const isCancha = categoria === 'busca_cancha'
  const today = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (titulo.trim().length < 5 || descripcion.trim().length < 15 || comuna.trim().length < 2) {
      setError('Completa el título, la descripción (mínimo 15 caracteres) y la comuna.')
      return
    }
    if (isCancha && !esComunaRM(comuna)) {
      setError('Selecciona una comuna de la Región Metropolitana donde necesitas la cancha.')
      return
    }
    if (isEquipo && equipoNombre.trim().length < 2) {
      setError('Indica el nombre de tu equipo.')
      return
    }
    if (categoria === 'equipo_busca_rival' && (!fecha || !hora)) {
      setError('Para buscar un rival, indica la fecha y hora propuestas.')
      return
    }
    if (fecha && fecha < minDate) {
      setError('La fecha no puede ser anterior a hoy.')
      return
    }
    const datos: NuevaPublicacion = {
      categoria,
      autorUid: user.uid,
      autorNombre: (user.displayName || user.email?.split('@')[0] || 'Jugador').trim(),
      equipoNombre: isEquipo ? equipoNombre.trim() : '',
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
      await crearPublicacion(datos)
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
      <p className="muted">La publicación quedará disponible para la comunidad de FutMatch.</p>
    </div></div>
    <form className="form-card" onSubmit={(event) => { void submit(event) }}>
      <span className="field-label" id="tipo-publicacion-label">¿Qué quieres publicar?</span>
      <div className="choice-grid" role="group" aria-labelledby="tipo-publicacion-label">
        {tipos.map((tipo) => <button
          key={tipo}
          type="button"
          className={`choice ${categoria === tipo ? 'active' : ''}`}
          aria-pressed={categoria === tipo}
          onClick={() => { setCategoria(tipo); setError('') }}
        >
          {categorias[tipo].icon}<strong>{categorias[tipo].label}</strong><small>{opciones[tipo].description}</small>
        </button>)}
      </div>
      {isEquipo && <label>Nombre de tu equipo
        <input value={equipoNombre} onChange={(event) => setEquipoNombre(event.target.value)} maxLength={80} required placeholder="Ej: Deportivo FutMatch" />
      </label>}
      <label>Título de la publicación
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={110} minLength={5} required placeholder={opciones[categoria].example} />
      </label>
      <label>Descripción
        <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength={1200} minLength={15} required placeholder="Cuenta qué buscas, posición, horarios o detalles del partido..." rows={4} />
      </label>
      <div className="form-columns">
        {isCancha
          ? <label>¿En qué comuna buscas una cancha?
              <select value={comuna} onChange={(event) => setComuna(event.target.value)} required>
                <option value="">Selecciona una comuna de Santiago</option>
                {COMUNAS_RM.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          : <label>Comuna o ciudad
              <input value={comuna} onChange={(event) => setComuna(event.target.value)} maxLength={80} minLength={2} required placeholder="Ej: La Florida" />
            </label>}
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
          <input type="time" required={categoria === 'equipo_busca_rival'} value={hora} onChange={(event) => setHora(event.target.value)} />
        </label>
      </div>
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
      <button className="primary-button publish-button" type="submit" disabled={sending}>
        {sending ? 'Publicando…' : 'Publicar en FutMatch →'}
      </button>
    </form>
  </div>
}
