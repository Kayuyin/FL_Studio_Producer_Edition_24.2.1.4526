import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import AuthScreen from './AuthScreen'
import { escucharPublicaciones, eliminarPublicacion } from './publicaciones'
import type { Publicacion, Categoria } from './publicaciones'
import { Explore, Publish } from './VistasPublicaciones'
import { PanelPorRol, MisPublicaciones } from './PanelPorRol'
import { observarSolicitudes, solicitarParticipacion } from './solicitudes'
import type { Solicitud } from './solicitudes'
import { Matches, Mensajes, ConversacionesCanchas } from './Conexiones'
import { Perfil } from './Perfil'
import type { PerfilUsuario } from './Perfil'
import { TIPOS_CUENTA, tipoCuentaValido } from './tiposCuenta'
import './App.css'

type View = 'inicio' | 'explorar' | 'publicar' | 'mis_publicaciones' | 'matches' | 'mensajes' | 'perfil' | 'ayuda'
const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'explorar', label: 'Explorar', icon: '⌕' },
  { id: 'publicar', label: 'Publicar', icon: '+' },
  { id: 'mis_publicaciones', label: 'Mis publicaciones', icon: '▤' },
  { id: 'matches', label: 'Matches', icon: '♥' },
  { id: 'mensajes', label: 'Mensajes', icon: '▱' },
  { id: 'perfil', label: 'Perfil', icon: '◉' },
]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    return onAuthStateChanged(auth, (account) => {
      setUser(account)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="auth-loading" role="status">⚽ Cargando FutMatch…</div>
  if (!user) return <AuthScreen onNotice={setNotice} />
  return <Dashboard user={user} notice={notice} onDismissNotice={() => setNotice('')} />
}

function Dashboard({
  user, notice, onDismissNotice,
}: {
  user: User
  notice: string
  onDismissNotice: () => void
}) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [perfilLoading, setPerfilLoading] = useState(true)
  const [perfilError, setPerfilError] = useState('')
  const displayName = perfil?.nombre?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Jugador'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const tipoCuenta = tipoCuentaValido(perfil?.tipoCuenta) ? perfil.tipoCuenta : 'jugador'

  const [view, setView] = useState<View>('inicio')
  const [filter, setFilter] = useState<Categoria | 'todos'>('todos')
  const [categoriaInicial, setCategoriaInicial] = useState<Categoria>('persona_busca_equipo')
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [selectedChatId, setSelectedChatId] = useState('')
  const [localNotice, setLocalNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  function defaultCategoria(): Categoria {
    return tipoCuenta === 'dueno_cancha' ? 'ofrece_cancha'
      : tipoCuenta === 'capitan' || tipoCuenta === 'equipo' ? 'equipo_busca_jugadores'
      : 'persona_busca_equipo'
  }
  const goTo = (nextView: View) => {
    // El dueño de cancha no navega por anuncios ajenos ni envía solicitudes.
    const allowedView = tipoCuenta === 'dueno_cancha'
      ? nextView === 'explorar' ? 'inicio'
        : nextView === 'matches' ? 'mensajes' : nextView
      : nextView
    if (allowedView === 'publicar') setCategoriaInicial(defaultCategoria())
    setView(allowedView)
    setMenuOpen(false)
  }
  const explorarCategoria = (categoria: Categoria) => {
    if (tipoCuenta === 'dueno_cancha') { goTo('inicio'); return }
    setFilter(categoria)
    goTo('explorar')
  }
  const publicarCategoria = (categoria: Categoria) => {
    setCategoriaInicial(tipoCuenta === 'dueno_cancha' ? 'ofrece_cancha' : categoria)
    setView('publicar')
    setMenuOpen(false)
  }

  useEffect(() => onSnapshot(
    doc(db, 'usuarios', user.uid),
    (snapshot) => {
      setPerfil(snapshot.exists() ? (snapshot.data() as PerfilUsuario) : null)
      setPerfilLoading(false)
      setPerfilError('')
    },
    () => {
      setPerfilLoading(false)
      setPerfilError('No se pudo cargar el perfil. Comprueba las reglas de Firestore.')
    },
  ), [user.uid])

  useEffect(() => escucharPublicaciones(
    (items) => { setPublicaciones(items); setPostsLoading(false); setPostsError('') },
    () => {
      setPostsLoading(false)
      setPostsError('No se pudieron cargar las publicaciones. Revisa tu conexión y las reglas de Firestore.')
    },
  ), [])

  useEffect(() => observarSolicitudes(
    user.uid,
    (items) => { setSolicitudes(items); setRequestsLoading(false); setRequestsError('') },
    () => {
      setRequestsLoading(false)
      setRequestsError('No se pudieron cargar las solicitudes. Publica las reglas nuevas de Firestore.')
    },
  ), [user.uid])

  async function onInterest(post: Publicacion) {
    if (tipoCuenta === 'dueno_cancha') {
      throw new Error('Las cuentas de dueño de cancha solo reciben solicitudes sobre sus anuncios.')
    }
    if (tipoCuenta === 'jugador'
      && (post.categoria !== 'equipo_busca_jugadores' || post.autorTipoCuenta !== 'capitan')) {
      throw new Error('Un jugador solo puede postular a vacantes publicadas por capitanes.')
    }
    await solicitarParticipacion(post, user, displayName, tipoCuenta)
    setLocalNotice(tipoCuenta === 'jugador'
      ? 'Postulación enviada al capitán. Podrás ver su respuesta en Matches.'
      : 'Solicitud enviada. El autor puede aceptarla desde Matches.')
  }

  async function onDelete(post: Publicacion) {
    if (post.autorUid !== user.uid) {
      throw new Error('Solo puedes eliminar tus propias publicaciones.')
    }
    await eliminarPublicacion(post.id)
    setLocalNotice('Tu publicación se eliminó correctamente.')
  }

  function openChat(id: string) {
    setSelectedChatId(id)
    goTo('mensajes')
  }

  function afterPublish(category: Categoria) {
    setFilter(category)
    setLocalNotice(tipoCuenta === 'dueno_cancha'
      ? 'Tu cancha fue anunciada correctamente. Ya aparece en Mis canchas.'
      : 'Tu publicación se guardó correctamente. Ya aparece en Explorar.')
    goTo(tipoCuenta === 'dueno_cancha' ? 'mis_publicaciones' : 'explorar')
  }

  const newRequests = solicitudes.filter((item) =>
    item.autorPublicacionUid === user.uid && item.estado === 'pendiente').length
  const displayedNav = tipoCuenta === 'dueno_cancha'
    ? navItems.filter((item) => ['inicio', 'publicar', 'mis_publicaciones', 'mensajes', 'perfil'].includes(item.id))
    : navItems
  const currentView = tipoCuenta === 'dueno_cancha' && (view === 'explorar' || view === 'matches') ? 'inicio' : view
  function labelFor(item: (typeof navItems)[number]): string {
    if (tipoCuenta !== 'dueno_cancha') {
      return item.id === 'publicar' && tipoCuenta === 'jugador' ? 'Buscar equipo' : item.label
    }
    if (item.id === 'publicar') return 'Anunciar cancha'
    if (item.id === 'mis_publicaciones') return 'Mis canchas'
    if (item.id === 'mensajes') return 'Conversaciones'
    return item.label
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark">⚽</span><span>Fut<span>Match</span></span></div>
      <div className="profile-mini">
        <div className="avatar avatar-purple">{initials}</div>
        <div><strong>{displayName}</strong><small>{TIPOS_CUENTA[tipoCuenta].label}</small></div>
        <button type="button" aria-label="Editar mi perfil" title="Editar mi perfil" onClick={() => goTo('perfil')}>•••</button>
      </div>
      <nav className="main-nav" aria-label="Navegación principal">
        {displayedNav.map((item) => <button
          className={currentView === item.id ? 'active' : ''} type="button" key={item.id}
          onClick={() => goTo(item.id)}
        ><span className="nav-icon">{item.icon}</span>{labelFor(item)}
          {(item.id === 'matches' || (tipoCuenta === 'dueno_cancha' && item.id === 'mensajes'))
            && newRequests > 0 && <span className="nav-badge">{newRequests}</span>}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="help-link" type="button" onClick={() => goTo('ayuda')}><span>?</span> Centro de ayuda</button>
        <button className="logout" type="button" onClick={() => { void signOut(auth) }}><span>↪</span> Cerrar sesión</button>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
        <div className="mobile-brand">⚽ Fut<span>Match</span></div>
        <div className="topbar-actions">
          <button type="button" className="icon-button" aria-label={`Solicitudes pendientes: ${newRequests}`}
            title="Ver solicitudes recibidas" onClick={() => goTo('matches')}>♢{newRequests > 0 && <i />}</button>
          <button type="button" className="avatar avatar-purple profile-shortcut" title="Ver mi perfil"
            aria-label="Ver mi perfil" onClick={() => goTo('perfil')}>{initials}</button>
        </div>
      </header>
      {(notice || localNotice) && <div className="session-notice" role="status">
        <span>{localNotice || notice}</span>
        <button type="button" onClick={() => { setLocalNotice(''); onDismissNotice() }} aria-label="Cerrar aviso">×</button>
      </div>}
      {currentView === 'inicio' && <PanelPorRol nombre={displayName} perfil={perfil} tipoCuenta={tipoCuenta}
        uid={user.uid} publicaciones={publicaciones} solicitudes={solicitudes}
        loading={postsLoading} error={postsError} onNavigate={goTo} onExplore={explorarCategoria}
        onPublish={publicarCategoria} onInterest={onInterest} onDelete={onDelete} />}
      {currentView === 'explorar' && <Explore publicaciones={publicaciones} filter={filter} setFilter={setFilter}
        loading={postsLoading} error={postsError}
        userUid={user.uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete}
        viewerTipoCuenta={tipoCuenta} />}
      {currentView === 'publicar' && <Publish
        key={`${tipoCuenta}:${categoriaInicial}`}
        user={user} nombreAutor={displayName} tipoCuenta={tipoCuenta}
        equipoRegistrado={perfil?.nombreEquipo || ''} canchaRegistrada={perfil?.nombreCancha || ''}
        regionPerfil={perfil?.regionCodigo || ''} comunaPerfil={perfil?.comunaCodigo || ''}
        categoriaInicial={categoriaInicial} onCreated={afterPublish} />}
      {currentView === 'mis_publicaciones' && <MisPublicaciones uid={user.uid}
        publicaciones={publicaciones} solicitudes={solicitudes} loading={postsLoading}
        error={postsError} onPublish={() => goTo('publicar')} onInterest={onInterest} onDelete={onDelete} />}
      {currentView === 'matches' && <Matches user={user} solicitudes={solicitudes} loading={requestsLoading}
        error={requestsError} onOpenChat={openChat} />}
      {currentView === 'mensajes' && (tipoCuenta === 'dueno_cancha'
        ? <ConversacionesCanchas user={user} solicitudes={solicitudes} loading={requestsLoading}
            error={requestsError} initialSelectedId={selectedChatId} />
        : <Mensajes user={user} solicitudes={solicitudes} initialSelectedId={selectedChatId} />)}
      {currentView === 'perfil' && <Perfil user={user} perfil={perfil} loading={perfilLoading}
        error={perfilError} onNotice={(message) => setLocalNotice(message)} />}
      {currentView === 'ayuda' && <SimplePage icon="?" title="Centro de ayuda"
        text={tipoCuenta === 'dueno_cancha'
          ? 'Publica un anuncio desde Anunciar cancha. Cuando una persona se interese, podrás aceptar su solicitud en Conversaciones y hablar con ella. No hay reservas ni pagos automáticos.'
          : tipoCuenta === 'jugador'
          ? 'En Explorar verás las vacantes publicadas por capitanes. Pulsa «Postular al equipo». El capitán recibirá tu postulación en Matches y, si la acepta, podrán conversar por Mensajes. También puedes publicar «Busco equipo».'
          : 'En Explorar puedes contactar a otros usuarios mediante «Me interesa». El autor recibe la solicitud en Matches. Una vez aceptada, se habilita el chat de Mensajes.'}
        button={tipoCuenta === 'dueno_cancha' ? 'Anunciar cancha' : 'Explorar publicaciones'}
        onClick={() => goTo(tipoCuenta === 'dueno_cancha' ? 'publicar' : 'explorar')} />}
    </main>
    <nav className="bottom-nav">
      {displayedNav.filter((item) => item.id !== 'mis_publicaciones').slice(0, 5).map((item) => <button className={currentView === item.id ? 'active' : ''}
        type="button" key={item.id} onClick={() => goTo(item.id)}><span>{item.icon}</span>{labelFor(item)}</button>)}
    </nav>
  </div>
}

function SimplePage({
  icon, title, text, button, onClick,
}: {
  icon: string
  title: string
  text: string
  button: string
  onClick: () => void
}) {
  return <div className="empty-page"><div className="empty-icon">{icon}</div><h1>{title}</h1>
    <p className="muted">{text}</p><button type="button" className="primary-button" onClick={onClick}>{button} →</button>
  </div>
}
