import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-futmatch',
  firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
})
try {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'canchas_demo', 'demo_13110_1'), {
      tipo: 'demostracion', comunaCodigo: '13110', nombre: 'Cancha de ejemplo', reservable: false,
    })
  })
  const authenticated = env.authenticatedContext('capitan-1').firestore()
  const unauthenticated = env.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(authenticated, 'canchas_demo', 'demo_13110_1')))
  await assertFails(getDoc(doc(unauthenticated, 'canchas_demo', 'demo_13110_1')))
  await assertFails(setDoc(doc(authenticated, 'canchas_demo', 'demo_13110_2'), {
    tipo: 'demostracion', comunaCodigo: '13110', nombre: 'Alterada', reservable: true,
  }))
  console.log('Canchas demo: lectura autenticada y escritura de cliente bloqueada.')
} finally {
  await env.cleanup()
}
