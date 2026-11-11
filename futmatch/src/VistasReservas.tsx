import { useState } from 'react'
import type { TipoCuenta } from './tiposCuenta'
import type { ReservaCancha } from './reservas'
import { cancelarReserva, confirmarReserva, rechazarReserva } from './reservas'

const estadoLabels: Record<ReservaCancha['estado'], string> = {
  pendiente: 'Pendiente de respuesta',
  confirmada: 'Cancha confirmada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
}

export function MisReservas({
  uid, tipoCuenta, reservas, loading, error, onNotice, onFindCanchas,
}: {
  uid: string
  tipoCuenta: TipoCuenta
  reservas: ReservaCancha[]
  loading: boolean
  error: string
  onNotice: (mensaje: string) => void
  onFindCanchas: () => void
}) {
  const [busy, setBusy] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const [confirmCancel, setConfirmCancel] = useState('')
  const esDueno = tipoCuenta === 'dueno_cancha'
  const visibles = reservas.filter((item) => esDueno ? item.duenoUid === uid
    : item.equipoLocalId === uid || item.equipoVisitanteId === uid)

  async function actuar(reserva: ReservaCancha, accion: 'confirmar' | 'rechazar' | 'cancelar') {
    setBusy(reserva.id)
    setErrorLocal('')
    try {
      if (accion === 'confirmar') {
        await confirmarReserva(reserva)
        onNotice('Reserva confirmada. El turno quedó bloqueado para otros partidos.')
      } else if (accion === 'rechazar') {
        await rechazarReserva(reserva.id)
        onNotice('Solicitud de cancha rechazada.')
      } else {
        await cancelarReserva(reserva)
        onNotice('Reserva cancelada. Si estaba confirmada, el turno vuelve a quedar libre.')
      }
      setConfirmCancel('')
    } catch (cause) {
      const code = (cause as { code?: string }).code
      setErrorLocal(code === 'permission-denied'
        ? 'Firestore rechazó la operación. Revisa las reglas publicadas y los permisos de esta cuenta.'
        : (cause as Error).message || 'No se pudo actualizar la reserva.')
    } finally { setBusy('') }
  }

  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">GESTIÓN DE CANCHAS</p>
        <h1>{esDueno ? 'Solicitudes de reserva' : 'Mis reservas'}</h1>
        <p className="muted">{esDueno
          ? 'Revisa los horarios solicitados por equipos, acepta o rechaza y administra tus turnos.'
          : 'Consulta las respuestas de los dueños y cancela reservas que ya no necesites.'}</p></div>
      {!esDueno && <button type="button" className="secondary-button" onClick={onFindCanchas}>Buscar canchas</button>}
    </div>
    <p className="role-note">Cada reserva corresponde a un bloque de 60 minutos que comienza a la hora indicada.
      La confirmación garantiza la exclusividad de ese turno en FutMatch. El pago se coordina directamente con el propietario.</p>
    {error && <p role="alert" className="posts-feedback posts-error">{error}</p>}
    {errorLocal && <p role="alert" className="posts-feedback posts-error">{errorLocal}</p>}
    {loading && <p className="posts-feedback" role="status">Cargando reservas…</p>}
    {!loading && !error && (visibles.length
      ? <div className="sports-cards">{visibles.map((reserva) =>
        <section className="sports-panel" key={reserva.id}>
          <div className="sports-panel-top">
            <span className="type-pill">▣ {reserva.canchaNombre}</span>
            <span className="request-status">{estadoLabels[reserva.estado]}</span>
          </div>
          <h2>📅 {reserva.fecha} a las {reserva.hora}</h2>
          <p className="muted">Turno de 60 minutos · Precio por hora CLP {reserva.precioHora.toLocaleString('es-CL')}</p>
          {reserva.nota && <p className="muted">Nota: {reserva.nota}</p>}
          <div className="request-actions">
            {esDueno && reserva.estado === 'pendiente' && <>
              <button type="button" className="primary-button" disabled={!!busy}
                onClick={() => { void actuar(reserva, 'confirmar') }}>
                {busy === reserva.id ? 'Procesando…' : 'Confirmar reserva'}
              </button>
              <button type="button" className="secondary-button" disabled={!!busy}
                onClick={() => { void actuar(reserva, 'rechazar') }}>Rechazar</button>
            </>}
            {['pendiente', 'confirmada'].includes(reserva.estado) && (confirmCancel === reserva.id
              ? <>
                  <span className="muted">¿Cancelar esta reserva?</span>
                  <button type="button" className="delete-post-confirm" disabled={!!busy}
                    onClick={() => { void actuar(reserva, 'cancelar') }}>Sí, cancelar</button>
                  <button type="button" className="secondary-button" onClick={() => setConfirmCancel('')}>Volver</button>
                </>
              : <button type="button" className="secondary-button" disabled={!!busy}
                  onClick={() => setConfirmCancel(reserva.id)}>Cancelar reserva</button>)}
          </div>
        </section>)}</div>
      : <p className="posts-feedback">{esDueno
        ? 'No has recibido solicitudes de reserva todavía. Publica una cancha para comenzar.'
        : 'Aún no has solicitado reservas. Confirma un partido y entra a Buscar canchas.'}</p>)}
  </div>
}
