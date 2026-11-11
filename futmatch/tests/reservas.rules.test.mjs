import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-futmatch',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync('firestore.rules', 'utf8'),
  },
})

const base = {
  partidoId: 'match1', canchaId: 'court1', canchaNombre: 'Cancha de prueba',
  solicitanteUid: 'equipo-a', duenoUid: 'dueno-a',
  equipoLocalId: 'equipo-a', equipoVisitanteId: 'equipo-b',
  fecha: '2026-12-12', hora: '19:00', nota: '',
  precioHora: 28000, estado: 'pendiente',
  creadoEn: new Date(), respondidoEn: null,
}

try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'reservas', 'match1_court1'), base)
    await setDoc(doc(db, 'reservas', 'match2_court2'), {
      ...base, partidoId: 'match2', canchaId: 'court2',
      duenoUid: 'dueno-b', equipoLocalId: 'equipo-c',
      equipoVisitanteId: 'equipo-d', solicitanteUid: 'equipo-c',
    })
    await setDoc(doc(db, 'partidos', 'match1'), {
      equipoLocalId: 'equipo-a', equipoVisitanteId: 'equipo-b',
    })
  })
  const dueno = env.authenticatedContext('dueno-a').firestore()
  const local = env.authenticatedContext('equipo-a').firestore()
  const visita = env.authenticatedContext('equipo-b').firestore()
  const ajeno = env.authenticatedContext('desconocido').firestore()
  const anónimo = env.unauthenticatedContext().firestore()

  await assertSucceeds(getDocs(query(collection(dueno, 'reservas'), where('duenoUid', '==', 'dueno-a'))))
  await assertSucceeds(getDocs(query(collection(local, 'reservas'), where('equipoLocalId', '==', 'equipo-a'))))
  await assertSucceeds(getDocs(query(collection(visita, 'reservas'), where('equipoVisitanteId', '==', 'equipo-b'))))
  await assertSucceeds(getDoc(doc(dueno, 'reservas', 'match1_court1')))
  await assertSucceeds(getDoc(doc(local, 'reservas', 'match1_court1')))
  await assertSucceeds(getDoc(doc(visita, 'reservas', 'match1_court1')))
  await assertFails(getDoc(doc(ajeno, 'reservas', 'match1_court1')))
  await assertFails(getDoc(doc(anónimo, 'reservas', 'match1_court1')))
  await assertFails(getDocs(collection(local, 'reservas'))) // no listado indiscriminado
  await assertSucceeds(getDocs(query(collection(local, 'partidos'), where('equipoLocalId', '==', 'equipo-a'))))
  await assertSucceeds(getDocs(query(collection(visita, 'partidos'), where('equipoVisitanteId', '==', 'equipo-b'))))
  await assertFails(getDoc(doc(ajeno, 'partidos', 'match1')))
  console.log('OK: consultas seguras de dueño y equipos; terceros bloqueados.')
} finally {
  await env.cleanup()
}
