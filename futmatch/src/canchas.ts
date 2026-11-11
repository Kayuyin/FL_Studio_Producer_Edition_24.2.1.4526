import {
  collection, doc, limit, onSnapshot, orderBy,
  query, serverTimestamp, writeBatch,
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
  creadoEn: Timestamp | null
}

export function escucharCanchas(
  onData: (canchas: CanchaRegistrada[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'canchas'), orderBy('creadoEn', 'desc'), limit(100)),
    (snapshot) => onData(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        anuncioId: String(data.anuncioId ?? ''),
        duenoUid: String(data.duenoUid ?? ''),
        nombre: String(data.nombre ?? ''),
        descripcion: String(data.descripcion ?? ''),
        region: String(data.region ?? ''),
        regionCodigo: String(data.regionCodigo ?? ''),
        comuna: String(data.comuna ?? ''),
        comunaCodigo: String(data.comunaCodigo ?? ''),
        futbol: String(data.futbol ?? ''),
        creadoEn: (data.creadoEn ?? null) as Timestamp | null,
      }
    })), onError)
}

/** Un anuncio y su cancha se crean atómicamente: no quedarán registros huérfanos. */
export async function registrarCanchaYAnuncio(
  datos: NuevaPublicacion,
  region: string,
  regionCodigo: string,
  comunaCodigo: string,
): Promise<void> {
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
