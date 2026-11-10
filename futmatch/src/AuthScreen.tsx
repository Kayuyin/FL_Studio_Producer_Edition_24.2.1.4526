import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { REGIONES_CHILE, obtenerComuna, obtenerRegion } from './territorioChile'
import { TIPOS_CUENTA, TIPOS_CUENTA_IDS, cuentaConCancha, cuentaConEquipo } from './tiposCuenta'
import type { TipoCuenta } from './tiposCuenta'
import './AuthScreen.css'

type Mode = 'login' | 'registro' | 'recuperar'

function readableError(error: unknown): string {
  if (!(error instanceof FirebaseError)) return 'Ocurrió un error inesperado. Intenta nuevamente.'
  const messages: Record<string, string> = {
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/email-already-in-use': 'Este correo ya tiene una cuenta. Prueba iniciar sesión.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/weak-password': 'La contraseña es demasiado débil.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
    'auth/network-request-failed': 'No hay conexión con Firebase. Revisa Internet.',
    'auth/operation-not-allowed': 'Habilita el método Correo electrónico/contraseña en Firebase Authentication.',
  }
  return messages[error.code] ?? 'No fue posible completar la solicitud. Intenta de nuevo.'
}

export default function AuthScreen({ onNotice }: { onNotice: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [nombre, setNombre] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>('jugador')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [nombreCancha, setNombreCancha] = useState('')
  const [bio, setBio] = useState('')
  const [regionCodigo, setRegionCodigo] = useState('')
  const [comunaCodigo, setComunaCodigo] = useState('')
  const region = obtenerRegion(regionCodigo)
  const comuna = obtenerComuna(regionCodigo, comunaCodigo)
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function changeMode(next: Mode) {
    setMode(next)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmacion('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const email = correo.trim().toLowerCase()

    if (mode === 'registro') {
      if (nombre.trim().length < 2 || nombre.trim().length > 70) {
        setError('El nombre debe tener entre 2 y 70 caracteres.')
        return
      }
      if (cuentaConEquipo(tipoCuenta) && (nombreEquipo.trim().length < 2 || nombreEquipo.trim().length > 80)) {
        setError('Ingresa un nombre de equipo de entre 2 y 80 caracteres.')
        return
      }
      if (cuentaConCancha(tipoCuenta) && (nombreCancha.trim().length < 2 || nombreCancha.trim().length > 100)) {
        setError('Ingresa el nombre de la cancha (2 a 100 caracteres).')
        return
      }
      if (!region || !comuna) { setError('Selecciona una región y una comuna válida de Chile.'); return }
      if (password.length < 8) { setError('Usa una contraseña de al menos 8 caracteres.'); return }
      if (password !== confirmacion) { setError('Las contraseñas no coinciden.'); return }
    }

    setLoading(true)
    try {
      if (mode === 'recuperar') {
        await sendPasswordResetEmail(auth, email)
        setSuccess('Si existe una cuenta con ese correo, recibirás un mensaje para recuperar tu contraseña. Revisa también el spam.')
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const account = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(account.user, { displayName: nombre.trim() })
        try {
          await setDoc(doc(db, 'usuarios', account.user.uid), {
            nombre: nombre.trim(),
            correo: email,
            tipoCuenta,
            nombreEquipo: cuentaConEquipo(tipoCuenta) ? nombreEquipo.trim() : '',
            nombreCancha: cuentaConCancha(tipoCuenta) ? nombreCancha.trim() : '',
            bio: bio.trim(),
            regionCodigo,
            comunaCodigo,
            region: region!.nombre,
            comuna: comuna!.nombre,
            creadoEn: serverTimestamp(),
          })
          onNotice('¡Tu cuenta se creó correctamente! Bienvenido a FutMatch.')
        } catch {
          onNotice('Tu cuenta se creó en Authentication, pero no se pudo guardar el perfil en Firestore. Revisa las reglas de seguridad.')
        }
      }
    } catch (cause) {
      setError(readableError(cause))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-promo">
        <div className="auth-brand"><span className="auth-logo">⚽</span> Fut<span>Match</span></div>
        <div className="auth-promo-copy">
          <span className="auth-kicker">LA CANCHA NOS UNE</span>
          <h1>Tu próximo partido comienza aquí.</h1>
          <p>Encuentra jugadores, organiza encuentros y vive el fútbol amateur desde cualquier dispositivo.</p>
          <div className="auth-ball" aria-hidden="true">⚽</div>
        </div>
        <small>Una comunidad. Muchas formas de jugar.</small>
      </section>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-mobile-brand">⚽ Fut<span>Match</span></div>
          <span className="auth-kicker">{mode === 'registro' ? 'ÚNETE A LA COMUNIDAD' : mode === 'recuperar' ? 'RECUPERA TU ACCESO' : 'QUÉ BUENO VERTE'}</span>
          <h2 id="auth-title">{mode === 'registro' ? 'Crea tu cuenta' : mode === 'recuperar' ? 'Recuperar contraseña' : 'Inicia sesión'}</h2>
          <p className="auth-subtitle">{mode === 'registro' ? 'Regístrate para comenzar a organizar tus partidos.' : mode === 'recuperar' ? 'Te enviaremos un enlace a tu correo electrónico.' : 'Ingresa para encontrar tu próximo partido.'}</p>
          <form onSubmit={(event) => { void submit(event) }} className="auth-form">
            {mode === 'registro' && <>
              <label htmlFor="auth-tipo-cuenta">¿Qué tipo de cuenta necesitas?</label>
              <select id="auth-tipo-cuenta" required value={tipoCuenta}
                onChange={(event) => setTipoCuenta(event.target.value as TipoCuenta)}>
                {TIPOS_CUENTA_IDS.map((tipo) => <option key={tipo} value={tipo}>{TIPOS_CUENTA[tipo].label}</option>)}
              </select>
              <p className="auth-type-hint">{TIPOS_CUENTA[tipoCuenta].description}</p>
              <label htmlFor="auth-nombre">{tipoCuenta === 'jugador' || tipoCuenta === 'capitan' ? 'Nombre y apellido' : 'Nombre de la persona responsable'}</label>
              <input id="auth-nombre" autoComplete="name" minLength={2} maxLength={70} required value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej: Camila Torres" />
              {cuentaConEquipo(tipoCuenta) && <>
                <label htmlFor="auth-equipo">Nombre del equipo</label>
                <input id="auth-equipo" required minLength={2} maxLength={80} value={nombreEquipo}
                  onChange={(event) => setNombreEquipo(event.target.value)} placeholder="Ej: Atlético Santiago" />
              </>}
              {cuentaConCancha(tipoCuenta) && <>
                <label htmlFor="auth-cancha">Nombre de la cancha</label>
                <input id="auth-cancha" required minLength={2} maxLength={100} value={nombreCancha}
                  onChange={(event) => setNombreCancha(event.target.value)} placeholder="Ej: Cancha Los Aromos" />
              </>}
              <label htmlFor="auth-bio">Descripción de tu perfil (opcional)</label>
              <textarea id="auth-bio" maxLength={350} rows={3} value={bio}
                onChange={(event) => setBio(event.target.value)} placeholder={cuentaConCancha(tipoCuenta) ? 'Describe tu cancha y sus instalaciones.' : cuentaConEquipo(tipoCuenta) ? 'Cuéntanos sobre tu equipo.' : 'Cuéntanos sobre ti y qué buscas.'} />
              <label htmlFor="auth-region">Región</label>
              <select id="auth-region" name="region" autoComplete="address-level1" required value={regionCodigo}
                onChange={(event) => { setRegionCodigo(event.target.value); setComunaCodigo('') }}>
                <option value="">Selecciona tu región</option>
                {REGIONES_CHILE.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
              </select>
              <label htmlFor="auth-comuna">Comuna</label>
              <select id="auth-comuna" name="comuna" autoComplete="address-level2" required
                disabled={!regionCodigo} value={comunaCodigo} onChange={(event) => setComunaCodigo(event.target.value)}>
                <option value="">{regionCodigo ? 'Selecciona tu comuna' : 'Primero selecciona una región'}</option>
                {region?.comunas.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
              </select>
            </>}
            <label htmlFor="auth-correo">Correo electrónico</label>
            <input id="auth-correo" type="email" autoComplete="email" required value={correo} onChange={(event) => setCorreo(event.target.value)} placeholder="tu@correo.cl" />
            {mode !== 'recuperar' && <>
              <label htmlFor="auth-password">Contraseña</label>
              <input id="auth-password" type="password" autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} minLength={mode === 'registro' ? 8 : 1} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" />
            </>}
            {mode === 'registro' && <>
              <label htmlFor="auth-confirmacion">Confirmar contraseña</label>
              <input id="auth-confirmacion" type="password" autoComplete="new-password" minLength={8} required value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} placeholder="Repite tu contraseña" />
            </>}
            {mode === 'login' && <button className="auth-text-button" type="button" onClick={() => changeMode('recuperar')}>¿Olvidaste tu contraseña?</button>}
            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
            {success && <p className="auth-feedback auth-success" role="status">{success}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Un momento…' : mode === 'registro' ? 'Crear mi cuenta' : mode === 'recuperar' ? 'Enviar enlace' : 'Entrar a FutMatch →'}</button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? <>¿Aún no tienes cuenta? <button type="button" onClick={() => changeMode('registro')}>Regístrate</button></> : mode === 'registro' ? <>¿Ya tienes cuenta? <button type="button" onClick={() => changeMode('login')}>Inicia sesión</button></> : <button type="button" onClick={() => changeMode('login')}>← Volver al inicio de sesión</button>}
          </div>
        </section>
      </main>
    </div>
  )
}
