import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { Publicacion } from './publicaciones'
import type { Solicitud } from './solicitudes'
import type { EquipoRegistrado } from './equipos'

export type EstadoPartido = 'propuesto' | 'confirmado' | 'cancelado'
export type Partido = {
  id: string
  solicitudId: string
  equipoLocalId: string
  equipoVisitanteId: string
  localNombre: string
  visitanteNombre: string
  creadoPorUid: string
  fecha: string
  hora: string
  comuna: string
  modalidad: string
  estado: EstadoPartido
  reservaConfirmadaId: string
  creadoEn: Timestamp | null
  confirmadoEn: Timestamp | null
}

function leerPartido(id: string, data: Record<string, unknown>): Partido {
  return {
    id,
    solicitudId: String(data.solicitudId ?? ''),
    equipoLocalId: String(data.equipoLocalId ?? ''),
    equipoVisitanteId: String(data.equipoVisitanteId ?? ''),
    localNombre: String(data.localNombre ?? ''),
    visitanteNombre: String(data.visitanteNombre ?? ''),
    creadoPorUid: String(data.creadoPorUid ?? ''),
    fecha: String(data.fecha ?? ''),
    hora: String(data.hora ?? ''),
    comuna: String(data.comuna ?? ''),
    modalidad: String(data.modalidad ?? ''),
    estado: (data.estado || 'propuesto') as EstadoPartido,
    reservaConfirmadaId: String(data.reservaConfirmadaId ?? ''),
    creadoEn: (data.creadoEn ?? null) as Timestamp | null,
    confirmadoEn: (data.confirmadoEn ?? null) as Timestamp | null,
  }
}

export function escucharPartidos(uid: string, onData: (partidos: Partido[]) => void, onError: (error: Error) => void): Unsubscribe {
  let comoLocal: Partido[] = []
  let comoVisitante: Partido[] = []
  let cargoLocal = false
  let cargoVisitante = false
  function emitir() {
    if (!cargoLocal || !cargoVisitante) return
    const items = new Map<string, Partido>()
    for (const match of [...comoLocal, ...comoVisitante]) items.set(match.id, match)
    onData([...items.values()].sort((a, b) => (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0)))
  }
  const ref = collection(db, 'partidos')
  const stopLocal = onSnapshot(query(ref, where('equipoLocalId', '==', uid)), snap => {
    comoLocal = snap.docs.map(d => leerPartido(d.id, d.data()))
    cargoLocal = true
    emitir()
  }, onError)
  const stopVisitante = onSnapshot(query(ref, where('equipoVisitanteId', '==', uid)), snap => {
    comoVisitante = snap.docs.map(d => leerPartido(d.id, d.data()))
    cargoVisitante = true
    emitir()
  }, onError)
  return () => { stopLocal(); stopVisitante() }
}

export async function programarPartido(
  solicitud: Solicitud,
  publicacion: Publicacion,
  local: EquipoRegistrado,
  visitante: EquipoRegistrado,
  uid: string,
): Promise<void> {
  if (solicitud.estado !== 'aceptada' || solicitud.tipoSolicitud !== 'contacto'
    || publicacion.categoria !== 'equipo_busca_rival'
    || publicacion.id !== solicitud.publicacionId
    || publicacion.autorUid !== local.id
    || solicitud.interesadoUid !== visitante.id
    || (uid !== local.id && uid !== visitante.id)) {
    throw new Error('Se necesita un match aceptado entre dos equipos registrados.')
  }
  if (!publicacion.fecha || !publicacion.hora || publicacion.fecha < new Date().toLocaleDateString('en-CA')) {
    throw new Error('La fecha del desafío ya pasó. Publica una nueva propuesta de partido.')
  }
  await setDoc(doc(db, 'partidos', solicitud.id), {
    solicitudId: solicitud.id,
    equipoLocalId: local.id,
    equipoVisitanteId: visitante.id,
    localNombre: local.nombre,
    visitanteNombre: visitante.nombre,
    creadoPorUid: uid,
    fecha: publicacion.fecha,
    hora: publicacion.hora,
    comuna: publicacion.comuna,
    modalidad: publicacion.futbol,
    estado: 'propuesto',
    reservaConfirmadaId: '',
    creadoEn: serverTimestamp(),
    confirmadoEn: null,
  })
}

export async function confirmarPartido(id: string): Promise<void> {
  await updateDoc(doc(db, 'partidos', id), { estado: 'confirmado', confirmadoEn: serverTimestamp() })
}

export async function cancelarPartido(id: string): Promise<void> {
  await updateDoc(doc(db, 'partidos', id), { estado: 'cancelado' })
}
