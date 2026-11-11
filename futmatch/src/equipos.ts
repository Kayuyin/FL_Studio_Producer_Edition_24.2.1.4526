import type { User } from 'firebase/auth'
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { PerfilUsuario } from './Perfil'
import type { Solicitud } from './solicitudes'

export type EquipoRegistrado = {
  id: string
  ownerUid: string
  nombre: string
  descripcion: string
  comuna: string
  capitanUid: string
  capitanNombre: string
  creadoEn: Timestamp | null
}

export type IntegranteEquipo = {
  uid: string
  nombre: string
  solicitudId: string
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
        comuna: String(data.comuna ?? ''),
        capitanUid: String(data.capitanUid ?? ''),
        capitanNombre: String(data.capitanNombre ?? ''),
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
        creadoEn: (data.creadoEn ?? null) as Timestamp | null,
      }
    })), onError)
}

/** Un equipo por cuenta administradora. Cuenta Equipo = representante; cuenta Capitán = capitán inicial. */
export async function crearEquipo(user: User, perfil: PerfilUsuario): Promise<void> {
  const tipo = perfil.tipoCuenta
  if (tipo !== 'equipo' && tipo !== 'capitan') throw new Error('Debes tener una cuenta de Equipo o Capitán.')
  const nombre = (perfil.nombreEquipo ?? '').trim()
  if (nombre.length < 2 || nombre.length > 80) throw new Error('Primero registra el nombre del equipo en Perfil.')
  await setDoc(doc(db, 'equipos', user.uid), {
    ownerUid: user.uid,
    nombre,
    descripcion: (perfil.bio ?? '').trim().slice(0, 350),
    comuna: perfil.comuna,
    capitanUid: tipo === 'capitan' ? user.uid : '',
    capitanNombre: tipo === 'capitan' ? perfil.nombre.trim() : '',
    creadoEn: serverTimestamp(),
  })
}

export async function editarEquipo(equipoId: string, nombre: string, descripcion: string, comuna: string): Promise<void> {
  const n = nombre.trim()
  if (n.length < 2 || n.length > 80 || descripcion.length > 350) throw new Error('Revisa el nombre y la descripción.')
  await updateDoc(doc(db, 'equipos', equipoId), { nombre: n, descripcion: descripcion.trim(), comuna })
}

export async function incorporarJugador(equipoId: string, solicitud: Solicitud): Promise<void> {
  if (solicitud.tipoSolicitud !== 'postulacion' || solicitud.estado !== 'aceptada') {
    throw new Error('Solo se pueden incorporar jugadores cuya postulación fue aceptada.')
  }
  await setDoc(doc(db, 'equipos', equipoId, 'integrantes', solicitud.interesadoUid), {
    uid: solicitud.interesadoUid,
    nombre: solicitud.nombreInteresado,
    solicitudId: solicitud.id,
    creadoEn: serverTimestamp(),
  })
}

export async function nombrarCapitan(equipoId: string, integrante: IntegranteEquipo): Promise<void> {
  await updateDoc(doc(db, 'equipos', equipoId), {
    capitanUid: integrante.uid,
    capitanNombre: integrante.nombre,
  })
}

export async function quitarIntegrante(equipoId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'equipos', equipoId, 'integrantes', uid))
}
