import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import type { Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

export const categorias = {
  persona_busca_equipo: { label: 'Persona busca equipo', shortLabel: 'Busco equipo', icon: '●', color: '#e45072' },
  equipo_busca_jugadores: { label: 'Equipo busca jugadores', shortLabel: 'Buscamos jugadores', icon: '↻', color: '#6c4af2' },
  equipo_busca_rival: { label: 'Equipo busca rival', shortLabel: 'Buscamos rival', icon: '⚔', color: '#0aa878' },
} as const

export type Categoria = keyof typeof categorias
export type TipoFutbol = 'Fútbol 5' | 'Fútbol 7' | 'Fútbol 8' | 'Fútbol 11'
export type Nivel = 'Amateur' | 'Intermedio' | 'Avanzado'

export type Publicacion = {
  id: string
  categoria: Categoria
  autorUid: string
  autorNombre: string
  equipoNombre: string
  titulo: string
  descripcion: string
  comuna: string
  futbol: TipoFutbol
  nivel: Nivel
  fecha: string
  hora: string
  estado: 'activa'
  creadoEn: Timestamp | null
}

export type NuevaPublicacion = Omit<Publicacion, 'id' | 'estado' | 'creadoEn'>

const publicacionesRef = collection(db, 'publicaciones')
const categoriasValidas = Object.keys(categorias)

export function escucharPublicaciones(
  onData: (publicaciones: Publicacion[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const consulta = query(publicacionesRef, orderBy('creadoEn', 'desc'), limit(100))
  return onSnapshot(
    consulta,
    (snapshot) => {
      const publicaciones = snapshot.docs.flatMap((documento) => {
        const data = documento.data()
        if (!categoriasValidas.includes(data.categoria) || data.estado !== 'activa') return []
        return [{
          id: documento.id,
          categoria: data.categoria as Categoria,
          autorUid: String(data.autorUid ?? ''),
          autorNombre: String(data.autorNombre ?? 'Jugador'),
          equipoNombre: String(data.equipoNombre ?? ''),
          titulo: String(data.titulo ?? ''),
          descripcion: String(data.descripcion ?? ''),
          comuna: String(data.comuna ?? ''),
          futbol: data.futbol as TipoFutbol,
          nivel: data.nivel as Nivel,
          fecha: String(data.fecha ?? ''),
          hora: String(data.hora ?? ''),
          estado: 'activa' as const,
          creadoEn: (data.creadoEn ?? null) as Timestamp | null,
        }]
      })
      onData(publicaciones)
    },
    (error) => onError(error),
  )
}

export async function crearPublicacion(datos: NuevaPublicacion): Promise<void> {
  await addDoc(publicacionesRef, {
    ...datos,
    estado: 'activa',
    creadoEn: serverTimestamp(),
  })
}
