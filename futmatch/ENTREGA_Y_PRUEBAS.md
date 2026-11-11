# FutMatch — Plan de entrega y pruebas de aceptación

## Objetivo

Presentar una **página web responsive** en la que se pueda completar un proceso real de fútbol amateur: **jugador → equipo → rival → partido → solicitud de cancha → confirmación del propietario**. No es suficiente que compile: deben comprobarse las escrituras en Firestore y los controles de acceso.

**Estatus de esta hoja**: criterios de prueba definidos, pero **resultados pendientes de ejecutar en la instancia Firebase del estudiante**. Marcar «Aprobada» únicamente después de observar el resultado.

**Roles vigentes:** Jugador, Capitán y Dueño de cancha. Para una prueba entre dos equipos, utiliza **dos cuentas Capitán diferentes**. Las cuentas Equipo anteriores pueden convertirse a Capitán desde Perfil sin borrar publicaciones ni mensajes.

## Preparación de la demostración

- Verificar `git pull` de la rama principal y `npm ci && npm run build && npm run dev`.
- Copiar todas las reglas `futmatch/firestore.rules` de `main` en Firebase Console → Firestore Database → Reglas → Publicar.
- Habilitar Authentication (correo/contraseña) y Firestore en el proyecto correcto.
- Preparar cuatro cuentas de prueba con correos propios sin mostrar contraseñas:
  - **Jugador J**: nombre «Juan Prueba», defensa, La Florida.
  - **Capitán C**: nombre «Carla Prueba», equipo «Atlético Demo».
  - **Capitán C2**: nombre «Representante Demo», equipo «Deportivo Demo».
  - **Dueño D**: nombre «Dueño Demo», cancha «Cancha Demo».
- Usar una ventana normal e incógnita o dos navegadores para cambiar de cuenta sin cerrar sesiones.
- En una segunda pestaña, dejar Firestore → Datos (colecciones) y Authentication → Usuarios.

## Matriz de pruebas funcionales

| N.º | Cuenta | Acción | Resultado esperado |
| --- | --- | --- | --- |
| P01 | Todas | Registro, inicio/cierre de sesión y Perfil | Authentication crea cuenta; `usuarios/{uid}` persiste después de F5 |
| P02 | C | Perfil: nombre del equipo, región, comuna, datos deportivos | Guardar y recargar conserva los cambios; no aparece `permission-denied` |
| P03 | C | Mi equipo → Registrar equipo, elegir escudo/modalidad/nivel | Aparece documento `equipos/{uidC}` con capitán inicial |
| P04 | C | Crear publicación «Equipo busca jugadores» | `publicaciones` contiene categoría, `equipoId` y `autorTipoCuenta: capitan` |
| P05 | J | Explorar → buscar vacante y postular | Aparece solicitud `postulacion` en Matches, estado pendiente |
| P06 | C | Matches → aceptar postulación | Estado aceptada; chat habilitado para ambos |
| P07 | J | Matches → Confirmar ingreso a plantilla | `incorporacionConfirmada: true` en solicitud |
| P08 | C | Matches → Añadir jugador a plantilla | `equipos/{uidC}/integrantes/{uidJ}` existe |
| P09 | C | Mi equipo → asignar posición y consultar ficha | El jugador se ve en plantilla con su posición |
| P10 | J | Equipos → ver ficha de Atlético Demo | Ve capitán, escudo y jugadores públicos, sin editar a terceros |
| P11 | C2 | Mi equipo → Registrar Deportivo Demo | Se crea segunda ficha `equipos/{uidE}` |
| P12 | C | Publicar «Equipo busca rival» con fecha futura y hora en punto | Anuncio guardado con fecha y hora |
| P13 | C2 | Buscar rivales → encontrar el equipo del Capitán C → contactar desafío rival | Solicitud `contacto` pendiente entre dos capitanes con equipos registrados |
| P14 | C | Aceptar rival en Matches | Ambos pueden abrir Mensajes |
| P15 | C o C2 | Matches → Programar partido | `partidos/{idSolicitud}` estado `propuesto` |
| P16 | Otro equipo | Mis partidos → Confirmar partido | `estado: confirmado`; ninguno puede confirmar su propia propuesta |
| P17 | D | Anunciar cancha con dirección, comuna, precio y horarios | Se crean `canchas/{id}` y `publicaciones/{id}` en el mismo batch |
| P18 | D | Mis canchas → editar dirección/horario/precio | Se actualizan campos de cancha; anuncios anteriores no se reescriben |
| P19 | C o C2 | Buscar canchas → elegir partido confirmado → Solicitar reserva | `reservas/{partidoId}_{canchaId}` estado pendiente y precio de la solicitud |
| P20 | D | Conversaciones y reservas → Solicitudes de reserva → Confirmar | `reserva.estado: confirmada`, `partido.reservaConfirmadaId` y `turnos/{fecha}_{hora}` se crean juntos |
| P21 | C2 | Mis partidos y Reservas | Cancha y fecha aparecen confirmadas para ambos equipos |
| P22 | D o equipos | Cancelar una reserva confirmada | `reserva.estado: cancelada`, turno liberado y partido queda sin cancha |
| P23 | C2 | Mis publicaciones → Eliminar anuncio propio | Desaparece anuncio. No se puede eliminar el de otro usuario |
| P24 | D | Conversaciones y reservas → responder consultas por anuncio | El contacto aceptado permite chat y persiste tras F5 |

## Casos negativos y de seguridad

| N.º | Intento | Resultado esperado |
| --- | --- | --- |
| S01 | Intentar registrar una nueva cuenta con tipo Equipo | No existe ese rol en el registro y Firestore deniega crearlo |
| S02 | Cuenta Jugador intenta crear anuncio de dueño de cancha | Rechazado por interfaz y Firestore |
| S03 | Capitán C2 intenta modificar plantilla del Capitán C | Firestore deniega la modificación |
| S04 | Capitán C intenta confirmar partido que propuso él mismo | Firestore lo rechaza; debe hacerlo el otro equipo |
| S05 | Dueño D intenta confirmar reserva del mismo turno para dos partidos | Solo uno puede confirmarse; el segundo falla por turno ocupado |
| S06 | Capitán C solicita reserva de un partido no confirmado | Se bloquea en la interfaz y en las reglas |
| S07 | Un capitán cancela partido con reserva confirmada | Debe cancelar primero la reserva para liberar el turno |
| S08 | Jugador sin consentimiento es agregado a plantilla | Firestore debe denegar la escritura |
| S09 | Usuario ajeno consulta mensajes de otros dos usuarios | Firestore deniega lectura |
| S10 | Acceso sin autenticación a colecciones de producción | Firestore deniega lectura/escritura |

## Comprobaciones de UI y accesibilidad

- Pantalla pequeña en DevTools (375 × 812): menús, tarjetas, tablas y formularios sin desbordamiento horizontal.
- Navegación por teclado: Tab, foco visible y botones operables sin mouse.
- Etiquetas visibles en filtros, selectores, formularios y mensajes de error.
- Validación: título/descripcion requeridos, fecha futura, precio numérico, comuna de Chile, ausencia de equipo registrado antes de publicar desafío.
- Estado sin datos: cada colección vacía muestra un mensaje útil.
- Pantalla de error: un fallo de Firestore muestra código (`permission-denied`, `failed-precondition`, `unavailable`) en lugar de quedarse cargando indefinidamente.
- No mostrar contraseñas, tokens, datos personales reales ni claves privadas al grabar o exponer.

## Orden de presentación sugerido (15–20 minutos)

1. **1 min:** problema que resuelve FutMatch y descripción de sus cuatro roles.
2. **2 min:** Login, Perfil y estructura `usuarios`.
3. **3 min:** Capitán crea equipo/convocatoria, Jugador postula, aceptación, consentimiento y plantilla.
4. **3 min:** Segundo Capitán crea ficha, desafío, match aceptado y propone partido.
5. **3 min:** Otro equipo confirma; ambos ven Mis partidos.
6. **3 min:** Dueño publica cancha y tarifa; Equipo solicita reserva y Dueño confirma.
7. **2 min:** Firestore (colecciones, claves y turnos), reglas por rol y resumen.
8. **1 min:** limitaciones y próximos pasos.

### Qué decir

> FutMatch es una plataforma web responsive creada con React, TypeScript y Firebase.
> El proceso principal comienza cuando un jugador se conecta con un equipo. Ese equipo puede desafiar a un rival, confirmar la fecha y buscar una cancha real. El propietario aprueba o rechaza la solicitud. Todo queda registrado en Firestore, con reglas que limitan las acciones a los participantes autorizados.

## Publicación web y evidencia

1. `npm ci && npm run build` sin errores.
2. Reglas aprobadas por emulador en GitHub Actions y publicadas en Firebase Console.
3. Pruebas P01–P24 y S01–S10 ejecutadas con sus evidencias (capturas de la web y Firestore), marcando aprobadas/rechazadas.
4. Sitio desplegado en Firebase Hosting y probado desde otra computadora o teléfono.
5. Guardar en el informe las capturas de los cuatro perfiles, un partido confirmado, una reserva confirmada, Firestore y prueba de permisos.
6. Presentar limitaciones conocidas y documentación técnica. Si la evaluación exige BPMN, diagramas UML, KPIs, SLA y cronograma, entregar esos documentos académicos por separado: no los sustituye la web.

## Limitaciones que deben declararse

- Una ficha de equipo por cuenta responsable.
- Un partido proviene de un match aceptado entre dos equipos registrados; no hay torneo ni tabla de posiciones.
- Turnos de cancha de 60 minutos y horas exactas. Las reservas requieren aprobación del dueño; no incluyen pagos integrados.
- Las canchas históricas publicadas antes de esta versión requieren republicación para entrar en el catálogo.
- Los directorios usan límites de resultados; para uso masivo se necesitarían índices de búsqueda y paginación.
- Los roles son autodeclarados: no constituyen validación documental de titularidad del recinto.
- Antes de producción con usuarios reales se requiere revisar exhaustivamente permisos, casos concurrentes, tratamiento de datos personales, moderación y recuperación ante errores.
