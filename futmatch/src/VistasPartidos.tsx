import { useState } from 'react'
import type { Partido } from './partidos'
import { cancelarPartido, confirmarPartido } from './partidos'
import type { ReservaCancha } from './reservas'

const estadoPartido = {
  propuesto: 'Esperando confirmación del otro equipo',
  confirmado: 'Partido confirmado entre equipos',
  cancelado: 'Partido cancelado',
} as const

export function MisPartidos({
  uid, partidos, reservas, loading, error, onFindCanchas, onGoMatches, onNotice,
}: {
  uid: string
  partidos: Partido[]
  reservas: ReservaCancha[]
  loading: boolean
  error: string
  onFindCanchas: (id: string) => void
  onGoMatches: () => void
  onNotice: (mensaje: string) => void
}) {
  const [workingId, setWorkingId] = useState('')
  const [confirmCancelId, setConfirmCancelId] = useState('')
  const [actionError, setActionError] = useState('')

  async function change(id: string, action: 'confirmar' | 'cancelar') {
    setWorkingId(id)
    setActionError('')
    try {
      if (action === 'confirmar') {
        await confirmarPartido(id)
        onNotice('El partido fue confirmado. Ahora pueden solicitar una cancha.')
      } else {
        await cancelarPartido(id)
        onNotice('El partido quedó cancelado.')
      }
      setConfirmCancelId('')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setActionError(code === 'permission-denied'
        ? 'Firestore rechazó el cambio. Revisa los permisos y confirma que eres uno de los dos equipos.'
        : (cause as Error).message || 'No pudimos actualizar el partido.')
    } finally { setWorkingId('') }
  }
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">CALENDARIO DE ENCUENTROS</p>
      <h1>Mis partidos</h1><p className="muted">Organiza desafíos aceptados, confirma la fecha y solicita una cancha para jugar.</p></div>
      <button className="secondary-button" type="button" onClick={onGoMatches}>Ver mis matches</button>
    </div>
    {error && <p role="alert" className="posts-feedback posts-error">{error}</p>}
    {actionError && <p role="alert" className="posts-feedback posts-error">{actionError}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando partidos…</p>}
    {!loading && !error && (partidos.length
      ? <div className="sports-cards">{partidos.map((partido) => {
        const misReservas = reservas.filter((item) => item.partidoId === partido.id)
        const confirmada = misReservas.find((item) => item.estado === 'confirmada')
        const pendiente = misReservas.filter((item) => item.estado === 'pendiente')
        const puedeCancelar = !confirmada && partido.estado !== 'cancelado'
        return <section className="sports-panel" key={partido.id}>
          <div className="sports-panel-top">
            <span className="type-pill">⚽ {partido.modalidad}</span>
            <span className="request-status">{estadoPartido[partido.estado]}</span>
          </div>
          <h2>{partido.localNombre} <span className="muted">VS</span> {partido.visitanteNombre}</h2>
          <p className="muted">📅 {partido.fecha} · {partido.hora} · {partido.comuna}</p>
          {partido.estado === 'propuesto' && <p className="muted">{partido.creadoPorUid === uid
            ? 'Tu propuesta fue enviada. Espera a que el otro equipo confirme.'
            : 'El otro equipo propuso este encuentro. Debes confirmar antes de solicitar cancha.'}</p>}
          {partido.estado === 'confirmado' && <div className="sports-booking-info">
            {confirmada
              ? <><strong>Cancha confirmada: {confirmada.canchaNombre}</strong>
                  <span className="muted">Reserva de una hora · CLP {confirmada.precioHora.toLocaleString('es-CL')} · Coordinen los detalles por Mensajes</span></>
              : pendiente.length
                ? <span>Hay {pendiente.length} {pendiente.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de confirmación del dueño.</span>
                : <span>Aún no tienen una cancha reservada.</span>}
          </div>}
          <div className="request-actions">
            {partido.estado === 'propuesto' && partido.creadoPorUid !== uid &&
              <button className="primary-button" type="button" disabled={!!workingId}
                onClick={() => { void change(partido.id, 'confirmar') }}>Confirmar partido</button>}
            {partido.estado === 'confirmado' && !confirmada &&
              <button className="primary-button" type="button" onClick={() => onFindCanchas(partido.id)}>
                ▣ Buscar cancha
              </button>}
            {puedeCancelar && (confirmCancelId === partido.id
              ? <div className="request-actions">
                  <span className="muted">¿Cancelar este partido? Esta acción no se puede revertir.</span>
                  <button type="button" className="delete-post-confirm" disabled={!!workingId}
                    onClick={() => { void change(partido.id, 'cancelar') }}>Sí, cancelar</button>
                  <button type="button" className="secondary-button" onClick={() => setConfirmCancelId('')}>Volver</button>
                </div>
              : <button type="button" className="secondary-button" onClick={() => setConfirmCancelId(partido.id)}>
                  Cancelar partido
                </button>)}
            {!!confirmada && <p className="muted">Para cancelar el partido, primero cancela su reserva en la sección Reservas.</p>}
          </div>
        </section>
      })}</div>
      : <p className="posts-feedback">Aún no tienes partidos programados. Primero confirma un contacto de rival en Matches y pulsa «Programar partido».</p>)}
  </div>
}
