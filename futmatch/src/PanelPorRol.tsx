import type { Publicacion, Categoria } from './publicaciones'
import type { Solicitud } from './solicitudes'
import type { TipoCuenta } from './tiposCuenta'
import { TIPOS_CUENTA } from './tiposCuenta'
import type { PerfilUsuario } from './Perfil'
import { PublicacionCard } from './VistasPublicaciones'

type Seccion = 'publicar' | 'mis_publicaciones' | 'matches' | 'mensajes' | 'perfil' | 'explorar'

type Acceso = {
  texto: string
  descripcion: string
  icono: string
  accion: () => void
}

export function PanelPorRol({
  nombre, perfil, tipoCuenta, uid, publicaciones, solicitudes, loading, error,
  onNavigate, onExplore, onPublish, onInterest, onDelete,
}: {
  nombre: string
  perfil: PerfilUsuario | null
  tipoCuenta: TipoCuenta
  uid: string
  publicaciones: Publicacion[]
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  onNavigate: (vista: Seccion) => void
  onExplore: (categoria: Categoria) => void
  onPublish: (categoria: Categoria) => void
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
}) {
  const equipo = perfil?.nombreEquipo || 'tu equipo'
  const cancha = perfil?.nombreCancha || 'tu cancha'
  const mias = publicaciones.filter((post) => post.autorUid === uid)
  const porResponder = solicitudes.filter((item) => item.autorPublicacionUid === uid && item.estado === 'pendiente').length
  const conversaciones = solicitudes.filter((item) => item.estado === 'aceptada').length

  let titulo = 'Tu fútbol empieza aquí'
  let subtitulo = 'Encuentra equipos y oportunidades para jugar en tu comuna.'
  let destacado = 'Convocatorias de equipos que buscan jugadores'
  let categoriaSugerida: Categoria = 'equipo_busca_jugadores'
  let accesos: Acceso[] = [
    { texto: 'Buscar equipo', descripcion: 'Equipos que necesitan jugadores', icono: '⌕', accion: () => onExplore('equipo_busca_jugadores') },
    { texto: 'Ofrecerme como jugador', descripcion: 'Publica tu búsqueda de equipo', icono: '+', accion: () => onPublish('persona_busca_equipo') },
    { texto: 'Buscar cancha', descripcion: 'Consulta canchas anunciadas', icono: '▣', accion: () => onExplore('ofrece_cancha') },
    { texto: 'Mis publicaciones', descripcion: 'Revisa o elimina tus anuncios', icono: '▤', accion: () => onNavigate('mis_publicaciones') },
  ]

  if (tipoCuenta === 'capitan') {
    titulo = 'Panel del capitán'
    subtitulo = `Coordina ${equipo}, encuentra jugadores y contacta con otros equipos.`
    destacado = 'Jugadores que están buscando equipo'
    categoriaSugerida = 'persona_busca_equipo'
    accesos = [
      { texto: 'Encontrar jugadores', descripcion: 'Jugadores disponibles', icono: '⌕', accion: () => onExplore('persona_busca_equipo') },
      { texto: 'Buscar refuerzos', descripcion: 'Publica una convocatoria', icono: '+', accion: () => onPublish('equipo_busca_jugadores') },
      { texto: 'Buscar un rival', descripcion: 'Coordina un amistoso', icono: '⚔', accion: () => onExplore('equipo_busca_rival') },
      { texto: 'Perfil del equipo', descripcion: 'Edita los datos de tu equipo', icono: '◉', accion: () => onNavigate('perfil') },
    ]
  } else if (tipoCuenta === 'equipo') {
    titulo = 'Panel de tu equipo'
    subtitulo = `Gestiona la presencia de ${equipo} en FutMatch.`
    destacado = 'Jugadores disponibles para incorporarse'
    categoriaSugerida = 'persona_busca_equipo'
    accesos = [
      { texto: 'Buscar jugadores', descripcion: 'Revisa jugadores disponibles', icono: '⌕', accion: () => onExplore('persona_busca_equipo') },
      { texto: 'Convocar jugadores', descripcion: 'Publica posiciones necesarias', icono: '+', accion: () => onPublish('equipo_busca_jugadores') },
      { texto: 'Encontrar rivales', descripcion: 'Explora desafíos deportivos', icono: '⚔', accion: () => onExplore('equipo_busca_rival') },
      { texto: 'Crear desafío', descripcion: 'Publica un partido propuesto', icono: '▤', accion: () => onPublish('equipo_busca_rival') },
    ]
  } else if (tipoCuenta === 'dueno_cancha') {
    titulo = 'Panel de mis canchas'
    subtitulo = `Administra los anuncios de ${cancha} y conecta con quienes buscan dónde jugar.`
    destacado = 'Personas y equipos que están buscando cancha'
    categoriaSugerida = 'busca_cancha'
    accesos = [
      { texto: 'Anunciar mi cancha', descripcion: 'Publica un anuncio de tu recinto', icono: '+', accion: () => onPublish('ofrece_cancha') },
      { texto: 'Encontrar interesados', descripcion: 'Solicitudes de cancha publicadas', icono: '⌕', accion: () => onExplore('busca_cancha') },
      { texto: 'Mis anuncios', descripcion: 'Consulta o elimina tus ofertas', icono: '▤', accion: () => onNavigate('mis_publicaciones') },
      { texto: 'Contactos recibidos', descripcion: 'Revisa solicitudes de interés', icono: '♥', accion: () => onNavigate('matches') },
    ]
  }
  const sugeridas = publicaciones.filter((post) => post.categoria === categoriaSugerida && post.autorUid !== uid).slice(0, 3)

  return <div className="page">
    <div className="role-welcome">
      <div>
        <p className="eyebrow">{TIPOS_CUENTA[tipoCuenta].label.toUpperCase()} · FUTMATCH</p>
        <h1>{titulo}</h1>
        <p className="muted">{subtitulo}</p>
        <p className="role-greeting">Hola, {nombre.split(' ')[0]} 👋</p>
      </div>
      <button className="secondary-button" type="button" onClick={() => onNavigate('perfil')}>Editar mi perfil</button>
    </div>
    <section className="role-stats" aria-label="Actividad de tu cuenta">
      <div><strong>{mias.length}</strong><span>Mis publicaciones</span></div>
      <div><strong>{porResponder}</strong><span>Solicitudes pendientes</span></div>
      <div><strong>{conversaciones}</strong><span>Contactos aceptados</span></div>
    </section>
    <section className="role-section">
      <h2>Accesos rápidos</h2>
      <div className="role-shortcuts">
        {accesos.map((item) => <button type="button" className="role-shortcut" key={item.texto} onClick={item.accion}>
          <span className="role-shortcut-icon" aria-hidden="true">{item.icono}</span>
          <strong>{item.texto}</strong>
          <small>{item.descripcion}</small>
        </button>)}
      </div>
    </section>
    <section className="role-section">
      <div className="section-heading"><div><h2>{destacado}</h2>
        <p className="muted">Publicaciones recientes de la comunidad</p></div>
        <button className="text-button" onClick={() => onExplore(categoriaSugerida)} type="button">Ver todas →</button>
      </div>
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
      {loading && <p className="posts-feedback" role="status">Cargando publicaciones…</p>}
      {!loading && !error && (sugeridas.length
        ? <div className="post-grid">{sugeridas.map((post) =>
          <PublicacionCard key={post.id} post={post} userUid={uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />)}</div>
        : <p className="posts-feedback">Todavía no hay publicaciones de esta categoría. Puedes revisar todas en Explorar.</p>)}
    </section>
    {tipoCuenta === 'dueno_cancha' && <p className="role-note">FutMatch permite publicar canchas y contactar a personas interesadas. La reserva, el pago y la disponibilidad confirmada se coordinan fuera de la plataforma.</p>}
  </div>
}

export function MisPublicaciones({
  uid, publicaciones, solicitudes, loading, error, onPublish, onInterest, onDelete,
}: {
  uid: string
  publicaciones: Publicacion[]
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  onPublish: () => void
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
}) {
  const propias = publicaciones.filter((post) => post.autorUid === uid)
  return <div className="page">
    <section className="page-heading">
      <div><p className="eyebrow">MI ACTIVIDAD</p><h1>Mis publicaciones</h1><p className="muted">Aquí puedes revisar y eliminar los anuncios que creaste.</p></div>
      <button className="primary-button" type="button" onClick={onPublish}>＋ Nueva publicación</button>
    </section>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando publicaciones…</p>}
    {!loading && !error && (propias.length
      ? <div className="post-grid role-own-posts">{propias.map((post) =>
          <PublicacionCard key={post.id} post={post} userUid={uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />)}</div>
      : <p className="posts-feedback">Todavía no has creado publicaciones. Selecciona «Nueva publicación» para comenzar.</p>)}
  </div>
}
