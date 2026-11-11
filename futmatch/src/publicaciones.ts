import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore'
import type { DocumentData, QuerySnapshot, Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { TipoCuenta } from './tiposCuenta'

export const categorias = {
  persona_busca_equipo: { label: 'Persona busca equipo', shortLabel: 'Busco equipo', icon: '●', color: '#e45072' },
  equipo_busca_jugadores: { label: 'Equipo busca jugadores', shortLabel: 'Buscamos jugadores', icon: '↻', color: '#6c4af2' },
  equipo_busca_rival: { label: 'Equipo busca rival', shortLabel: 'Buscamos rival', icon: '⚔', color: '#0aa878' },
  busca_cancha: { label: 'Busco cancha', shortLabel: 'Busco cancha', icon: '▣', color: '#ef8b35' },
  ofrece_cancha: { label: 'Ofrezco cancha', shortLabel: 'Ofrezco cancha', icon: '⌂', color: '#1976c3' },
} as const

export type Categoria = keyof typeof categorias
export type TipoFutbol = 'Fútbol 5' | 'Fútbol 7' | 'Fútbol 8' | 'Fútbol 11'
export type Nivel = 'Amateur' | 'Intermedio' | 'Avanzado'

export type Publicacion = {
  id: string
  categoria: Categoria
  autorUid: string
  autorNombre: string
  autorTipoCuenta: TipoCuenta | ''
  equipoId: string
  canchaId: string
  equipoNombre: string
  nombreCancha: string
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

function parsePublicaciones(snapshot: QuerySnapshot<DocumentData>): Publicacion[] {
  return snapshot.docs.flatMap((documento) => {
        const data = documento.data()
        if (!categoriasValidas.includes(data.categoria) || data.estado !== 'activa') return []
        return [{
          id: documento.id,
          categoria: data.categoria as Categoria,
          autorUid: String(data.autorUid ?? ''),
          autorNombre: String(data.autorNombre ?? 'Jugador'),
          autorTipoCuenta: ['jugador', 'capitan', 'equipo', 'dueno_cancha'].includes(data.autorTipoCuenta)
            ? data.autorTipoCuenta as TipoCuenta : ('' as const),
          equipoId: String(data.equipoId ?? ''),
          canchaId: String(data.canchaId ?? ''),
          equipoNombre: String(data.equipoNombre ?? ''),
          nombreCancha: String(data.nombreCancha ?? ''),
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
}

/** Una cuenta Equipo no recibe vacantes ajenas, tampoco mediante sus consultas directas.
 * Recupera sus publicaciones propias por separado para conservar Mis publicaciones.
 */
export function escucharPublicaciones(
  onData: (publicaciones: Publicacion[]) => void,
  onError: (error: Error) => void,
  cuenta?: { uid: string; tipoCuenta: TipoCuenta },
): Unsubscribe {
  if (cuenta?.tipoCuenta !== 'equipo') {
    return onSnapshot(
      query(publicacionesRef, orderBy('creadoEn', 'desc'), limit(100)),
      (snapshot) => onData(parsePublicaciones(snapshot)),
      (error) => {
        console.error('[FutMatch] Firestore publicaciones: consulta general:', error.code, error.message)
        onError(error)
      },
    )
  }

  const visibles: Categoria[] = ['persona_busca_equipo', 'equipo_busca_rival', 'busca_cancha', 'ofrece_cancha']
  let publicas: Publicacion[] = []
  let propias: Publicacion[] = []
  let publicasCargadas = false
  let propiasCargadas = false
  const emitir = () => {
    if (!publicasCargadas || !propiasCargadas) return
    const unicas = new Map<string, Publicacion>()
    for (const post of [...publicas, ...propias]) unicas.set(post.id, post)
    onData([...unicas.values()]
      .sort((a, b) => (b.creadoEn?.toMillis() ?? 0) - (a.creadoEn?.toMillis() ?? 0))
      .slice(0, 100))
  }

  // No requiere índice compuesto y respeta las reglas que niegan leer vacantes ajenas.
  const stopPublicas = onSnapshot(
    query(publicacionesRef, where('categoria', 'in', visibles), limit(300)),
    (snapshot) => {
      publicas = parsePublicaciones(snapshot)
      publicasCargadas = true
      emitir()
    },
    (error) => {
      console.error('[FutMatch] Firestore publicaciones: consulta categorías permitidas:', error.code, error.message)
      onError(error)
    },
  )
  const stopPropias = onSnapshot(
    query(publicacionesRef, where('autorUid', '==', cuenta.uid), limit(100)),
    (snapshot) => {
      propias = parsePublicaciones(snapshot)
      propiasCargadas = true
      emitir()
    },
    (error) => {
      console.error('[FutMatch] Firestore publicaciones: consulta anuncios propios:', error.code, error.message)
      onError(error)
    },
  )
  return () => { stopPublicas(); stopPropias() }
}
export async function crearPublicacion(datos: NuevaPublicacion): Promise<void> {
  await addDoc(publicacionesRef, {
    ...datos,
    estado: 'activa',
    creadoEn: serverTimestamp(),
  })
}

export async function obtenerPublicacionPorId(id: string): Promise<Publicacion | null> {
  const snapshot = await getDoc(doc(db, 'publicaciones', id))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  if (!categoriasValidas.includes(data.categoria) || data.estado !== 'activa') return null
  return {
    id: snapshot.id,
    categoria: data.categoria as Categoria,
    autorUid: String(data.autorUid ?? ''),
    autorNombre: String(data.autorNombre ?? ''),
    autorTipoCuenta: (data.autorTipoCuenta || '') as TipoCuenta | '',
    equipoId: String(data.equipoId ?? ''),
    canchaId: String(data.canchaId ?? ''),
    equipoNombre: String(data.equipoNombre ?? ''),
    nombreCancha: String(data.nombreCancha ?? ''),
    titulo: String(data.titulo ?? ''),
    descripcion: String(data.descripcion ?? ''),
    comuna: String(data.comuna ?? ''),
    futbol: data.futbol as TipoFutbol,
    nivel: data.nivel as Nivel,
    fecha: String(data.fecha ?? ''),
    hora: String(data.hora ?? ''),
    estado: 'activa',
    creadoEn: (data.creadoEn ?? null) as Timestamp | null,
  }
}

/** Borra el anuncio propio. Si era una cancha, también borra su ficha. */
export async function eliminarPublicacion(post: Publicacion): Promise<void> {
  if (post.categoria === 'ofrece_cancha' && post.canchaId) {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'publicaciones', post.id))
    batch.delete(doc(db, 'canchas', post.canchaId))
    await batch.commit()
  } else {
    await deleteDoc(doc(db, 'publicaciones', post.id))
  }
}
