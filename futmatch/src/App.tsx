import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import AuthScreen from './AuthScreen'
import { escucharPublicaciones, eliminarPublicacion, obtenerPublicacionPorId } from './publicaciones'
import { escucharEquipos } from './equipos'
import type { EquipoRegistrado } from './equipos'
import { escucharCanchas } from './canchas'
import type { CanchaRegistrada } from './canchas'
import { CatalogoEquipos, FichaEquipo } from './VistasEquipos'
import { CatalogoCanchas, EditarMisCanchas } from './VistasCanchas'
import { escucharPartidos } from './partidos'
import type { Partido } from './partidos'
import { escucharReservas, solicitarReserva } from './reservas'
import type { ReservaCancha } from './reservas'
import { MisPartidos } from './VistasPartidos'
import { MisReservas } from './VistasReservas'
import type { Publicacion, Categoria } from './publicaciones'
import { Explore, Publish } from './VistasPublicaciones'
import { PanelPorRol, MisPublicaciones } from './PanelPorRol'
import { observarSolicitudes, solicitarParticipacion } from './solicitudes'
import type { Solicitud } from './solicitudes'
import { Matches, Mensajes, ConversacionesCanchas } from './Conexiones'
import { Perfil } from './Perfil'
import type { PerfilUsuario } from './Perfil'
import { TIPOS_CUENTA, tipoCuentaValido } from './tiposCuenta'
import type { TipoCuenta } from './tiposCuenta'
import { FutIcon } from './FutIcon'
import type { FutIconName } from './FutIcon'
import './App.css'

type View = 'inicio' | 'explorar' | 'equipos' | 'mi_equipo' | 'canchas' | 'partidos' | 'reservas' | 'publicar' | 'mis_publicaciones' | 'matches' | 'mensajes' | 'perfil' | 'ayuda'
// Las vistas del cliente son específicas por rol; Firestore protege los datos.
const roleViews: Record<TipoCuenta, readonly View[]> = {
  jugador: ['inicio','explorar','equipos','publicar','mis_publicaciones','matches','mensajes','perfil','ayuda'],
  capitan: ['inicio','explorar','equipos','mi_equipo','canchas','partidos','reservas','publicar','mis_publicaciones','matches','mensajes','perfil','ayuda'],
  equipo: ['inicio','explorar','equipos','mi_equipo','canchas','partidos','reservas','publicar','mis_publicaciones','matches','mensajes','perfil','ayuda'],
  dueno_cancha: ['inicio','publicar','mis_publicaciones','mensajes','perfil','ayuda'],
}
const navItems: { id: View; label: string; icon: FutIconName }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'explorar', label: 'Explorar', icon: 'search' },
  { id: 'equipos', label: 'Equipos', icon: 'users' },
  { id: 'mi_equipo', label: 'Mi equipo', icon: 'shield' },
  { id: 'canchas', label: 'Canchas', icon: 'map-pin' },
  { id: 'partidos', label: 'Mis partidos', icon: 'swords' },
  { id: 'reservas', label: 'Reservas', icon: 'calendar' },
  { id: 'publicar', label: 'Publicar', icon: 'plus' },
  { id: 'mis_publicaciones', label: 'Mis publicaciones', icon: 'files' },
  { id: 'matches', label: 'Matches', icon: 'handshake' },
  { id: 'mensajes', label: 'Mensajes', icon: 'message' },
  { id: 'perfil', label: 'Perfil', icon: 'user' },
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
  const [equipos, setEquipos] = useState<EquipoRegistrado[]>([])
  const [equiposLoading, setEquiposLoading] = useState(true)
  const [equiposError, setEquiposError] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const miEquipo = equipos.find((item) => item.ownerUid === user.uid) || null
  const [canchas, setCanchas] = useState<CanchaRegistrada[]>([])
  const [canchasLoading, setCanchasLoading] = useState(true)
  const [canchasError, setCanchasError] = useState('')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [partidosLoading, setPartidosLoading] = useState(true)
  const [partidosError, setPartidosError] = useState('')
  const [reservas, setReservas] = useState<ReservaCancha[]>([])
  const [reservasLoading, setReservasLoading] = useState(true)
  const [reservasError, setReservasError] = useState('')
  const [partidoSeleccionadoId, setPartidoSeleccionadoId] = useState('')
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
      : tipoCuenta === 'capitan' ? 'equipo_busca_jugadores'
      : tipoCuenta === 'equipo' ? 'equipo_busca_rival'
      : 'persona_busca_equipo'
  }
  const goTo = (nextView: View) => {
    const allowedView: View = roleViews[tipoCuenta].includes(nextView) ? nextView : 'inicio'
    if (allowedView === 'publicar') setCategoriaInicial(defaultCategoria())
    if (allowedView === 'equipos') setSelectedTeamId('')
    setView(allowedView)
    setMenuOpen(false)
  }
  const explorarCategoria = (categoria: Categoria) => {
    if (tipoCuenta === 'dueno_cancha') { goTo('inicio'); return }
    setFilter(categoria)
    goTo('explorar')
  }
  const publicarCategoria = (categoria: Categoria) => {
    const categoriasPermitidas: Record<TipoCuenta, readonly Categoria[]> = {
      jugador: ['persona_busca_equipo'],
      capitan: ['equipo_busca_jugadores','equipo_busca_rival','busca_cancha'],
      equipo: ['equipo_busca_rival','busca_cancha'],
      dueno_cancha: ['ofrece_cancha'],
    }
    if (!categoriasPermitidas[tipoCuenta].includes(categoria)) { goTo('inicio'); return }
    setCategoriaInicial(categoria)
    setView('publicar')
    setMenuOpen(false)
  }
  const openEquipo = (equipoId: string) => {
    if (!roleViews[tipoCuenta].includes('equipos')) return
    setSelectedTeamId(equipoId)
    setView('equipos')
    setMenuOpen(false)
  }
  const goToCanchas = (partidoId?: string) => {
    if (!roleViews[tipoCuenta].includes('canchas')) return
    setPartidoSeleccionadoId(partidoId || '')
    goTo('canchas')
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

  useEffect(() => {
    // Esperar al perfil para consultar Firestore con los permisos del rol real.
    if (perfilLoading) return
    setPostsLoading(true)
    setPostsError('')
    setPublicaciones([])
    return escucharPublicaciones(
      (items) => { setPublicaciones(items); setPostsLoading(false); setPostsError('') },
      (error) => {
        setPostsLoading(false)
        const codigo = (error as Error & { code?: string }).code
        setPostsError(codigo === 'permission-denied'
          ? 'Firestore rechazó la carga de publicaciones (permission-denied). Comprueba las reglas publicadas y el rol de tu cuenta.'
          : codigo === 'failed-precondition'
            ? 'Firestore necesita un índice o una condición de consulta (failed-precondition). Abre F12 → Console para ver el detalle y el enlace del índice.'
            : codigo === 'unavailable' || codigo === 'deadline-exceeded'
              ? `No se pudo conectar con Firestore (${codigo}). Revisa tu conexión e inténtalo de nuevo.`
              : `No se pudieron cargar las publicaciones${codigo ? ` (${codigo})` : ''}. Abre F12 → Console para revisar el motivo.`)
      },
      { uid: user.uid, tipoCuenta },
    )
  }, [user.uid, tipoCuenta, perfilLoading])

  useEffect(() => escucharEquipos(
    (items) => { setEquipos(items); setEquiposLoading(false); setEquiposError('') },
    () => {
      setEquiposLoading(false)
      setEquiposError('No se pudieron cargar los equipos. Publica las reglas actualizadas de Firestore.')
    },
  ), [])

  useEffect(() => escucharCanchas(
    (items) => { setCanchas(items); setCanchasLoading(false); setCanchasError('') },
    () => {
      setCanchasLoading(false)
      setCanchasError('No se pudieron cargar las canchas. Revisa las reglas de Firebase.')
    },
  ), [])

  useEffect(() => {
    if (perfilLoading || (tipoCuenta !== 'capitan' && tipoCuenta !== 'equipo')) {
      setPartidos([])
      setPartidosLoading(false)
      return
    }
    setPartidosLoading(true)
    return escucharPartidos(user.uid,
      items => { setPartidos(items); setPartidosLoading(false); setPartidosError('') },
      error => { setPartidosLoading(false); setPartidosError(`No se pudieron cargar partidos (${(error as Error & { code?: string }).code || 'error'}).`) })
  }, [user.uid, tipoCuenta, perfilLoading])

  useEffect(() => {
    if (perfilLoading || (tipoCuenta !== 'capitan' && tipoCuenta !== 'equipo' && tipoCuenta !== 'dueno_cancha')) {
      setReservas([])
      setReservasLoading(false)
      return
    }
    setReservasLoading(true)
    return escucharReservas(user.uid, tipoCuenta,
      items => { setReservas(items); setReservasLoading(false); setReservasError('') },
      error => { setReservasLoading(false); setReservasError(`No se pudieron cargar reservas (${(error as Error & { code?: string }).code || 'error'}). Comprueba las reglas de Firestore.`) })
  }, [user.uid, tipoCuenta, perfilLoading])

  useEffect(() => observarSolicitudes(
    user.uid,
    (items) => { setSolicitudes(items); setRequestsLoading(false); setRequestsError('') },
    () => {
      setRequestsLoading(false)
      setRequestsError('No se pudieron cargar las solicitudes. Publica las reglas nuevas de Firestore.')
    },
  ), [user.uid])

  async function onInterest(post: Publicacion) {
    if (tipoCuenta === 'equipo' && post.categoria === 'equipo_busca_jugadores'
      && post.autorUid !== user.uid) {
      throw new Error('Las cuentas Equipo no pueden consultar ni responder vacantes de otros equipos.')
    }
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
    if (post.categoria === 'ofrece_cancha' && reservas.some(reserva =>
      reserva.canchaId === post.canchaId && ['pendiente','confirmada'].includes(reserva.estado))) {
      throw new Error('Esta cancha tiene reservas pendientes o confirmadas. Debes cancelarlas primero.')
    }
    await eliminarPublicacion(post)
    setLocalNotice('Tu publicación se eliminó correctamente.')
  }

  async function onSolicitarReserva(cancha: CanchaRegistrada, partido: Partido, nota: string) {
    if (tipoCuenta !== 'equipo' && tipoCuenta !== 'capitan') {
      throw new Error('Solo Equipo o Capitán pueden solicitar reservas.')
    }
    await solicitarReserva(cancha, partido, user.uid, nota)
    setLocalNotice('Solicitud de reserva enviada. El dueño debe confirmarla antes de considerar el turno reservado.')
  }

  async function onCanchaContact(cancha: CanchaRegistrada) {
    if (tipoCuenta !== 'equipo' && tipoCuenta !== 'capitan') {
      throw new Error('Solo las cuentas Equipo o Capitán pueden consultar canchas.')
    }
    const post = await obtenerPublicacionPorId(cancha.anuncioId)
    if (!post || post.categoria !== 'ofrece_cancha' || post.canchaId !== cancha.id) {
      throw new Error('Este anuncio ya no está disponible para contacto.')
    }
    await onInterest(post)
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
  const displayedNav = navItems.filter(item => roleViews[tipoCuenta].includes(item.id))
  const mobileNav = displayedNav.filter(item => (tipoCuenta === 'dueno_cancha'
    ? ['inicio','publicar','mensajes','perfil'].includes(item.id)
    : tipoCuenta === 'jugador'
      ? ['inicio','explorar','matches','mensajes','perfil'].includes(item.id)
      : ['inicio','mi_equipo','partidos','reservas','mensajes'].includes(item.id)))
  const currentView: View = roleViews[tipoCuenta].includes(view) ? view : 'inicio'
  const navigationGroups = [
    { title: 'DESCUBRIR', ids: ['inicio', 'explorar', 'equipos', 'canchas'] },
    { title: 'GESTIONAR', ids: ['mi_equipo', 'publicar', 'mis_publicaciones', 'partidos', 'reservas'] },
    { title: 'COMUNICACIÓN', ids: ['matches', 'mensajes', 'perfil'] },
  ] as const
  function labelFor(item: (typeof navItems)[number]): string {
    if (tipoCuenta !== 'dueno_cancha') {
      if (item.id === 'equipos') return tipoCuenta === 'jugador' ? 'Buscar equipos' : 'Buscar rivales'
      if (item.id === 'publicar' && tipoCuenta === 'jugador') return 'Publicar búsqueda'
      if (item.id === 'matches') return tipoCuenta === 'jugador' ? 'Mis postulaciones' : 'Solicitudes'
      if (item.id === 'canchas') return 'Buscar canchas'
      return item.label
    }
    if (item.id === 'publicar') return 'Anunciar cancha'
    if (item.id === 'mis_publicaciones') return 'Mis canchas'
    if (item.id === 'mensajes') return 'Solicitudes y mensajes'
    if (item.id === 'reservas') return 'Solicitudes de reserva'
    return item.label
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><FutIcon name="football" /></span><span>Fut<span>Match</span></span></div>
      <div className="profile-mini">
        <div className="avatar avatar-purple">{initials}</div>
        <div><strong>{displayName}</strong><small>{TIPOS_CUENTA[tipoCuenta].label}</small></div>
        <button type="button" aria-label="Editar mi perfil" title="Editar mi perfil" onClick={() => goTo('perfil')}>•••</button>
      </div>
      <nav className="main-nav" aria-label="Navegación principal">
        {navigationGroups.map(group => {
          const visible = displayedNav.filter(item => (group.ids as readonly string[]).includes(item.id))
          if (!visible.length) return null
          return <div className="nav-group" key={group.title}>
            <p className="nav-section-title">{group.title}</p>
            {visible.map(item => <button
              className={currentView === item.id ? 'active' : ''} type="button" key={item.id}
              aria-current={currentView === item.id ? 'page' : undefined}
              onClick={() => goTo(item.id)}
            ><span className="nav-icon"><FutIcon name={item.icon} /></span>{labelFor(item)}
              {(item.id === 'matches' || (tipoCuenta === 'dueno_cancha' && item.id === 'mensajes'))
                && newRequests > 0 && <span className="nav-badge">{newRequests}</span>}
            </button>)}
          </div>
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="help-link" type="button" onClick={() => goTo('ayuda')}><FutIcon name="help" /> Centro de ayuda</button>
        <button className="logout" type="button" onClick={() => { void signOut(auth) }}><FutIcon name="logout" /> Cerrar sesión</button>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú"><FutIcon name="menu" /></button>
        <div className="mobile-brand"><FutIcon name="football" /> Fut<span>Match</span></div>
        <div className="topbar-actions">
          <button type="button" className="icon-button" aria-label={`Solicitudes pendientes: ${newRequests}`}
            title="Ver solicitudes recibidas" onClick={() => goTo(tipoCuenta === 'dueno_cancha' ? 'mensajes' : 'matches')}><FutIcon name="bell" />{newRequests > 0 && <i />}</button>
          <button type="button" className="avatar avatar-purple profile-shortcut" title="Ver mi perfil"
            aria-label="Ver mi perfil" onClick={() => goTo('perfil')}>{initials}</button>
        </div>
      </header>
      {(notice || localNotice) && <div className="session-notice" role="status">
        <span>{localNotice || notice}</span>
        <button type="button" onClick={() => { setLocalNotice(''); onDismissNotice() }} aria-label="Cerrar aviso">×</button>
      </div>}
      {tipoCuenta === 'equipo' && <div className="session-notice" role="status">
        <span>La cuenta Equipo fue reemplazada por Capitán. Cambia tu tipo de cuenta desde Perfil; se conservarán tu equipo, mensajes y partidos.</span>
        <button className="secondary-button" type="button" onClick={() => goTo('perfil')}>Actualizar cuenta</button>
      </div>}
      {currentView === 'inicio' && <PanelPorRol nombre={displayName} perfil={perfil} tipoCuenta={tipoCuenta}
        uid={user.uid} publicaciones={publicaciones} solicitudes={solicitudes}
        equipoRegistrado={!!miEquipo}
        loading={postsLoading} error={postsError} onNavigate={goTo} onExplore={explorarCategoria}
        onPublish={publicarCategoria} onInterest={onInterest} onDelete={onDelete}
        onOpenEquipos={() => goTo('equipos')} onOpenCanchas={() => goToCanchas()}
        onOpenPartidos={() => goTo('partidos')}
        onOpenReservas={() => goTo(tipoCuenta === 'dueno_cancha' ? 'mensajes' : 'reservas')} />}
      {currentView === 'explorar' && <Explore publicaciones={publicaciones} filter={filter} setFilter={setFilter}
        loading={postsLoading} error={postsError}
        userUid={user.uid} solicitudes={solicitudes} onInterest={onInterest} onDelete={onDelete}
        viewerTipoCuenta={tipoCuenta} />}
      {currentView === 'equipos' && (selectedTeamId
        ? <FichaEquipo key={selectedTeamId} equipo={equipos.find((team) => team.id === selectedTeamId) || null}
            user={user} perfil={perfil} onNotice={setLocalNotice} onBack={() => goTo('equipos')}
            onFindPlayers={() => explorarCategoria('persona_busca_equipo')} />
        : <CatalogoEquipos equipos={equipos} loading={equiposLoading} error={equiposError}
            onOpenTeam={openEquipo} onFindVacancies={() => explorarCategoria('equipo_busca_jugadores')}
            onFindRivals={() => explorarCategoria('equipo_busca_rival')}
            viewerTipoCuenta={tipoCuenta} currentUid={user.uid} miEquipo={miEquipo}
             onRegisterTeam={() => goTo('mi_equipo')}
            publicaciones={publicaciones} solicitudes={solicitudes} onInterest={onInterest} />)}
      {currentView === 'mi_equipo' && (tipoCuenta === 'capitan' || tipoCuenta === 'equipo') && <FichaEquipo
        key={miEquipo?.id || 'nuevo'} equipo={miEquipo} user={user} perfil={perfil}
        onNotice={setLocalNotice} onBack={() => goTo('equipos')}
        onFindPlayers={() => explorarCategoria('persona_busca_equipo')} />}
      {currentView === 'canchas' && (tipoCuenta === 'capitan' || tipoCuenta === 'equipo') &&
        <CatalogoCanchas canchas={canchas} loading={canchasLoading} error={canchasError}
          solicitudes={solicitudes} userUid={user.uid} onContact={onCanchaContact}
          initialComunaCodigo={miEquipo?.comunaCodigo || perfil?.comunaCodigo || ''}
          partidos={partidos} reservas={reservas} partidoSeleccionadoId={partidoSeleccionadoId}
          onSelectPartido={setPartidoSeleccionadoId} onSolicitarReserva={onSolicitarReserva} />}
      {currentView === 'partidos' && (tipoCuenta === 'equipo' || tipoCuenta === 'capitan') &&
        <MisPartidos uid={user.uid} partidos={partidos} reservas={reservas} loading={partidosLoading}
          error={partidosError} onGoMatches={() => goTo('matches')} onFindCanchas={goToCanchas}
          onNotice={setLocalNotice} />}
      {currentView === 'reservas' && (tipoCuenta === 'equipo' || tipoCuenta === 'capitan') &&
        <MisReservas uid={user.uid} tipoCuenta={tipoCuenta} reservas={reservas}
          loading={reservasLoading} error={reservasError} onNotice={setLocalNotice}
          onFindCanchas={() => goToCanchas()} />}
      {currentView === 'publicar' && <Publish
        key={`${tipoCuenta}:${categoriaInicial}`}
        user={user} nombreAutor={displayName} tipoCuenta={tipoCuenta}
        equipoRegistrado={perfil?.nombreEquipo || ''} canchaRegistrada={perfil?.nombreCancha || ''}
        regionPerfil={perfil?.regionCodigo || ''} comunaPerfil={perfil?.comunaCodigo || ''}
        categoriaInicial={categoriaInicial} equipo={miEquipo} onGoToEquipo={() => goTo('mi_equipo')}
        onCreated={afterPublish} />}
      {currentView === 'mis_publicaciones' && <>
        <MisPublicaciones uid={user.uid}
          publicaciones={publicaciones} solicitudes={solicitudes} loading={postsLoading}
          error={postsError} onPublish={() => goTo('publicar')} onInterest={onInterest} onDelete={onDelete}
          tipoCuenta={tipoCuenta} />
        {tipoCuenta === 'dueno_cancha' && <EditarMisCanchas canchas={canchas} uid={user.uid}
          onNotice={setLocalNotice} />}
      </>}
      {currentView === 'matches' && <Matches user={user} solicitudes={solicitudes} loading={requestsLoading}
        error={requestsError} onOpenChat={openChat} publicaciones={publicaciones} miEquipo={miEquipo}
        equipos={equipos} onOpenTeam={openEquipo} onFindCanchas={goToCanchas}
        partidos={partidos} onOpenPartidos={() => goTo('partidos')} onNotice={setLocalNotice} />}
      {currentView === 'mensajes' && (tipoCuenta === 'dueno_cancha'
        ? <>
            <MisReservas uid={user.uid} tipoCuenta={tipoCuenta} reservas={reservas}
              loading={reservasLoading} error={reservasError} onNotice={setLocalNotice}
              onFindCanchas={() => goToCanchas()} embedded />
            <ConversacionesCanchas user={user} solicitudes={solicitudes} loading={requestsLoading}
              error={requestsError} initialSelectedId={selectedChatId} />
          </>
        : <Mensajes user={user} solicitudes={solicitudes} initialSelectedId={selectedChatId} />)}
      {currentView === 'perfil' && <Perfil user={user} perfil={perfil} loading={perfilLoading}
        error={perfilError} onNotice={(message) => setLocalNotice(message)} />}
      {currentView === 'ayuda' && <SimplePage icon="?" title="Centro de ayuda"
        text={tipoCuenta === 'dueno_cancha'
          ? 'Anuncia tu cancha con dirección y tarifa por hora. En Solicitudes de reserva puedes aceptar o rechazar horarios de partidos; en Conversaciones puedes hablar con los interesados. Los pagos no se procesan en FutMatch.'
          : tipoCuenta === 'jugador'
          ? 'En Explorar verás las vacantes publicadas por capitanes. Pulsa «Postular al equipo». El capitán recibirá tu postulación en Matches y, si la acepta, podrán conversar por Mensajes. También puedes publicar «Busco equipo».'
          : 'En Explorar puedes contactar a otros usuarios mediante «Me interesa». El autor recibe la solicitud en Matches. Una vez aceptada, se habilita el chat de Mensajes.'}
        button={tipoCuenta === 'dueno_cancha' ? 'Anunciar cancha' : 'Explorar publicaciones'}
        onClick={() => goTo(tipoCuenta === 'dueno_cancha' ? 'publicar' : 'explorar')} />}
    </main>
    <nav className="bottom-nav">
      {mobileNav.map((item) => <button className={currentView === item.id ? 'active' : ''}
        type="button" key={item.id} onClick={() => goTo(item.id)}><span className="bottom-nav-icon"><FutIcon name={item.icon} /></span>{labelFor(item)}</button>)}
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
