import {
  collection, doc, limit, onSnapshot, orderBy,
  query, serverTimestamp, updateDoc, writeBatch, where,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { NuevaPublicacion } from './publicaciones'

export type CanchaRegistrada = {
  id: string
  anuncioId: string
  duenoUid: string
  nombre: string
  descripcion: string
  region: string
  regionCodigo: string
  comuna: string
  comunaCodigo: string
  futbol: string
  direccion: string
  precioHora: number
  informacionHorarios: string
  creadoEn: Timestamp | null
}

function leerCancha(id: string, data: Record<string, unknown>): CanchaRegistrada {
  return {
    id, anuncioId: String(data.anuncioId ?? ''), duenoUid: String(data.duenoUid ?? ''),
    nombre: String(data.nombre ?? ''), descripcion: String(data.descripcion ?? ''),
    region: String(data.region ?? ''), regionCodigo: String(data.regionCodigo ?? ''),
    comuna: String(data.comuna ?? ''), comunaCodigo: String(data.comunaCodigo ?? ''),
    futbol: String(data.futbol ?? ''), direccion: String(data.direccion ?? ''),
    precioHora: typeof data.precioHora === 'number' ? data.precioHora : 0,
    informacionHorarios: String(data.informacionHorarios ?? ''),
    creadoEn: (data.creadoEn ?? null) as Timestamp | null,
  }
}

export function escucharCanchasPorComuna(
  comunaCodigo: string,
  onData: (canchas: CanchaRegistrada[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!comunaCodigo) { onData([]); return () => {} }
  return onSnapshot(query(collection(db, 'canchas'), where('comunaCodigo', '==', comunaCodigo)),
    snapshot => onData(snapshot.docs.map(d => leerCancha(d.id, d.data()))), onError)
}

export function escucharCanchas(
  onData: (canchas: CanchaRegistrada[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'canchas'), orderBy('creadoEn', 'desc'), limit(100)),
    (snapshot) => onData(snapshot.docs.map(item => leerCancha(item.id, item.data()))), onError)
}

/** Un anuncio y su cancha se crean atómicamente: no quedarán registros huérfanos. */
export async function registrarCanchaYAnuncio(
  datos: NuevaPublicacion,
  region: string,
  regionCodigo: string,
  comunaCodigo: string,
  direccion: string,
  precioHora: number,
  informacionHorarios: string,
): Promise<void> {
  if (!direccion.trim() || direccion.trim().length < 5 || direccion.trim().length > 160
    || !Number.isInteger(precioHora) || precioHora < 0 || precioHora > 1000000
    || informacionHorarios.length > 200) {
    throw new Error('Indica una dirección válida, precio por hora y horarios de atención.')
  }
  if (datos.categoria !== 'ofrece_cancha' || datos.autorTipoCuenta !== 'dueno_cancha') {
    throw new Error('Este formulario solo permite registrar una oferta de cancha.')
  }
  const cancha = doc(collection(db, 'canchas'))
  const anuncio = doc(collection(db, 'publicaciones'))
  const batch = writeBatch(db)
  batch.set(cancha, {
    anuncioId: anuncio.id,
    duenoUid: datos.autorUid,
    nombre: datos.nombreCancha,
    descripcion: datos.descripcion,
    region, regionCodigo, comuna: datos.comuna, comunaCodigo,
    futbol: datos.futbol,
    direccion: direccion.trim(),
    precioHora,
    informacionHorarios: informacionHorarios.trim(),
    creadoEn: serverTimestamp(),
  })
  batch.set(anuncio, {
    ...datos,
    canchaId: cancha.id,
    estado: 'activa',
    creadoEn: serverTimestamp(),
  })
  await batch.commit()
}

/** El propietario puede mantener la ficha comercial sin modificar el anuncio original. */
export async function editarCancha(
  canchaId: string, direccion: string, precioHora: number, informacionHorarios: string,
): Promise<void> {
  if (direccion.trim().length < 5 || direccion.trim().length > 160
    || !Number.isInteger(precioHora) || precioHora < 0 || precioHora > 1000000
    || informacionHorarios.trim().length > 200) {
    throw new Error('La dirección, el precio o los horarios no son válidos.')
  }
  await updateDoc(doc(db, 'canchas', canchaId), {
    direccion: direccion.trim(),
    precioHora,
    informacionHorarios: informacionHorarios.trim(),
  })
}
