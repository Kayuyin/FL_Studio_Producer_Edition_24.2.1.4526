import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import AuthScreen from './AuthScreen'
import { escucharPublicaciones, eliminarPublicacion } from './publicaciones'
import type { Publicacion, Categoria } from './publicaciones'
import { Home, Explore, Publish } from './VistasPublicaciones'
import { observarSolicitudes, solicitarParticipacion } from './solicitudes'
import type { Solicitud } from './solicitudes'
import { Matches, Mensajes } from './Conexiones'
import { Perfil } from './Perfil'
import type { PerfilUsuario } from './Perfil'
import './App.css'

type View = 'inicio' | 'explorar' | 'publicar' | 'matches' | 'mensajes' | 'perfil' | 'ayuda'
const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'explorar', label: 'Explorar', icon: '⌕' },
  { id: 'publicar', label: 'Publicar', icon: '+' },
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

  const [view, setView] = useState<View>('inicio')
  const [filter, setFilter] = useState<Categoria | 'todos'>('todos')
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState('')
  const [selectedChatId, setSelectedChatId] = useState('')
  const [localNotice, setLocalNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const goTo = (nextView: View) => {
    setView(nextView)
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
    await solicitarParticipacion(post, user, displayName)
    setLocalNotice('Solicitud enviada. El autor puede aceptarla desde Matches.')
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
    setLocalNotice('Tu publicación se guardó correctamente. Ya aparece en Explorar.')
    goTo('explorar')
  }

  const newRequests = solicitudes.filter((item) =>
    item.autorPublicacionUid === user.uid && item.estado === 'pendiente').length

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark">⚽</span><span>Fut<span>Match</span></span></div>
      <div className="profile-mini">
        <div className="avatar avatar-purple">{initials}</div>
        <div><strong>{displayName}</strong><small>Futbolista</small></div>
        <button type="button" aria-label="Editar mi perfil" title="Editar mi perfil" onClick={() => goTo('perfil')}>•••</button>
      </div>
      <nav className="main-nav" aria-label="Navegación principal">
        {navItems.map((item) => <button
          className={view === item.id ? 'active' : ''} type="button" key={item.id}
          onClick={() => goTo(item.id)}
        ><span className="nav-icon">{item.icon}</span>{item.label}
          {item.id === 'matches' && newRequests > 0 && <span className="nav-badge">{newRequests}</span>}
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
      {view === 'inicio' && <Home name={displayName} onNavigate={goTo}
        publicaciones={publicaciones} loading={postsLoading} error={postsError}
        userUid={user.uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />}
      {view === 'explorar' && <Explore publicaciones={publicaciones} filter={filter} setFilter={setFilter}
        loading={postsLoading} error={postsError}
        userUid={user.uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete} />}
      {view === 'publicar' && <Publish user={user} nombreAutor={displayName} onCreated={afterPublish} />}
      {view === 'matches' && <Matches user={user} solicitudes={solicitudes} loading={requestsLoading}
        error={requestsError} onOpenChat={openChat} />}
      {view === 'mensajes' && <Mensajes user={user} solicitudes={solicitudes} initialSelectedId={selectedChatId} />}
      {view === 'perfil' && <Perfil user={user} perfil={perfil} loading={perfilLoading}
        error={perfilError} onNotice={(message) => setLocalNotice(message)} />}
      {view === 'ayuda' && <SimplePage icon="?" title="Centro de ayuda"
        text="Para buscar jugadores o equipos, visita Explorar y presiona «Me interesa». El autor recibe la solicitud en Matches. Una vez aceptada, se habilita la conversación en Mensajes. Puedes cambiar tu ubicación y datos deportivos en Perfil."
        button="Explorar publicaciones" onClick={() => goTo('explorar')} />}
    </main>
    <nav className="bottom-nav">
      {navItems.slice(0, 5).map((item) => <button className={view === item.id ? 'active' : ''}
        type="button" key={item.id} onClick={() => goTo(item.id)}><span>{item.icon}</span>{item.label}</button>)}
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
