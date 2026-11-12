/**
 * Importador de cinco fichas DEMO por comuna. No son canchas reales.
 * Dry-run: node scripts/seed-canchas-demo.mjs
 * Escritura explícita: node scripts/seed-canchas-demo.mjs --project ID_FIREBASE --confirm
 * Requiere firebase-admin y Application Default Credentials en la máquina del usuario.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const pIndex = args.indexOf('--project')
const projectId = pIndex >= 0 ? args[pIndex + 1] : ''
const path = fileURLToPath(new URL('../src/territorioChile.ts', import.meta.url))
const source = readFileSync(path, 'utf8')
const beginning = source.indexOf('export const REGIONES_CHILE:')
const equals = source.indexOf('= [', beginning)
const ending = source.indexOf('] as const', equals)
if (beginning < 0 || equals < 0 || ending < 0) throw new Error('No se pudo leer el catálogo territorial.')
const regiones = JSON.parse(source.slice(equals + 2, ending + 1))
const comunas = regiones.flatMap(region => region.comunas.map(comuna => ({ region, comuna })))
if (regiones.length !== 16 || comunas.length !== 346) {
  throw new Error('El catálogo territorial cambió. Revisa los totales antes de importar.')
}

const modalidades = ['Fútbol 5', 'Fútbol 7', 'Fútbol 8', 'Fútbol 11', 'Fútbol 7']
const registros = comunas.flatMap(({ region, comuna }) =>
  modalidades.map((modalidad, index) => ({
    id: `demo_${comuna.codigo}_${index + 1}`,
    tipo: 'demostracion',
    nombre: `Cancha de ejemplo ${index + 1} - ${comuna.nombre}`,
    descripcion: 'Registro ficticio para demostrar la búsqueda por comuna. No corresponde a un recinto verificado.',
    region: region.nombre,
    regionCodigo: region.codigo,
    comuna: comuna.nombre,
    comunaCodigo: comuna.codigo,
    modalidad,
    reservable: false,
    origen: 'futmatch-seed-demo',
  }))
)

console.log(`Regiones: ${regiones.length}; comunas: ${comunas.length}; registros de demostración: ${registros.length}.`)
console.log('Ejemplo:', registros[0])
if (!confirm) {
  console.log('Vista previa: no se ha escrito nada en Firestore. Usa --project ID --confirm para importar.')
  process.exit(0)
}
if (!projectId || projectId.startsWith('-')) {
  throw new Error('Es obligatorio indicar --project ID_FIREBASE --confirm.')
}
const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
const app = initializeApp({
  projectId,
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
})
const db = getFirestore(app)
const size = 400
for (let i = 0; i < registros.length; i += size) {
  const batch = db.batch()
  for (const { id, ...registro } of registros.slice(i, i + size)) {
    batch.set(db.collection('canchas_demo').doc(id), {
      ...registro,
      importadoEn: FieldValue.serverTimestamp(),
    })
  }
  await batch.commit()
  console.log(`Importados ${Math.min(i + size, registros.length)}/${registros.length}`)
}
console.log('Importación completa en canchas_demo. No se modificó canchas ni publicaciones.')
