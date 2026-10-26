import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import AuthScreen from './AuthScreen'
import { escucharPublicaciones } from './publicaciones'
import type { Publicacion, Categoria } from './publicaciones'
import { Home, Explore, Publish } from './Publicaciones'
import './App.css'

type View = 'inicio' | 'explorar' | 'publicar' | 'matches' | 'mensajes' | 'perfil'
const navItems: { id: View; label: string; icon: string }[] = [{ id: 'inicio', label: 'Inicio', icon: '⌂' }, { id: 'explorar', label: 'Explorar', icon: '⌕' }, { id: 'publicar', label: 'Publicar', icon: '+' }, { id: 'matches', label: 'Matches', icon: '♥' }, { id: 'mensajes', label: 'Mensajes', icon: '▱' }, { id: 'perfil', label: 'Perfil', icon: '◉' }]

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (account) => {
      setUser(account)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) return <div className="auth-loading" role="status">⚽ Cargando FutMatch…</div>
  if (!user) return <AuthScreen onNotice={setNotice} />
  return <Dashboard user={user} notice={notice} onDismissNotice={() => setNotice('')} />
}

function Dashboard({ user, notice, onDismissNotice }: { user: User; notice: string; onDismissNotice: () => void }) {
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'Jugador'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const [view, setView] = useState<View>('inicio')
  const [filter, setFilter] = useState<Categoria | 'todos'>('todos')
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [localNotice, setLocalNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const goTo = (nextView: View) => { setView(nextView); setMenuOpen(false) }
  useEffect(() => {
    const stop = escucharPublicaciones(
      (items) => { setPublicaciones(items); setPostsLoading(false); setPostsError('') },
      () => { setPostsLoading(false); setPostsError('No se pudieron cargar las publicaciones. Revisa tu conexión y las reglas de Firestore.') },
    )
    return stop
  }, [])

  const afterPublish = (category: Categoria) => {
    setFilter(category)
    setLocalNotice('Tu publicación se guardó correctamente. Ya aparece en Explorar.')
    goTo('explorar')
  }
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}><div className="brand"><span className="brand-mark">⚽</span><span>Fut<span>Match</span></span></div><div className="profile-mini"><div className="avatar avatar-purple">{initials}</div><div><strong>{displayName}</strong><small>Futbolista</small></div><button aria-label="Opciones">•••</button></div><nav className="main-nav" aria-label="Navegación principal">{navItems.map((item) => <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => goTo(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><button className="help-link"><span>?</span> Centro de ayuda</button><button className="logout" onClick={() => { void signOut(auth) }}><span>↪</span> Cerrar sesión</button></div></aside>
    <main className="main-content"><header className="topbar"><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button><div className="mobile-brand">⚽ Fut<span>Match</span></div><div className="topbar-actions"><button className="icon-button" aria-label="Notificaciones">♢<i /></button><div className="avatar avatar-purple" title={user.email ?? undefined}>{initials}</div></div></header>{(notice || localNotice) && <div className="session-notice" role="status"><span>{localNotice || notice}</span><button onClick={() => { setLocalNotice(''); onDismissNotice() }} aria-label="Cerrar aviso">×</button></div>}
      {view === 'inicio' && <Home name={displayName} onNavigate={goTo} publicaciones={publicaciones} loading={postsLoading} error={postsError} />}
      {view === 'explorar' && <Explore publicaciones={publicaciones} filter={filter} setFilter={setFilter} loading={postsLoading} error={postsError} />}
      {view === 'publicar' && <Publish user={user} onCreated={afterPublish} />}
      {view === 'matches' && <SimplePage icon="♥" title="Tus matches" text="Próximamente podrás guardar y gestionar tus conexiones." button="Explorar publicaciones" onClick={() => goTo('explorar')} />}
      {view === 'mensajes' && <SimplePage icon="▱" title="Mensajes" text="La mensajería estará disponible en una futura etapa de FutMatch." button="Explorar publicaciones" onClick={() => goTo('explorar')} />}
      {view === 'perfil' && <Profile user={user} />}
    </main><nav className="bottom-nav">{navItems.slice(0, 5).map((item) => <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => goTo(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
  </div>
}
function Profile({ user }: { user: User }) { const name = user.displayName?.trim() || user.email?.split('@')[0] || 'Jugador'; return <div className="page"><div className="profile-cover"><div className="profile-avatar">{name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div><div><p className="eyebrow">MI PERFIL</p><h1>{name}</h1><p>⚽ {user.email}</p></div></div><div className="profile-layout"><section className="profile-card"><h2>Sobre mí</h2><p>Tu perfil está vinculado a Firebase Authentication. Participa y organiza partidos con tu cuenta de FutMatch.</p><div className="profile-tags"><span>Cuenta registrada</span></div></section><section className="profile-card"><h2>Datos deportivos</h2><p>La posición, el nivel de juego y la disponibilidad se podrán configurar cuando incorporemos la edición del perfil.</p></section></div></div> }
function SimplePage({ icon, title, text, button, onClick }: { icon: string; title: string; text: string; button: string; onClick: () => void }) { return <div className="empty-page"><div className="empty-icon">{icon}</div><h1>{title}</h1><p className="muted">{text}</p><button className="primary-button" onClick={onClick}>{button} →</button></div> }
export default App

