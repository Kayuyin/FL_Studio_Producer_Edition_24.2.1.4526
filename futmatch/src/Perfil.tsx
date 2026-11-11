import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { REGIONES_CHILE, obtenerComuna, obtenerRegion } from './territorioChile'
import { TIPOS_CUENTA, TIPOS_CUENTA_IDS, cuentaConCancha, cuentaConEquipo, tipoCuentaValido } from './tiposCuenta'
import type { TipoCuenta } from './tiposCuenta'
import { db } from './firebase'

export type PerfilUsuario = {
  nombre: string
  correo: string
  region?: string
  regionCodigo?: string
  comuna: string
  comunaCodigo?: string
  tipoCuenta?: TipoCuenta
  nombreEquipo?: string
  nombreCancha?: string
  bio?: string
  posicion?: string
  nivel?: string
  disponibilidad?: string
}

const posiciones = ['', 'Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Polifuncional']
const niveles = ['', 'Amateur', 'Intermedio', 'Avanzado']
const disponibilidades = ['', 'Entre semana', 'Fines de semana', 'Flexible']

function EditarPerfil({
  user, perfil, onDone,
}: {
  user: User
  perfil: PerfilUsuario | null
  onDone: (message: string) => void
}) {
  const [nombre, setNombre] = useState(perfil?.nombre || user.displayName || '')
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>(
    tipoCuentaValido(perfil?.tipoCuenta) ? perfil.tipoCuenta : 'jugador',
  )
  const [nombreEquipo, setNombreEquipo] = useState(perfil?.nombreEquipo || '')
  const [nombreCancha, setNombreCancha] = useState(perfil?.nombreCancha || '')
  const [regionCodigo, setRegionCodigo] = useState(perfil?.regionCodigo || '')
  const [comunaCodigo, setComunaCodigo] = useState(perfil?.comunaCodigo || '')
  const [posicion, setPosicion] = useState(perfil?.posicion || '')
  const [nivel, setNivel] = useState(perfil?.nivel || '')
  const [disponibilidad, setDisponibilidad] = useState(perfil?.disponibilidad || '')
  const [bio, setBio] = useState(perfil?.bio || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const region = obtenerRegion(regionCodigo)
  const comuna = obtenerComuna(regionCodigo, comunaCodigo)
  const esEquipo = cuentaConEquipo(tipoCuenta)
  const esCancha = cuentaConCancha(tipoCuenta)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const nombreNormalizado = nombre.trim()
    if (nombreNormalizado.length < 2 || nombreNormalizado.length > 70) {
      setError('El nombre debe tener entre 2 y 70 caracteres.')
      return
    }
    if (esEquipo && (nombreEquipo.trim().length < 2 || nombreEquipo.trim().length > 80)) {
      setError('El nombre del equipo debe tener entre 2 y 80 caracteres.')
      return
    }
    if (esCancha && (nombreCancha.trim().length < 2 || nombreCancha.trim().length > 100)) {
      setError('El nombre de la cancha debe tener entre 2 y 100 caracteres.')
      return
    }
    if (!region || !comuna) {
      setError('Selecciona una región y una comuna válida de Chile.')
      return
    }
    setSaving(true)
    try {
      const perfilActualizado = {
        nombre: nombreNormalizado,
        tipoCuenta,
        nombreEquipo: esEquipo ? nombreEquipo.trim() : '',
        nombreCancha: esCancha ? nombreCancha.trim() : '',
        region: region.nombre,
        regionCodigo: region.codigo,
        comuna: comuna.nombre,
        comunaCodigo: comuna.codigo,
        posicion: esCancha || tipoCuenta === 'equipo' ? '' : posicion,
        nivel: esCancha ? '' : nivel,
        disponibilidad: esCancha ? '' : disponibilidad,
        bio: bio.trim(),
      }
      const usuarioRef = doc(db, 'usuarios', user.uid)
      if (perfil) {
        await updateDoc(usuarioRef, perfilActualizado)
      } else {
        // Cuentas antiguas creadas en Authentication sin documento en Firestore.
        // Crear el perfil sin eliminar la cuenta ni modificar el correo de acceso.
        if (!user.email) throw new Error('Tu cuenta no tiene un correo asociado.')
        await setDoc(usuarioRef, {
          ...perfilActualizado,
          correo: user.email.trim().toLowerCase(),
          creadoEn: serverTimestamp(),
        })
      }
      try {
        await updateProfile(user, { displayName: nombreNormalizado })
        onDone('Tu perfil se actualizó correctamente.')
      } catch {
        onDone('Los datos se guardaron en Firestore, pero no se pudo sincronizar el nombre de Authentication.')
      }
    } catch (cause) {
      const code = (cause as { code?: string }).code
      if (code === 'permission-denied') {
        setError('Firebase rechazó el guardado (permission-denied). Publica las reglas completas y actualizadas de Firestore; si ya lo hiciste, revisa los datos antiguos de tu cuenta.')
      } else if (code === 'not-found') {
        setError('No existe el documento del perfil en Firestore (not-found). Recarga la página e inténtalo otra vez.')
      } else if (code === 'unavailable' || code === 'deadline-exceeded') {
        setError(`No se pudo conectar con Firestore (${code}). Revisa Internet e inténtalo de nuevo.`)
      } else if (code === 'unauthenticated') {
        setError('La sesión expiró (unauthenticated). Vuelve a iniciar sesión.')
      } else {
        setError(`No se pudo guardar el perfil${code ? ` (${code})` : ''}. Si se repite, abre F12 → Consola para revisar el detalle.`)
      }
      console.error('Error al guardar perfil de FutMatch:', cause)
    } finally {
      setSaving(false)
    }
  }

  return <form className="profile-edit-form" onSubmit={(event) => { void submit(event) }}>
    <label>Tipo de cuenta
      <select required value={tipoCuenta} onChange={(event) => setTipoCuenta(event.target.value as TipoCuenta)}>
        {TIPOS_CUENTA_IDS.map((tipo) =>
          <option key={tipo} value={tipo}>{TIPOS_CUENTA[tipo].label}</option>)}
      </select>
    </label>
    <p className="muted profile-type-hint">{TIPOS_CUENTA[tipoCuenta].description}</p>
    <div className="form-columns">
      <label>{tipoCuenta === 'jugador' || tipoCuenta === 'capitan' ? 'Nombre y apellido' : 'Nombre de la persona responsable'}
        <input required minLength={2} maxLength={70} autoComplete="name" value={nombre}
          onChange={(event) => setNombre(event.target.value)} />
      </label>
      <label>Correo electrónico
        <input disabled value={user.email ?? perfil?.correo ?? ''} aria-describedby="correo-info" />
      </label>
    </div>
    <p className="muted" id="correo-info">El correo de acceso no se modifica desde esta pantalla.</p>
    {esEquipo && <label>Nombre del equipo
      <input required minLength={2} maxLength={80} value={nombreEquipo}
        onChange={(event) => setNombreEquipo(event.target.value)} placeholder="Ej: Atlético Santiago" />
    </label>}
    {esCancha && <label>Nombre de la cancha
      <input required minLength={2} maxLength={100} value={nombreCancha}
        onChange={(event) => setNombreCancha(event.target.value)} placeholder="Ej: Cancha Los Aromos" />
    </label>}
    <div className="form-columns">
      <label>Región
        <select required value={regionCodigo} onChange={(event) => { setRegionCodigo(event.target.value); setComunaCodigo('') }}>
          <option value="">Selecciona tu región</option>
          {REGIONES_CHILE.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
        </select>
      </label>
      <label>Comuna
        <select required disabled={!regionCodigo} value={comunaCodigo} onChange={(event) => setComunaCodigo(event.target.value)}>
          <option value="">{regionCodigo ? 'Selecciona tu comuna' : 'Selecciona primero una región'}</option>
          {region?.comunas.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
        </select>
      </label>
    </div>
    {!esCancha && <div className="form-columns">
      {tipoCuenta !== 'equipo' && <label>Posición favorita
        <select value={posicion} onChange={(event) => setPosicion(event.target.value)}>
          {posiciones.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
        </select>
      </label>}
      <label>{tipoCuenta === 'equipo' ? 'Nivel del equipo' : 'Nivel de juego'}
        <select value={nivel} onChange={(event) => setNivel(event.target.value)}>
          {niveles.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
        </select>
      </label>
    </div>}
    {!esCancha && <label>Disponibilidad
      <select value={disponibilidad} onChange={(event) => setDisponibilidad(event.target.value)}>
        {disponibilidades.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
      </select>
    </label>}
    <label>{esCancha ? 'Descripción de la cancha' : esEquipo ? 'Descripción del equipo o capitán' : 'Sobre mí'}
      <textarea rows={5} maxLength={350} value={bio} onChange={(event) => setBio(event.target.value)}
        placeholder={esCancha ? 'Describe la cancha, sus instalaciones y horarios.' : esEquipo ? 'Describe el equipo y qué jugadores o rivales buscas.' : 'Cuéntale a los demás qué posición juegas y qué buscas en FutMatch.'} />
      <small className="profile-char-count">{bio.length}/350 caracteres</small>
    </label>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    <div className="profile-edit-actions">
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      <button className="secondary-button" type="button" disabled={saving} onClick={() => onDone('')}>Cancelar</button>
    </div>
  </form>
}

export function Perfil({
  user, perfil, onNotice, loading, error,
}: {
  user: User
  perfil: PerfilUsuario | null
  onNotice: (message: string) => void
  loading: boolean
  error: string
}) {
  const [editing, setEditing] = useState(false)
  const name = perfil?.nombre?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Jugador'
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const tipo: TipoCuenta = tipoCuentaValido(perfil?.tipoCuenta) ? perfil.tipoCuenta : 'jugador'
  const esEquipo = cuentaConEquipo(tipo)
  const esCancha = cuentaConCancha(tipo)

  function done(message: string) {
    if (message) onNotice(message)
    setEditing(false)
  }

  return <div className="page">
    <div className="profile-cover">
      <div className="profile-avatar">{initials}</div>
      <div><p className="eyebrow">MI PERFIL</p><h1>{name}</h1>
        <p>{TIPOS_CUENTA[tipo].label} · {user.email}</p>
      </div>
      <button className="outline-button" type="button" disabled={loading || !!error}
        onClick={() => setEditing((value) => !value)}>{editing ? 'Ver perfil' : 'Editar perfil'}</button>
    </div>
    {loading && <p className="posts-feedback" role="status">Cargando perfil…</p>}
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {editing ? <section className="profile-edit-card">
      <h2>Editar mis datos</h2>
      <EditarPerfil user={user} perfil={perfil} onDone={done} />
    </section> :
      <div className="profile-layout">
        <section className="profile-card">
          <h2>{esCancha ? 'Sobre la cancha' : esEquipo ? 'Sobre el equipo' : 'Sobre mí'}</h2>
          <p className="profile-bio">{perfil?.bio || 'Todavía no hay una descripción. Edita el perfil para agregarla.'}</p>
          <div className="profile-tags">
            <span>{TIPOS_CUENTA[tipo].label}</span>
            <span>{perfil?.comuna && perfil?.region ? `${perfil.comuna}, ${perfil.region}` : (perfil?.comuna || 'Ubicación no configurada')}</span>
          </div>
        </section>
        <section className="profile-card">
          <h2>{esCancha ? 'Datos de la cancha' : esEquipo ? 'Datos del equipo' : 'Datos deportivos'}</h2>
          {esCancha && <div className="profile-info-line"><span>Cancha</span><strong>{perfil?.nombreCancha || 'Sin especificar'}</strong></div>}
          {esEquipo && <div className="profile-info-line"><span>Equipo</span><strong>{perfil?.nombreEquipo || 'Sin especificar'}</strong></div>}
          {!esCancha && <>
            {tipo !== 'equipo' && <div className="profile-info-line"><span>Posición</span><strong>{perfil?.posicion || 'Sin especificar'}</strong></div>}
            <div className="profile-info-line"><span>Nivel</span><strong>{perfil?.nivel || 'Sin especificar'}</strong></div>
            <div className="profile-info-line"><span>Disponibilidad</span><strong>{perfil?.disponibilidad || 'Sin especificar'}</strong></div>
          </>}
          <div className="profile-info-line"><span>Tipo de cuenta</span><strong>{TIPOS_CUENTA[tipo].label}</strong></div>
        </section>
      </div>}
  </div>
}
