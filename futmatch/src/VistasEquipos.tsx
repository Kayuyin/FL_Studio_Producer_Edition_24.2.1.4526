import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import type { EquipoRegistrado, IntegranteEquipo } from './equipos'
import { actualizarPosicion, crearEquipo, editarEquipo, escucharPlantilla,
  nombrarCapitan, nombrarCapitanResponsable, quitarIntegrante, ESCUDOS_EQUIPO, POSICIONES_EQUIPO } from './equipos'
import type { PerfilUsuario } from './Perfil'
import { REGIONES_CHILE, obtenerRegion } from './territorioChile'

export function CatalogoEquipos({
  equipos, loading, error, onOpenTeam, onFindVacancies,
}: {
  equipos: EquipoRegistrado[]
  loading: boolean
  error: string
  onOpenTeam: (equipoId: string) => void
  onFindVacancies: () => void
}) {
  const [search, setSearch] = useState('')
  const filtrados = equipos.filter((item) =>
    [item.nombre, item.comuna, item.capitanNombre, item.descripcion].some((field) =>
      field.toLocaleLowerCase('es-CL').includes(search.trim().toLocaleLowerCase('es-CL'))))
  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">DIRECTORIO DE FUTMATCH</p><h1>Equipos</h1>
        <p className="muted">Conoce los equipos, su capitán y los jugadores de su plantilla.</p></div>
      <button type="button" className="secondary-button" onClick={onFindVacancies}>Buscar vacantes</button>
    </div>
    <div className="filter-row">
      <label className="search-box">⌕ <input aria-label="Buscar equipos" placeholder="Buscar equipo, comuna o capitán..."
        value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando equipos…</p>}
    {!loading && !error && (filtrados.length
      ? <div className="post-grid team-grid">
        {filtrados.map((team) => <article key={team.id} className="team-card">
          <div className="team-shield">{team.escudo}</div>
          <h2>{team.nombre}</h2>
          <p className="muted">{team.comuna}{team.region ? ` · ${team.region}` : ''}</p>
          <p className="team-captain"><strong>Capitán:</strong> {team.capitanNombre || 'Por asignar'}</p>
          <p className="muted">{team.modalidad} · {team.nivel}</p>
          <p className="team-description">{team.descripcion || 'Equipo de la comunidad FutMatch.'}</p>
          <button type="button" className="secondary-button" onClick={() => onOpenTeam(team.id)}>Ver plantilla y capitán →</button>
        </article>)}
      </div>
      : <p className="posts-feedback">Todavía no hay equipos registrados con esa búsqueda.</p>)}
  </div>
}

function lugarInicial(equipo: EquipoRegistrado | null, perfil: PerfilUsuario | null) {
  const comunaAnterior = equipo?.comuna || perfil?.comuna || ''
  const regionDelEquipo = equipo?.comuna
    ? REGIONES_CHILE.find(region => region.comunas.some(c => c.nombre === equipo.comuna))
    : undefined
  const regionDelPerfil = perfil?.comuna
    ? REGIONES_CHILE.find(region => region.comunas.some(c => c.nombre === perfil.comuna))
    : undefined
  const regionCodigo = equipo?.regionCodigo || regionDelEquipo?.codigo
    || perfil?.regionCodigo || regionDelPerfil?.codigo || ''
  const region = obtenerRegion(regionCodigo)
  const comunaCodigo = equipo?.comunaCodigo
    || region?.comunas.find(c => c.nombre === comunaAnterior)?.codigo
    || (!equipo && perfil?.comunaCodigo) || ''
  return { regionCodigo, comunaCodigo }
}

export function FichaEquipo({
  equipo, user, perfil, onNotice, onBack, onFindPlayers,
}: {
  equipo: EquipoRegistrado | null
  user: User
  perfil: PerfilUsuario | null
  onNotice: (mensaje: string) => void
  onBack: () => void
  onFindPlayers: () => void
}) {
  const isManager = !equipo || equipo.ownerUid === user.uid
  const [integrantes, setIntegrantes] = useState<IntegranteEquipo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState(equipo?.nombre || perfil?.nombreEquipo || '')
  const [descripcion, setDescripcion] = useState(equipo?.descripcion || perfil?.bio || '')
  const [escudo, setEscudo] = useState(equipo?.escudo || '⚽')
  const [modalidad, setModalidad] = useState(equipo?.modalidad || 'Fútbol 7')
  const [nivel, setNivel] = useState(equipo?.nivel || 'Amateur')
  const [regionCodigo, setRegionCodigo] = useState(() => lugarInicial(equipo, perfil).regionCodigo)
  const [comunaCodigo, setComunaCodigo] = useState(() => lugarInicial(equipo, perfil).comunaCodigo)
  const regionSeleccionada = obtenerRegion(regionCodigo)

  useEffect(() => {
    if (!equipo) { setIntegrantes([]); return }
    setLoading(true)
    return escucharPlantilla(equipo.id, (members) => {
      setIntegrantes(members)
      setLoading(false)
      setError('')
    }, () => {
      setLoading(false)
      setError('No pudimos cargar la plantilla. Comprueba los permisos de Firestore.')
    })
  }, [equipo?.id])

  async function register() {
    if (!perfil) return
    setSaving(true)
    setError('')
    try {
      await crearEquipo(user, perfil, escudo, modalidad, nivel, { regionCodigo, comunaCodigo })
      onNotice('Equipo registrado. Ya puedes publicar convocatorias y mostrar su plantilla.')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setError(code === 'permission-denied'
        ? 'Firebase rechazó el registro del equipo. Comprueba las reglas nuevas y los datos de Perfil.'
        : (cause as Error).message || 'No fue posible registrar el equipo.')
    } finally { setSaving(false) }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!equipo || !isManager) return
    setSaving(true)
    setError('')
    try {
      await editarEquipo(equipo.id, nombre, descripcion, escudo, modalidad, nivel,
        { regionCodigo, comunaCodigo })
      onNotice('Datos del equipo actualizados.')
    } catch (cause) {
      setError((cause as Error).message || 'No se pudieron actualizar los datos del equipo.')
    } finally { setSaving(false) }
  }

  async function captain(member: IntegranteEquipo) {
    if (!equipo || !isManager) return
    setSaving(true)
    setError('')
    try {
      await nombrarCapitan(equipo.id, member)
      onNotice(`${member.nombre} fue asignado como capitán del equipo.`)
    } catch {
      setError('No se pudo designar al capitán. Comprueba las reglas de Firestore.')
    } finally { setSaving(false) }
  }

  async function retomarCapitania() {
    if (!equipo || !isManager || !perfil?.nombre) return
    setSaving(true)
    setError('')
    try {
      await nombrarCapitanResponsable(equipo.id, perfil.nombre)
      onNotice('Volviste a figurar como capitán del equipo.')
    } catch {
      setError('No se pudo recuperar la capitanía. Revisa tu nombre de Perfil y las reglas.')
    } finally { setSaving(false) }
  }

  async function remove(member: IntegranteEquipo) {
    if (!equipo || (!isManager && member.uid !== user.uid)) return
    setSaving(true)
    setError('')
    try {
      await quitarIntegrante(equipo.id, member.uid, member.solicitudId)
      onNotice(!isManager
        ? 'Saliste del equipo y retiraste tu consentimiento de la plantilla.'
        : 'Jugador retirado de la plantilla.')
    } catch {
      setError('No se pudo retirar al jugador. No puedes quitar al capitán actual.')
    } finally { setSaving(false) }
  }

  async function changePosition(member: IntegranteEquipo, next: string) {
    if (!equipo || !isManager) return
    setSaving(true)
    setError('')
    try {
      await actualizarPosicion(equipo.id, member.uid, next)
      onNotice('Posición del jugador actualizada.')
    } catch {
      setError('No se pudo cambiar la posición del jugador.')
    } finally { setSaving(false) }
  }

  const ubicacionDelEquipo = <div className="team-location-fields">
    <p className="muted">La ubicación del equipo es independiente de la comuna de tu perfil personal.</p>
    <div className="form-columns">
      <label>Región del equipo
        <select required value={regionCodigo} onChange={event => {
          setRegionCodigo(event.target.value)
          setComunaCodigo('')
        }}>
          <option value="">Selecciona una región</option>
          {REGIONES_CHILE.map(region => <option key={region.codigo} value={region.codigo}>{region.nombre}</option>)}
        </select>
      </label>
      <label>Comuna del equipo
        <select required disabled={!regionSeleccionada} value={comunaCodigo}
          onChange={event => setComunaCodigo(event.target.value)}>
          <option value="">Selecciona una comuna</option>
          {regionSeleccionada?.comunas.map(comuna =>
            <option key={comuna.codigo} value={comuna.codigo}>{comuna.nombre}</option>)}
        </select>
      </label>
    </div>
  </div>

  const datosDeportivos = <div className="form-columns">
    <label>Escudo representativo
      <select value={escudo} onChange={event => setEscudo(event.target.value)}>
        {ESCUDOS_EQUIPO.map(icono => <option key={icono} value={icono}>{icono}</option>)}
      </select>
    </label>
    <label>Modalidad
      <select value={modalidad} onChange={event => setModalidad(event.target.value)}>
        {['Fútbol 5','Fútbol 7','Fútbol 8','Fútbol 11'].map(v => <option key={v}>{v}</option>)}
      </select>
    </label>
    <label>Nivel
      <select value={nivel} onChange={event => setNivel(event.target.value)}>
        {['Amateur','Intermedio','Avanzado'].map(v => <option key={v}>{v}</option>)}
      </select>
    </label>
  </div>

  if (!equipo) return <div className="page narrow-page">
    <div className="page-heading"><div><p className="eyebrow">MI EQUIPO</p><h1>Registrar mi equipo</h1>
      <p className="muted">Crea una ficha pública con su capitán y plantilla. El responsable de la cuenta será el capitán inicial y podrá designar después a un jugador aceptado.</p>
    </div></div>
    <div className="form-card">
      <p><strong>Nombre:</strong> {perfil?.nombreEquipo || 'Falta completar el nombre en Perfil'}</p>
      <p><strong>Responsable:</strong> {perfil?.nombre || user.displayName || 'Sin nombre'}</p>
      <h2>Ubicación del equipo</h2>
      {ubicacionDelEquipo}
      {datosDeportivos}
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
      <button type="button" className="primary-button" disabled={saving || !perfil?.nombreEquipo}
        onClick={() => { void register() }}>{saving ? 'Registrando…' : 'Registrar mi equipo'}</button>
      <p className="muted">El nombre del equipo y del responsable vienen de Perfil. Puedes elegir aquí su región y comuna sin cambiar tu ubicación personal.</p>
    </div>
  </div>

  const mostrados = integrantes.filter((member) => member.uid !== equipo.capitanUid)
  const captainInRoster = integrantes.find((item) => item.uid === equipo.capitanUid)
  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">FICHA DE EQUIPO</p><h1>{equipo.escudo} {equipo.nombre}</h1>
        <p className="muted">{equipo.comuna}{equipo.region ? ` · ${equipo.region}` : ''} · {equipo.modalidad} · {equipo.nivel} · {equipo.descripcion || 'Equipo de la comunidad FutMatch.'}</p></div>
      <button className="secondary-button" type="button" onClick={onBack}>← Volver a equipos</button>
    </div>
    <section className="team-roster-card">
      <h2>Capitán del equipo</h2>
      <div className="team-member">
        <div className="team-member-avatar">★</div>
        <div><strong>{equipo.capitanNombre || 'Aún no hay capitán asignado'}</strong>
          <small>{captainInRoster ? 'Jugador de la plantilla · Capitán' : 'Responsable del equipo · Capitán'}</small>
        </div>
      </div>
      {isManager && equipo.capitanUid !== user.uid && <button type="button" className="secondary-button"
        disabled={saving} onClick={() => { void retomarCapitania() }}>
        Volver a ser capitán
      </button>}
    </section>
    <section className="team-roster-card">
      <h2>Plantilla <span className="request-count">{mostrados.length + (equipo.capitanUid ? 1 : 0)}</span></h2>
      <p className="muted">Los integrantes se añaden después de aceptar un contacto o una postulación y confirmar su incorporación.</p>
      {loading && <p className="muted">Cargando jugadores…</p>}
      {mostrados.length === 0 && !loading && <p className="posts-feedback">Todavía no hay jugadores incorporados a la plantilla.</p>}
      {mostrados.map((member) => <div className="team-member" key={member.uid}>
        <div className="team-member-avatar">{member.nombre.charAt(0).toUpperCase()}</div>
        <div><strong>{member.nombre}</strong><small>Jugador confirmado · {member.posicion}</small></div>
        {(isManager || member.uid === user.uid) && <div className="team-member-actions">
          {isManager && <>
            <select aria-label={`Posición de ${member.nombre}`} disabled={saving} value={member.posicion}
              onChange={event => { void changePosition(member, event.target.value) }}>
              {POSICIONES_EQUIPO.map(pos => <option key={pos}>{pos}</option>)}
            </select>
            <button type="button" className="secondary-button" disabled={saving} onClick={() => { void captain(member) }}>Nombrar capitán</button>
          </>}
          <button type="button" className="delete-post-button" disabled={saving} onClick={() => { void remove(member) }}>
            {isManager ? 'Quitar' : 'Salir del equipo'}
          </button>
        </div>}
      </div>)}
      {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    </section>
    {isManager && <section className="team-roster-card">
      <h2>Administrar mi equipo</h2>
      <form className="profile-edit-form" onSubmit={(event) => { void update(event) }}>
        <label>Nombre del equipo
          <input value={nombre} minLength={2} maxLength={80} required onChange={(event) => setNombre(event.target.value)} />
        </label>
        <label>Descripción
          <textarea value={descripcion} maxLength={350} rows={3} onChange={(event) => setDescripcion(event.target.value)} />
        </label>
        <h3>Ubicación del equipo</h3>
        {ubicacionDelEquipo}
        {datosDeportivos}
        <div className="request-actions">
          <button className="primary-button" disabled={saving} type="submit">Guardar datos</button>
          <button className="secondary-button" type="button" onClick={onFindPlayers}>Buscar jugadores</button>
        </div>
      </form>
    </section>}
  </div>
}
