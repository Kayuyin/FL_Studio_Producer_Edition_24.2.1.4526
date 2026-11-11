import type { User } from 'firebase/auth'
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { PerfilUsuario } from './Perfil'
import type { Solicitud } from './solicitudes'
import { obtenerComuna, obtenerRegion } from './territorioChile'

export type EquipoRegistrado = {
  id: string
  ownerUid: string
  nombre: string
  descripcion: string
  region: string
  regionCodigo: string
  comuna: string
  comunaCodigo: string
  capitanUid: string
  capitanNombre: string
  escudo: string
  modalidad: string
  nivel: string
  creadoEn: Timestamp | null
}

export type IntegranteEquipo = {
  uid: string
  nombre: string
  solicitudId: string
  posicion: string
  creadoEn: Timestamp | null
}

export function escucharEquipos(
  onData: (equipos: EquipoRegistrado[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'equipos'), orderBy('creadoEn', 'desc'), limit(100)),
    (snapshot) => onData(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        ownerUid: String(data.ownerUid ?? ''),
        nombre: String(data.nombre ?? ''),
        descripcion: String(data.descripcion ?? ''),
        region: String(data.region ?? ''),
        regionCodigo: String(data.regionCodigo ?? ''),
        comuna: String(data.comuna ?? ''),
        comunaCodigo: String(data.comunaCodigo ?? ''),
        capitanUid: String(data.capitanUid ?? ''),
        capitanNombre: String(data.capitanNombre ?? ''),
        escudo: String(data.escudo ?? '⚽'),
        modalidad: String(data.modalidad ?? 'Fútbol 7'),
        nivel: String(data.nivel ?? 'Amateur'),
        creadoEn: (data.creadoEn ?? null) as Timestamp | null,
      }
    })), onError)
}

export function escucharPlantilla(
  equipoId: string,
  onData: (jugadores: IntegranteEquipo[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'equipos', equipoId, 'integrantes'), (snapshot) =>
    onData(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        uid: item.id,
        nombre: String(data.nombre ?? ''),
        solicitudId: String(data.solicitudId ?? ''),
        posicion: String(data.posicion ?? 'Sin definir'),
        creadoEn: (data.creadoEn ?? null) as Timestamp | null,
      }
    })), onError)
}

export const ESCUDOS_EQUIPO = ['⚽', '🛡️', '🏆', '⭐', '🔥'] as const
export const POSICIONES_EQUIPO = ['Sin definir', 'Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Polifuncional'] as const

export type UbicacionEquipo = { regionCodigo: string; comunaCodigo: string }

function ubicacionVerificada(ubicacion: UbicacionEquipo) {
  const region = obtenerRegion(ubicacion.regionCodigo)
  const comuna = obtenerComuna(ubicacion.regionCodigo, ubicacion.comunaCodigo)
  if (!region || !comuna) {
    throw new Error('Selecciona una región y una comuna válida para tu equipo.')
  }
  return {
    region: region.nombre,
    regionCodigo: region.codigo,
    comuna: comuna.nombre,
    comunaCodigo: comuna.codigo,
  }
}

/** Un equipo por cuenta administradora. El responsable figura como capitán inicial. */
export async function crearEquipo(
  user: User, perfil: PerfilUsuario, escudo: string, modalidad: string, nivel: string,
  ubicacion: UbicacionEquipo,
): Promise<void> {
  const tipo = perfil.tipoCuenta
  if (tipo !== 'equipo' && tipo !== 'capitan') throw new Error('Debes tener una cuenta de Equipo o Capitán.')
  const nombre = (perfil.nombreEquipo ?? '').trim()
  if (nombre.length < 2 || nombre.length > 80) throw new Error('Primero registra el nombre del equipo en Perfil.')
  const lugar = ubicacionVerificada(ubicacion)
  await setDoc(doc(db, 'equipos', user.uid), {
    ownerUid: user.uid,
    nombre,
    descripcion: (perfil.bio ?? '').trim().slice(0, 350),
    ...lugar,
    capitanUid: user.uid,
    capitanNombre: perfil.nombre.trim(),
    escudo,
    modalidad,
    nivel,
    creadoEn: serverTimestamp(),
  })
}

export async function editarEquipo(
  equipoId: string, nombre: string, descripcion: string,
  escudo: string, modalidad: string, nivel: string, ubicacion: UbicacionEquipo,
): Promise<void> {
  const n = nombre.trim()
  if (n.length < 2 || n.length > 80 || descripcion.length > 350) throw new Error('Revisa el nombre y la descripción.')
  const lugar = ubicacionVerificada(ubicacion)
  await updateDoc(doc(db, 'equipos', equipoId), {
    nombre: n, descripcion: descripcion.trim(), ...lugar, escudo, modalidad, nivel,
  })
}

export async function incorporarJugador(equipoId: string, solicitud: Solicitud): Promise<void> {
  if (solicitud.estado !== 'aceptada' || !solicitud.incorporacionConfirmada) {
    throw new Error('Se requiere el contacto aceptado y la confirmación del jugador para integrarlo.')
  }
  const porPostulacion = solicitud.tipoSolicitud === 'postulacion'
  const uid = porPostulacion ? solicitud.interesadoUid : solicitud.autorPublicacionUid
  const nombre = porPostulacion ? solicitud.nombreInteresado : solicitud.nombreAutor
  await setDoc(doc(db, 'equipos', equipoId, 'integrantes', uid), {
    uid,
    nombre,
    solicitudId: solicitud.id,
    posicion: 'Sin definir',
    creadoEn: serverTimestamp(),
  })
}

export async function nombrarCapitan(equipoId: string, integrante: IntegranteEquipo): Promise<void> {
  await updateDoc(doc(db, 'equipos', equipoId), {
    capitanUid: integrante.uid,
    capitanNombre: integrante.nombre,
  })
}

export async function nombrarCapitanResponsable(equipoId: string, nombreResponsable: string): Promise<void> {
  if (nombreResponsable.trim().length < 2) throw new Error('Actualiza primero tu nombre en Perfil.')
  await updateDoc(doc(db, 'equipos', equipoId), {
    capitanUid: equipoId,
    capitanNombre: nombreResponsable.trim(),
  })
}

export async function quitarIntegrante(
  equipoId: string, uid: string, solicitudId?: string,
): Promise<void> {
  const memberRef = doc(db, 'equipos', equipoId, 'integrantes', uid)
  if (!solicitudId) {
    await deleteDoc(memberRef)
    return
  }
  // Salir implica retirar el consentimiento usado para aparecer públicamente.
  // Ambas modificaciones se confirman juntas o ninguna se realiza.
  const batch = writeBatch(db)
  batch.update(doc(db, 'solicitudes', solicitudId), { incorporacionConfirmada: false })
  batch.delete(memberRef)
  await batch.commit()
}

export async function actualizarPosicion(equipoId: string, memberUid: string, posicion: string): Promise<void> {
  if (!POSICIONES_EQUIPO.includes(posicion as typeof POSICIONES_EQUIPO[number])) {
    throw new Error('La posición seleccionada no es válida.')
  }
  await updateDoc(doc(db, 'equipos', equipoId, 'integrantes', memberUid), { posicion })
}
