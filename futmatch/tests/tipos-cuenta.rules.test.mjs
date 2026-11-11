import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-futmatch',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync('firestore.rules', 'utf8'),
  },
})

function perfil(uid, tipoCuenta) {
  return {
    nombre: `Prueba ${uid}`,
    correo: `${uid}@example.com`,
    region: 'Región Metropolitana de Santiago',
    regionCodigo: '13',
    comuna: 'La Florida',
    comunaCodigo: '13110',
    tipoCuenta,
    nombreEquipo: tipoCuenta === 'capitan' || tipoCuenta === 'equipo' ? 'Equipo de prueba' : '',
    nombreCancha: tipoCuenta === 'dueno_cancha' ? 'Cancha de prueba' : '',
    bio: '',
    creadoEn: serverTimestamp(),
  }
}

try {
  for (const role of ['jugador', 'capitan', 'dueno_cancha']) {
    const uid = `new-${role}`
    const db = env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore()
    await assertSucceeds(setDoc(doc(db, 'usuarios', uid), perfil(uid, role)))
  }

  const forbidden = 'new-equipo'
  const deniedDb = env.authenticatedContext(forbidden, { email: `${forbidden}@example.com` }).firestore()
  await assertFails(setDoc(doc(deniedDb, 'usuarios', forbidden), perfil(forbidden, 'equipo')))

  // Una cuenta creada antes de este cambio puede editar sus datos y migrar.
  const legacyUid = 'legacy-equipo'
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'usuarios', legacyUid), {
      ...perfil(legacyUid, 'equipo'),
    })
  })
  const legacyDb = env.authenticatedContext(legacyUid, { email: `${legacyUid}@example.com` }).firestore()
  const legacyRef = doc(legacyDb, 'usuarios', legacyUid)
  await assertSucceeds(updateDoc(legacyRef, { bio: 'Actualización de cuenta antigua' }))
  await assertSucceeds(updateDoc(legacyRef, { tipoCuenta: 'capitan' }))
  await assertFails(updateDoc(legacyRef, { tipoCuenta: 'equipo' }))

  // El Capitán nunca puede cambiar de nuevo al rol eliminado.
  const capitainDb = env.authenticatedContext('new-capitan', { email: 'new-capitan@example.com' }).firestore()
  await assertFails(updateDoc(doc(capitainDb, 'usuarios', 'new-capitan'), { tipoCuenta: 'equipo' }))

  console.log('Roles correctos: solo Jugador, Capitán y Dueño de cancha; migración Equipo antigua aprobada.')
} finally {
  await env.cleanup()
}
