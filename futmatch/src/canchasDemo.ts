import { collection, limit, onSnapshot, query, where } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

export type CanchaDemo = {
  id: string
  tipo: 'demostracion'
  nombre: string
  descripcion: string
  region: string
  regionCodigo: string
  comuna: string
  comunaCodigo: string
  modalidad: string
  reservable: false
}

/** Solo consulta datos de muestra; jamás crea reservas ni escribe en canchas reales. */
export function escucharCanchasDemo(
  comunaCodigo: string,
  onData: (items: CanchaDemo[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!comunaCodigo) { onData([]); return () => {} }
  return onSnapshot(query(collection(db, 'canchas_demo'), where('comunaCodigo', '==', comunaCodigo), limit(5)),
    snapshot => onData(snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        tipo: 'demostracion' as const,
        nombre: String(data.nombre ?? ''),
        descripcion: String(data.descripcion ?? ''),
        region: String(data.region ?? ''),
        regionCodigo: String(data.regionCodigo ?? ''),
        comuna: String(data.comuna ?? ''),
        comunaCodigo: String(data.comunaCodigo ?? ''),
        modalidad: String(data.modalidad ?? ''),
        reservable: false as const,
      }
    })), onError)
}
