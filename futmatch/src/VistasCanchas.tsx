import { useState } from 'react'
import type { CanchaRegistrada } from './canchas'
import type { Solicitud } from './solicitudes'
import { REGIONES_CHILE } from './territorioChile'

export function CatalogoCanchas({
  canchas, loading, error, solicitudes, userUid, onContact,
}: {
  canchas: CanchaRegistrada[]
  loading: boolean
  error: string
  solicitudes: Solicitud[]
  userUid: string
  onContact: (cancha: CanchaRegistrada) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [comuna, setComuna] = useState('')
  const [busyId, setBusyId] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const [aviso, setAviso] = useState('')
  const filtered = canchas.filter((item) =>
    (!comuna || item.comuna === comuna)
    && (!search.trim() || [item.nombre, item.descripcion, item.comuna, item.futbol]
      .some((value) => value.toLocaleLowerCase('es-CL').includes(search.trim().toLocaleLowerCase('es-CL')))))

  async function contact(cancha: CanchaRegistrada) {
    setBusyId(cancha.id)
    setAviso('')
    setErrorLocal('')
    try {
      await onContact(cancha)
      setAviso(`Solicitud enviada a ${cancha.nombre}. El dueño podrá aceptarla desde sus conversaciones.`)
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setErrorLocal(code === 'permission-denied'
        ? 'Firestore rechazó la solicitud. Comprueba las reglas actualizadas.'
        : (cause as Error).message || 'No se pudo enviar la solicitud.')
    } finally { setBusyId('') }
  }

  return <div className="page">
    <div className="page-heading"><div>
      <p className="eyebrow">DÓNDE JUGAR</p><h1>Buscar canchas</h1>
      <p className="muted">Explora recintos registrados en FutMatch. Puedes contactar al dueño; la reserva y el pago se acuerdan fuera de la plataforma.</p>
    </div></div>
    <div className="filter-row">
      <label className="search-box">⌕ <input value={search} aria-label="Buscar cancha"
        onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, modalidad o comuna" /></label>
      <select aria-label="Filtrar por comuna" value={comuna} onChange={(event) => setComuna(event.target.value)}>
        <option value="">Todas las comunas</option>
        {REGIONES_CHILE.flatMap((region) => region.comunas.map((item) =>
          <option key={item.codigo} value={item.nombre}>{item.nombre} · {region.nombre}</option>))}
      </select>
    </div>
    {error && <p className="posts-feedback posts-error" role="alert">{error}</p>}
    {errorLocal && <p className="posts-feedback posts-error" role="alert">{errorLocal}</p>}
    {aviso && <p className="posts-feedback" role="status">{aviso}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando canchas registradas…</p>}
    {!loading && !error && (filtered.length
      ? <div className="post-grid">
        {filtered.map((item) => {
          const contacto = solicitudes.find((s) => s.publicacionId === item.anuncioId && s.interesadoUid === userUid)
          const propia = item.duenoUid === userUid
          return <article className="team-card" key={item.id}>
            <div className="team-shield">▣</div>
            <h2>{item.nombre}</h2>
            <p className="muted">📍 {item.comuna} · {item.region}</p>
            <p className="team-captain"><strong>Modalidad:</strong> {item.futbol}</p>
            <p className="team-description">{item.descripcion}</p>
            <button type="button" className="primary-button"
              disabled={!!contacto || propia || !!busyId} onClick={() => { void contact(item) }}>
              {busyId === item.id ? 'Enviando…' : contacto
                ? contacto.estado === 'aceptada' ? 'Contacto aceptado'
                  : contacto.estado === 'rechazada' ? 'Solicitud rechazada' : 'Solicitud enviada'
                : propia ? 'Tu propia cancha' : 'Consultar cancha'}
            </button>
          </article>
        })}
      </div>
      : <p className="posts-feedback">Todavía no hay canchas registradas con esos filtros. Los dueños pueden anunciarlas desde su cuenta.</p>)}
  </div>
}
