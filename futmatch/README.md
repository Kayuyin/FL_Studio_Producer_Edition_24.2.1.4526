# FutMatch ⚽ — Plataforma web de fútbol amateur

Proyecto de título. Aplicación **web responsive** desarrollada con **React 19, TypeScript, Vite y Firebase**.

## Propósito

FutMatch permite que jugadores encuentren equipos, capitanes gestionen plantillas, equipos coordinen rivales y dueños de canchas reciban solicitudes para horarios concretos. Usa Authentication para identificación y Cloud Firestore para los datos y la mensajería en tiempo real.

## Experiencias por cuenta

| Cuenta | Funciones |
| --- | --- |
| Jugador | Buscar equipos, publicar «Busco equipo», postular a vacantes publicadas por capitanes, confirmar consentimiento de incorporación, consultar fichas y plantillas |
| Capitán | Registrar su equipo, publicar vacantes, encontrar jugadores y rivales, administrar plantilla y posiciones, proponer y confirmar partidos, solicitar canchas |
| Equipo | Registrar su equipo, encontrar jugadores disponibles y rivales, administrar plantilla, partidos y reservas. No ve vacantes de otros equipos buscando jugadores |
| Dueño de cancha | Anunciar y administrar sus canchas, editar dirección y tarifas, recibir conversaciones y aceptar/rechazar/cancelar solicitudes de reserva |

El tipo de cuenta es declarado por el usuario. Los permisos efectivos se comprueban en `firestore.rules`.

## Flujos principales

1. **Integración de un jugador**: capitán publica vacante → jugador postula → capitán acepta contacto → jugador confirma incorporación → responsable agrega jugador a la plantilla → ficha pública muestra al integrante y su posición.
2. **Partido entre equipos**: Equipo A publica un desafío con fecha y hora → Equipo B envía solicitud → Equipo A acepta contacto → un equipo crea propuesta de partido → el otro confirma → aparece en **Mis partidos**.
3. **Reserva**: equipo con partido confirmado selecciona cancha → envía solicitud → dueño acepta o rechaza. Al aceptar, una transacción crea `canchas/{id}/turnos/{fecha}_{hora}` y asigna la reserva al partido. No se puede confirmar el mismo turno para dos encuentros. Al cancelar se libera el turno.
4. **Conversaciones**: Match aceptado → ambos participantes pueden intercambiar mensajes en tiempo real.

Las reservas cubren bloques de **60 minutos con hora de inicio exacta** (p. ej., 19:00). El sistema no cobra, no procesa pagos ni confirma automáticamente horarios sin aceptación del dueño.

## Base de datos

| Colección | Función |
| --- | --- |
| `usuarios/{uid}` | Datos del perfil y rol |
| `equipos/{uid}` | Ficha pública de equipo, escudo, capitán, modalidad y nivel |
| `equipos/{uid}/integrantes/{jugadorUid}` | Integrantes aceptados con consentimiento y posición |
| `publicaciones/{id}` | Búsquedas de equipo, refuerzos, rivales y anuncios de cancha |
| `solicitudes/{id}` | Contactos, postulaciones y su estado |
| `solicitudes/{id}/mensajes/{id}` | Chat de participantes autorizados |
| `partidos/{solicitudId}` | Partido propuesto, confirmado o cancelado |
| `canchas/{id}` | Recinto, dirección, precio por hora y horarios |
| `canchas/{id}/turnos/{fecha}_{hora}` | Bloque confirmado y exclusivo |
| `reservas/{partidoId}_{canchaId}` | Solicitudes de reserva y respuestas del dueño |

**Las colecciones se generan automáticamente** cuando los usuarios realizan acciones. No hay que crear documentos manualmente en Firebase. Las publicaciones antiguas de canchas deben volver a anunciarse para crear su ficha en `canchas`.

## Ejecutar localmente

Requisitos: Node.js 22 y npm.

```bash
cd futmatch
npm ci
npm run dev
```

Abrir la URL indicada por Vite (normalmente `http://localhost:5173/`).

Comprobar compilación:

```bash
npm run build
```

## Activar seguridad en Firebase

**Obligatorio en cada cambio de reglas**: Firebase Console → Firestore Database → Reglas → reemplazar el contenido por todo `futmatch/firestore.rules` de la rama integrada → **Publicar**.

No usar `allow read, write: if true`.

Para verificar localmente las reglas sin tocar producción, el repositorio incluye `firebase.json` y un job de CI que levanta el emulador de Firestore.

## Publicar como sitio web

Después de validar los casos funcionales:

1. Ejecutar `npm run build`.
2. Abrir Firebase Console y activar **Hosting** en el proyecto correcto.
3. Iniciar sesión con Firebase CLI (desde una terminal propia): `npx firebase-tools@14.18.0 login`.
4. Desde `futmatch/`, seleccionar el proyecto con `npx firebase-tools@14.18.0 use --add` si hace falta asociar uno.
5. Publicar exclusivamente el sitio: `npx firebase-tools@14.18.0 deploy --only hosting`.
6. Abrir la URL `web.app` que entrega Hosting, probar registro, publicación y navegación desde un móvil.

`firebase.json` ya incluye la configuración de Hosting SPA. **El despliegue y las reglas activas no se realizan automáticamente desde GitHub**.

## Pruebas y entrega

Consultar [ENTREGA_Y_PRUEBAS.md](./ENTREGA_Y_PRUEBAS.md) para la matriz de verificación, preparación de cuatro cuentas, pruebas de permisos y demostración para el profesor.

## Alcance y limitaciones

- Una cuenta administradora controla una ficha de equipo. Designar capitán visible no transfiere privilegios de administración a otra cuenta.
- La plantilla requiere consentimiento expreso del jugador.
- El pago y la entrega de la cancha se coordinan fuera de FutMatch.
- Los horarios deben aprobarse; la app no asegura disponibilidad al publicar una cancha.
- Los directorios/listados recientes tienen límites de consulta; antes de abrir a gran escala se recomienda paginación, auditoría de seguridad, revisión de reglas, moderación y métricas de rendimiento.
- El código puede compilar sin que eso garantice que todas las operaciones funcionen en el proyecto Firebase real. Validar siempre con cuentas de prueba.
