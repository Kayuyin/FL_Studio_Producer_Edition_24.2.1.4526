# Catálogo de cinco canchas DEMO por comuna

FutMatch distingue las canchas reales de las muestras. El script genera **1.730 registros ficticios** en `canchas_demo` (5 por cada una de las 346 comunas) usando `src/territorioChile.ts`. Estas fichas **no representan instalaciones verificadas**, no tienen dueño, dirección ni precio, y **no permiten contacto ni reservas**.

Las canchas reales continúan en `canchas`, creadas exclusivamente por cuentas Dueño de cancha y vinculadas a publicaciones/reservas reales.

## Cómo importar (Windows PowerShell)

Desde la carpeta `futmatch`:

1. Instala solo para esta ejecución el Admin SDK: `npm install --no-save --package-lock=false firebase-admin`
2. Autentícate localmente con tu cuenta autorizada de Google Cloud mediante `gcloud auth application-default login`. **No envíes ni subas archivos JSON de credenciales ni llaves de cuenta de servicio al repositorio o a este chat.**
3. Revisa la vista previa sin escribir: `node scripts/seed-canchas-demo.mjs`
4. Tras comprobar que estás usando el proyecto Firebase correcto, ejecuta: `node scripts/seed-canchas-demo.mjs --project proyecto-de-titulo-futmatch --confirm`

El script procesa cinco lotes de 400 escrituras o menos, reutiliza IDs estables y solo escribe en `canchas_demo`; **no borra documentos ajenos**. Debes contar con permisos de escritura del proyecto. Las escrituras pueden tener un coste según tu plan de Firestore.

## Activación

Publica las reglas actualizadas de `firestore.rules` en Firebase Console (Firestore Database → Reglas → Publicar), después de fusionar el PR. El cliente puede leer las muestras autenticado, pero las reglas le impiden crearlas, alterarlas o eliminarlas.

En `Buscar canchas` el capitán puede seleccionar una comuna del listado. Se consultan las canchas reales filtradas por código CUT (sin el límite global de 100) y, separadamente, las cinco muestras de esa comuna.

## Importante

Este catálogo **es solo para evaluación académica y pruebas de interfaz**. No anuncies las muestras como instalaciones operativas ni les atribuyas direcciones, disponibilidad, precios o dueños inventados. Para poblar cinco canchas verdaderas en cada comuna es necesario obtener y verificar datos externos, con autorización cuando proceda.
