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
  const mias = publicaciones.filter((post) => post.autorUid === uid
    && (tipoCuenta !== 'dueno_cancha' || post.categoria === 'ofrece_cancha'))
  const porResponder = solicitudes.filter((item) => item.autorPublicacionUid === uid && item.estado === 'pendiente').length
  const conversaciones = solicitudes.filter((item) => item.estado === 'aceptada'
    && (tipoCuenta !== 'dueno_cancha' || item.autorPublicacionUid === uid)).length

  let titulo = 'Tu fútbol empieza aquí'
  let subtitulo = 'Encuentra equipos y oportunidades para jugar en tu comuna.'
  let destacado = 'Vacantes publicadas por capitanes'
  let categoriaSugerida: Categoria = 'equipo_busca_jugadores'
  let accesos: Acceso[] = [
    { texto: 'Buscar equipo', descripcion: 'Vacantes publicadas por capitanes', icono: '⌕', accion: () => onExplore('equipo_busca_jugadores') },
    { texto: 'Ofrecerme como jugador', descripcion: 'Publica tu búsqueda de equipo', icono: '+', accion: () => onPublish('persona_busca_equipo') },
    { texto: 'Mis postulaciones', descripcion: 'Revisa las solicitudes enviadas', icono: '♥', accion: () => onNavigate('matches') },
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
      { texto: 'Mis publicaciones', descripcion: 'Administra los anuncios del equipo', icono: '▤', accion: () => onNavigate('mis_publicaciones') },
      { texto: 'Encontrar rivales', descripcion: 'Explora desafíos deportivos', icono: '⚔', accion: () => onExplore('equipo_busca_rival') },
      { texto: 'Crear desafío', descripcion: 'Publica un partido propuesto', icono: '▤', accion: () => onPublish('equipo_busca_rival') },
    ]
  } else if (tipoCuenta === 'dueno_cancha') {
    titulo = 'Panel de mis canchas'
    subtitulo = `Anuncia ${cancha}, responde consultas y conversa con las personas interesadas.`
    destacado = 'Mis canchas'
    categoriaSugerida = 'ofrece_cancha'
    accesos = [
      { texto: 'Anunciar cancha', descripcion: 'Publica una oferta de tu recinto', icono: '+', accion: () => onPublish('ofrece_cancha') },
      { texto: 'Mis canchas', descripcion: 'Revisa o elimina anuncios propios', icono: '▤', accion: () => onNavigate('mis_publicaciones') },
      { texto: 'Conversaciones', descripcion: 'Acepta consultas y conversa por chat', icono: '▱', accion: () => onNavigate('mensajes') },
      { texto: 'Editar perfil', descripcion: 'Actualiza los datos de tu cancha', icono: '◉', accion: () => onNavigate('perfil') },
    ]
  }
  const sugeridas = publicaciones.filter((post) => post.categoria === categoriaSugerida
    && post.autorUid !== uid
    && (tipoCuenta !== 'jugador' || post.autorTipoCuenta === 'capitan')).slice(0, 3)

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
      <div><strong>{mias.length}</strong><span>{tipoCuenta === 'dueno_cancha' ? 'Anuncios de cancha' : 'Mis publicaciones'}</span></div>
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
    {tipoCuenta !== 'dueno_cancha' && <section className="role-section">
      <div className="section-heading"><div><h2>{destacado}</h2>
        <p className="muted">Publicaciones recientes de la comunidad</p></div>
        <button className="text-button" onClick={() => onExplore(categoriaSugerida)} type="button">Ver todas →</button>
      </div>
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
      {loading && <p className="posts-feedback" role="status">Cargando publicaciones…</p>}
      {!loading && !error && (sugeridas.length
        ? <div className="post-grid">{sugeridas.map((post) =>
          <PublicacionCard key={post.id} post={post} userUid={uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} viewerTipoCuenta={tipoCuenta} />)}</div>
        : <p className="posts-feedback">{tipoCuenta === 'jugador'
          ? 'Todavía no hay vacantes publicadas por capitanes. Revisa Explorar más adelante.'
          : 'Todavía no hay publicaciones de esta categoría. Puedes revisar todas en Explorar.'}</p>)}
    </section>}
    {tipoCuenta === 'dueno_cancha' && <p className="role-note">Solo puedes publicar ofertas de cancha y atender conversaciones relacionadas con tus anuncios. FutMatch no confirma reservas ni gestiona pagos.</p>}
  </div>
}

export function MisPublicaciones({
  uid, publicaciones, solicitudes, loading, error, onPublish, onInterest, onDelete, tipoCuenta,
}: {
  uid: string
  publicaciones: Publicacion[]
  solicitudes: Solicitud[]
  loading: boolean
  error: string
  onPublish: () => void
  onInterest: (post: Publicacion) => Promise<void>
  onDelete: (post: Publicacion) => Promise<void>
  tipoCuenta: TipoCuenta
}) {
  const dueno = tipoCuenta === 'dueno_cancha'
  const propias = publicaciones.filter((post) => post.autorUid === uid
    && (!dueno || post.categoria === 'ofrece_cancha'))
  return <div className="page">
    <section className="page-heading">
      <div><p className="eyebrow">MI ACTIVIDAD</p>
        <h1>{dueno ? 'Mis canchas' : 'Mis publicaciones'}</h1>
        <p className="muted">{dueno
          ? 'Revisa y elimina los anuncios de cancha que has publicado.'
          : 'Aquí puedes revisar y eliminar los anuncios que creaste.'}</p></div>
      <button className="primary-button" type="button" onClick={onPublish}>
        {dueno ? '＋ Anunciar cancha' : '＋ Nueva publicación'}</button>
    </section>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando publicaciones…</p>}
    {!loading && !error && (propias.length
      ? <div className="post-grid role-own-posts">{propias.map((post) =>
          <PublicacionCard key={post.id} post={post} userUid={uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />)}</div>
      : <p className="posts-feedback">{dueno
          ? 'Todavía no has anunciado una cancha. Presiona «Anunciar cancha» para comenzar.'
          : 'Todavía no has creado publicaciones. Selecciona «Nueva publicación» para comenzar.'}</p>)}
  </div>
}
