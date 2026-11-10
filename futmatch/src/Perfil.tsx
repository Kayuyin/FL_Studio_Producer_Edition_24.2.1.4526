import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { REGIONES_CHILE, obtenerComuna, obtenerRegion } from './territorioChile'
import { db } from './firebase'

export type PerfilUsuario = {
  nombre: string
  correo: string
  region?: string
  regionCodigo?: string
  comuna: string
  comunaCodigo?: string
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (nombre.trim().length < 2 || nombre.trim().length > 70) {
      setError('El nombre debe tener entre 2 y 70 caracteres.')
      return
    }
    if (!region || !comuna) {
      setError('Selecciona una región y una comuna válida de Chile.')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nombre: nombre.trim(),
        region: region.nombre,
        regionCodigo: region.codigo,
        comuna: comuna.nombre,
        comunaCodigo: comuna.codigo,
        posicion,
        nivel,
        disponibilidad,
        bio: bio.trim(),
      })
      try {
        await updateProfile(user, { displayName: nombre.trim() })
        onDone('Tu perfil se actualizó correctamente.')
      } catch {
        onDone('Tu perfil se guardó en Firestore, pero hubo un problema al sincronizar el nombre de Authentication. Los datos se conservan.')
      }
    } catch {
      setError('No se pudo guardar tu perfil. Revisa que las reglas actualizadas estén publicadas en Firestore.')
    } finally {
      setSaving(false)
    }
  }

  return <form className="profile-edit-form" onSubmit={(event) => { void submit(event) }}>
    <div className="form-columns">
      <label>Nombre y apellido
        <input required minLength={2} maxLength={70} autoComplete="name" value={nombre} onChange={(event) => setNombre(event.target.value)} />
      </label>
      <label>Correo electrónico
        <input disabled value={user.email ?? perfil?.correo ?? ''} aria-describedby="correo-info" />
      </label>
    </div>
    <p className="muted" id="correo-info">El correo de acceso no se modifica desde esta pantalla.</p>
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
    <div className="form-columns">
      <label>Posición favorita
        <select value={posicion} onChange={(event) => setPosicion(event.target.value)}>
          {posiciones.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
        </select>
      </label>
      <label>Nivel de juego
        <select value={nivel} onChange={(event) => setNivel(event.target.value)}>
          {niveles.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
        </select>
      </label>
    </div>
    <label>Disponibilidad
      <select value={disponibilidad} onChange={(event) => setDisponibilidad(event.target.value)}>
        {disponibilidades.map((item) => <option key={item} value={item}>{item || 'Sin especificar'}</option>)}
      </select>
    </label>
    <label>Sobre mí
      <textarea rows={4} maxLength={350} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Cuéntale a los demás qué posición juegas y qué buscas en FutMatch." />
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
  function done(message: string) {
    if (message) onNotice(message)
    setEditing(false)
  }
  return <div className="page">
    <div className="profile-cover">
      <div className="profile-avatar">{initials}</div>
      <div><p className="eyebrow">MI PERFIL</p><h1>{name}</h1><p>⚽ {user.email}</p></div>
      <button className="outline-button" type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Ver perfil' : 'Editar perfil'}</button>
    </div>
    {loading && <p className="posts-feedback" role="status">Cargando perfil…</p>}
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {editing ? <section className="profile-edit-card"><h2>Editar mis datos</h2><EditarPerfil user={user} perfil={perfil} onDone={done} /></section> :
      <div className="profile-layout">
        <section className="profile-card">
          <h2>Sobre mí</h2>
          <p>{perfil?.bio || 'Aún no agregas una descripción. Edita tu perfil para contarle a la comunidad sobre ti.'}</p>
          <div className="profile-tags"><span>{perfil?.comuna && perfil?.region ? `${perfil.comuna}, ${perfil.region}` : (perfil?.comuna || 'Ubicación no configurada')}</span></div>
        </section>
        <section className="profile-card">
          <h2>Datos deportivos</h2>
          <div className="profile-info-line"><span>Posición</span><strong>{perfil?.posicion || 'Sin especificar'}</strong></div>
          <div className="profile-info-line"><span>Nivel</span><strong>{perfil?.nivel || 'Sin especificar'}</strong></div>
          <div className="profile-info-line"><span>Disponibilidad</span><strong>{perfil?.disponibilidad || 'Sin especificar'}</strong></div>
        </section>
      </div>}
  </div>
}
