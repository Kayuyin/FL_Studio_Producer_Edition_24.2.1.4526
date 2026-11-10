import type { User } from 'firebase/auth'
import {
  addDoc, collection, doc, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { Publicacion } from './publicaciones'

export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'rechazada'
export type Solicitud = {
  id: string
  publicacionId: string
  autorPublicacionUid: string
  interesadoUid: string
  nombreInteresado: string
  nombreAutor: string
  tituloPublicacion: string
  estado: EstadoSolicitud
  creadoEn: Timestamp | null
  respondidoEn: Timestamp | null
}

export type Mensaje = {
  id: string
  autorUid: string
  texto: string
  creadoEn: Timestamp | null
}

const solicitudesRef = collection(db, 'solicitudes')

function parseSolicitud(id: string, data: Record<string, unknown>): Solicitud {
  return {
    id,
    publicacionId: String(data.publicacionId ?? ''),
    autorPublicacionUid: String(data.autorPublicacionUid ?? ''),
    interesadoUid: String(data.interesadoUid ?? ''),
    nombreInteresado: String(data.nombreInteresado ?? ''),
    nombreAutor: String(data.nombreAutor ?? ''),
    tituloPublicacion: String(data.tituloPublicacion ?? ''),
    estado: data.estado as EstadoSolicitud,
    creadoEn: (data.creadoEn ?? null) as Timestamp | null,
    respondidoEn: (data.respondidoEn ?? null) as Timestamp | null,
  }
}

export function observarSolicitudes(
  uid: string,
  onData: (items: Solicitud[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let enviadas: Solicitud[] = []
  let recibidas: Solicitud[] = []
  const emit = () => {
    const all = new Map<string, Solicitud>()
    for (const item of [...enviadas, ...recibidas]) all.set(item.id, item)
    onData([...all.values()].sort((a, b) =>
      (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0)))
  }
  const sent = onSnapshot(
    query(solicitudesRef, where('interesadoUid', '==', uid)),
    (snapshot) => {
      enviadas = snapshot.docs.map((entry) => parseSolicitud(entry.id, entry.data()))
      emit()
    },
    onError,
  )
  const received = onSnapshot(
    query(solicitudesRef, where('autorPublicacionUid', '==', uid)),
    (snapshot) => {
      recibidas = snapshot.docs.map((entry) => parseSolicitud(entry.id, entry.data()))
      emit()
    },
    onError,
  )
  return () => { sent(); received() }
}

export async function solicitarParticipacion(
  post: Publicacion,
  user: User,
  nombreInteresado: string,
): Promise<void> {
  if (post.autorUid === user.uid) throw new Error('No puedes solicitar participar en tu propia publicación.')
  const id = `${post.id}_${user.uid}`
  await setDoc(doc(db, 'solicitudes', id), {
    publicacionId: post.id,
    autorPublicacionUid: post.autorUid,
    interesadoUid: user.uid,
    nombreInteresado: nombreInteresado.trim(),
    nombreAutor: post.autorNombre,
    tituloPublicacion: post.titulo,
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
    respondidoEn: null,
  })
}

export async function responderSolicitud(
  solicitudId: string,
  estado: 'aceptada' | 'rechazada',
): Promise<void> {
  await updateDoc(doc(db, 'solicitudes', solicitudId), {
    estado,
    respondidoEn: serverTimestamp(),
  })
}

export function observarMensajes(
  solicitudId: string,
  onData: (items: Mensaje[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const mensajesRef = collection(db, 'solicitudes', solicitudId, 'mensajes')
  return onSnapshot(
    query(mensajesRef, orderBy('creadoEn', 'asc'), limit(100)),
    (snapshot) => onData(snapshot.docs.map((entry) => {
      const data = entry.data()
      return {
        id: entry.id,
        autorUid: String(data.autorUid ?? ''),
        texto: String(data.texto ?? ''),
        creadoEn: (data.creadoEn ?? null) as Timestamp | null,
      }
    })),
    onError,
  )
}

export async function enviarMensaje(solicitudId: string, user: User, texto: string): Promise<void> {
  const limpio = texto.trim()
  if (!limpio || limpio.length > 1000) throw new Error('El mensaje debe tener entre 1 y 1000 caracteres.')
  await addDoc(collection(db, 'solicitudes', solicitudId, 'mensajes'), {
    autorUid: user.uid,
    texto: limpio,
    creadoEn: serverTimestamp(),
  })
}
