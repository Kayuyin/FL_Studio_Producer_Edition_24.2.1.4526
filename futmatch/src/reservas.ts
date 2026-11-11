import {
  collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { CanchaRegistrada } from './canchas'
import type { Partido } from './partidos'

export type EstadoReserva = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada'
export type ReservaCancha = {
  id: string
  partidoId: string
  canchaId: string
  canchaNombre: string
  solicitanteUid: string
  duenoUid: string
  equipoLocalId: string
  equipoVisitanteId: string
  fecha: string
  hora: string
  nota: string
  precioHora: number
  estado: EstadoReserva
  creadoEn: Timestamp | null
  respondidoEn: Timestamp | null
}

function leerReserva(id: string, data: Record<string, unknown>): ReservaCancha {
  return {
    id,
    partidoId: String(data.partidoId ?? ''),
    canchaId: String(data.canchaId ?? ''),
    canchaNombre: String(data.canchaNombre ?? ''),
    solicitanteUid: String(data.solicitanteUid ?? ''),
    duenoUid: String(data.duenoUid ?? ''),
    equipoLocalId: String(data.equipoLocalId ?? ''),
    equipoVisitanteId: String(data.equipoVisitanteId ?? ''),
    fecha: String(data.fecha ?? ''),
    hora: String(data.hora ?? ''),
    nota: String(data.nota ?? ''),
    precioHora: typeof data.precioHora === 'number' ? data.precioHora : 0,
    estado: (data.estado ?? 'pendiente') as EstadoReserva,
    creadoEn: (data.creadoEn ?? null) as Timestamp | null,
    respondidoEn: (data.respondidoEn ?? null) as Timestamp | null,
  }
}

export function escucharReservas(
  uid: string,
  tipoCuenta: 'equipo' | 'capitan' | 'dueno_cancha',
  onData: (items: ReservaCancha[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  // El dueño consulta solo sus recintos; los equipos, solo partidos donde participan.
  // Una consulta Firestore debe estar acotada a los documentos que autorizan las reglas.
  // "solicitanteUid" es redundante: siempre coincide con uno de los dos equipos.
  const propiedades: Array<'duenoUid' | 'equipoLocalId' | 'equipoVisitanteId'> =
    tipoCuenta === 'dueno_cancha'
      ? ['duenoUid']
      : ['equipoLocalId', 'equipoVisitanteId']
  const grupos: ReservaCancha[][] = propiedades.map(() => [])
  const cargados = propiedades.map(() => false)
  const coleccion = collection(db, 'reservas')
  function emitir() {
    if (!cargados.every(Boolean)) return
    const mapa = new Map<string, ReservaCancha>()
    for (const grupo of grupos) for (const reserva of grupo) mapa.set(reserva.id, reserva)
    onData([...mapa.values()].sort((a, b) => (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0)))
  }
  const deteners = propiedades.map((campo, indice) => onSnapshot(
    query(coleccion, where(campo, '==', uid)),
    snapshot => {
      grupos[indice] = snapshot.docs.map(d => leerReserva(d.id, d.data()))
      cargados[indice] = true
      emitir()
    },
    error => {
      console.error(`[FutMatch] No se pudieron consultar reservas por ${campo}:`, error)
      onError(error)
    },
  ))
  return () => deteners.forEach(detener => detener())
}

export async function solicitarReserva(
  cancha: CanchaRegistrada, partido: Partido, solicitanteUid: string, nota: string,
): Promise<void> {
  if (partido.estado !== 'confirmado' || partido.reservaConfirmadaId) {
    throw new Error('El partido debe estar confirmado entre equipos y sin una cancha ya reservada.')
  }
  if (solicitanteUid !== partido.equipoLocalId && solicitanteUid !== partido.equipoVisitanteId) {
    throw new Error('Solo un equipo participante puede solicitar la cancha.')
  }
  if (!/^([01]\d|2[0-3]):00$/.test(partido.hora)) {
    throw new Error('Las reservas son por bloques de 60 minutos que empiezan en horas exactas. Revisa la hora del desafío.')
  }
  const fechaActual = new Date()
  const hoy = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`
  if (partido.fecha < hoy) throw new Error('La fecha del encuentro ya pasó.')
  if (nota.trim().length > 240) throw new Error('La nota no puede superar 240 caracteres.')
  const id = `${partido.id}_${cancha.id}`
  const ref = doc(db, 'reservas', id)
  const previa = await getDoc(ref)
  if (previa.exists()) {
    const datos = previa.data()
    if (datos.solicitanteUid !== solicitanteUid || !['rechazada','cancelada'].includes(datos.estado)) {
      throw new Error('Ya hay una solicitud para esta cancha y partido. Revisa Mis reservas.')
    }
    await updateDoc(ref, {
      estado: 'pendiente',
      nota: nota.trim(),
      precioHora: cancha.precioHora,
      creadoEn: serverTimestamp(),
      respondidoEn: null,
    })
    return
  }
  await setDoc(ref, {
    partidoId: partido.id,
    canchaId: cancha.id,
    canchaNombre: cancha.nombre,
    solicitanteUid,
    duenoUid: cancha.duenoUid,
    equipoLocalId: partido.equipoLocalId,
    equipoVisitanteId: partido.equipoVisitanteId,
    fecha: partido.fecha,
    hora: partido.hora,
    nota: nota.trim(),
    precioHora: cancha.precioHora,
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
    respondidoEn: null,
  })
}

export async function rechazarReserva(id: string): Promise<void> {
  await updateDoc(doc(db, 'reservas', id), { estado: 'rechazada', respondidoEn: serverTimestamp() })
}

export async function confirmarReserva(reserva: ReservaCancha): Promise<void> {
  const reservaRef = doc(db, 'reservas', reserva.id)
  const partidoRef = doc(db, 'partidos', reserva.partidoId)
  const turnoRef = doc(db, 'canchas', reserva.canchaId, 'turnos', `${reserva.fecha}_${reserva.hora}`)
  await runTransaction(db, async (tx) => {
    const [resSnap, matchSnap, turnoSnap] = await Promise.all([
      tx.get(reservaRef), tx.get(partidoRef), tx.get(turnoRef),
    ])
    if (!resSnap.exists() || !matchSnap.exists() || resSnap.data().estado !== 'pendiente'
      || matchSnap.data().estado !== 'confirmado' || matchSnap.data().reservaConfirmadaId
      || turnoSnap.exists()) {
      throw new Error('Ya existe una reserva para este partido, horario o cancha.')
    }
    tx.update(reservaRef, { estado: 'confirmada', respondidoEn: serverTimestamp() })
    tx.update(partidoRef, { reservaConfirmadaId: reserva.id })
    tx.set(turnoRef, {
      reservaId: reserva.id,
      duenoUid: reserva.duenoUid,
      fecha: reserva.fecha,
      hora: reserva.hora,
      creadoEn: serverTimestamp(),
    })
  })
}

export async function cancelarReserva(reserva: ReservaCancha): Promise<void> {
  const reservaRef = doc(db, 'reservas', reserva.id)
  const partidoRef = doc(db, 'partidos', reserva.partidoId)
  const turnoRef = doc(db, 'canchas', reserva.canchaId, 'turnos', `${reserva.fecha}_${reserva.hora}`)
  await runTransaction(db, async (tx) => {
    const [resSnap, matchSnap, turnoSnap] = await Promise.all([
      tx.get(reservaRef), tx.get(partidoRef), tx.get(turnoRef),
    ])
    if (!resSnap.exists() || !matchSnap.exists() || !['pendiente', 'confirmada'].includes(resSnap.data().estado)) {
      throw new Error('Esta solicitud de reserva ya fue cerrada.')
    }
    const confirmada = resSnap.data().estado === 'confirmada'
    if (confirmada && matchSnap.data().reservaConfirmadaId !== reserva.id) {
      throw new Error('La reserva confirmada no corresponde al partido.')
    }
    if (confirmada && !turnoSnap.exists()) {
      throw new Error('No encontramos el turno asociado. Consulta con el dueño de cancha.')
    }
    tx.update(reservaRef, { estado: 'cancelada', respondidoEn: serverTimestamp() })
    if (confirmada) {
      tx.update(partidoRef, { reservaConfirmadaId: '' })
      tx.delete(turnoRef)
    }
  })
}
