# FutMatch: el Capitán administra un equipo y busca rivales

Esta versión elimina **Equipo** como tipo de cuenta disponible para registro. La web ofrece únicamente:

1. **Jugador:** busca equipos, consulta sus fichas y postula a vacantes publicadas por capitanes.
2. **Capitán:** administra la ficha y plantilla de su equipo, busca jugadores, publica convocatorias, busca **otros equipos rivales**, contacta desafíos, propone partidos, consulta canchas y solicita reservas.
3. **Dueño de cancha:** publica y administra recintos; gestiona conversaciones y reservas.

La colección Firestore **`equipos`**, el directorio y las fichas de los equipos **siguen existiendo**. Se elimina exclusivamente el tipo de cuenta **Equipo** como rol independiente.

## Buscar rivales desde Capitán

1. Inicia sesión como Capitán y registra el equipo en **Mi equipo**.
2. Abre **Buscar rivales** en el menú.
3. Buscar por equipo, comuna o capitán.
4. **Ver plantilla y capitán** abre la ficha del equipo rival.
5. Cuando el rival publicó un anuncio «Equipo busca rival», aparece **Contactar para jugar**. Envía una solicitud y el rival podrá aceptarla en Matches.
6. Si el rival no tiene un desafío publicado, la ficha se puede consultar, pero no se inventa una invitación sin anuncio. Desde **Ver desafíos publicados** se pueden consultar las ofertas existentes.
7. Una vez que la solicitud esté aceptada, **Matches → Programar partido**, confirmar con el otro capitán y reservar la cancha.

**Jugador:** el mismo directorio aparece como «Buscar equipos», mantiene las fichas públicas y su acceso a las vacantes para postular. No puede retar a rivales.

## Migración de cuentas Equipo antiguas

- **No** se eliminan datos de Firebase: las publicaciones, plantillas, mensajes, partidos y reservas permanecen.
- Los usuarios ya registrados como Equipo verán un aviso para cambiar a **Capitán** desde **Perfil → Editar perfil**. Deben guardar el cambio; no se altera automáticamente la cuenta.
- El rol anterior queda disponible solo para editar una cuenta que ya lo tenía, mientras se completa su migración.
- Las reglas nuevas **impiden crear perfiles con rol Equipo** y cambiar perfiles ya migrados de nuevo a ese rol.
- Los documentos antiguos de `equipos/{uid}` mantienen el mismo ID/UID. Sus permisos de propietario y sus relaciones con partidos, solicitudes y mensajes no cambian.

## Activación

1. Esperar los checks verdes de GitHub Actions en el Pull Request.
2. Hacer Merge y sincronizar VS Code.
3. Copiar **todo** `futmatch/firestore.rules` actualizado a Firebase Console → Firestore Database → Reglas → Publicar.
4. Abrir `npm run dev` desde `futmatch/` y recargar con `Ctrl+Shift+R`.

## Pruebas

- Registro: solo Jugador / Capitán / Dueño de cancha.
- Capitán A: registrar equipo, publicar rival; Capitán B: registrar otro y buscarlo desde «Buscar rivales», ver su plantilla, pulsar «Contactar para jugar».
- Aceptar el contacto y verificar que ambos acceden a la conversación y a la organización de partidos.
- Jugador: ver «Buscar equipos» y postular a una vacante del Capitán sin poderes de gestionar partidos.
- Dueño de cancha: conservar su vista de anuncios y conversaciones.
- Cuenta Equipo antigua: cambiar desde Perfil a Capitán, recargar y comprobar que conserva su equipo y publicaciones.
- Seguridad: intentar crear `usuarios/{uid}` con `tipoCuenta: 'equipo'` debe ser rechazado; cambios de Capitán a Equipo también.
- Verificación automática: `npm run build` y pruebas con emulador en `tests/tipos-cuenta.rules.test.mjs` y `tests/reservas.rules.test.mjs`.

**Límite:** la compilación y las pruebas con emulador no sustituyen una revisión funcional con el Firebase real.
