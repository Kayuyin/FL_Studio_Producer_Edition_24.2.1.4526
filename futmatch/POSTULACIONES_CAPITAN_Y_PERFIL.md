# FutMatch — Postulación de jugadores y solución de errores de perfil

## Reglas de la vista Jugador

- El jugador solo puede publicar **Busco equipo** (`persona_busca_equipo`).
- En Explorar, solo ve las **vacantes creadas por cuentas Capitán** (`equipo_busca_jugadores` con `autorTipoCuenta: "capitan"`).
- En cada vacante disponible aparece **Postular al equipo**. Se crea una solicitud `tipoSolicitud: "postulacion"` asociada al anuncio y a la cuenta del jugador.
- En Matches, el capitán puede aceptar o rechazar el contacto, y el jugador ve la respuesta.
- **Aceptar una postulación solo habilita Mensajes; no incorpora al jugador a una plantilla.** La gestión de integrantes de un equipo necesita una función posterior.
- Los jugadores no pueden escribir solicitudes de contacto a publicaciones de otras categorías, incluso desde el SDK, porque lo bloquean las reglas Firestore.
- Las cuentas Equipo pueden buscar rivales o canchas, pero **solo Capitán** puede publicar la categoría «Equipo busca jugadores».
- Las demás cuentas mantienen sus funcionalidades correspondientes.

**Publicaciones antiguas:** los anuncios creados antes de esta actualización no incluyen `autorTipoCuenta`. Por seguridad, no aparecerán como vacantes de capitán para jugadores. Si un capitán tenía una publicación anterior, debe volver a publicarla desde su cuenta Capitán.

## Error al guardar el perfil

Antes, FutMatch mostraba solamente un error genérico. Ahora se explica según el código Firebase:

- `permission-denied`: las reglas activas no autorizan la operación (ej. reglas antiguas, datos de perfil que no coinciden con el catálogo de comunas).
- `not-found`: documento de usuario inexistente o eliminado.
- `unavailable` / `deadline-exceeded`: problemas de conectividad o disponibilidad de Firestore.
- `unauthenticated`: sesión no válida.
- Otros errores muestran su código y la consola del navegador registra el detalle.

Además, cuando una cuenta de Authentication no tiene documento `usuarios/{uid}` en Firestore, el formulario puede crearlo con correo, nombre, tipo de cuenta, región/comuna y datos del perfil, respetando las reglas de creación.

**Importante:** no se pudo acceder en esta actualización a la configuración activa de tu Firebase, por lo que no podemos asegurar que el error de la captura fuera por una causa concreta. Si sigue apareciendo, copia solo el **código del error** (sin enviar claves privadas).

## Cómo activar

1. Integrar esta actualización a GitHub y sincronizar VS Code (no descartar cambios sin guardar).
2. En Firebase Console → Firestore Database → Reglas, **reemplazar todas las reglas** con el archivo completo de `futmatch/firestore.rules` de la rama principal recién integrada. Presionar **Publicar**.
3. En la carpeta `futmatch`, ejecutar `npm ci`, `npm run build`, `npm run dev`.
4. Recargar la web en el navegador.

## Pruebas manuales con dos cuentas

1. Cuenta Jugador: verificar que solo puede publicar Busco equipo y que su Explorar muestra exclusivamente vacantes de capitanes.
2. Cuenta Capitán: publicar una nueva vacante «Equipo busca jugadores» indicando el equipo, título y descripción.
3. Cuenta Jugador: seleccionar **Postular al equipo** en ese anuncio; no debe poder postular dos veces.
4. Cuenta Capitán: abrir Matches y aceptar/rechazar la postulación. Cuenta Jugador: comprobar actualización de estado.
5. Si se acepta, verificar chat en Mensajes y que no se agreguen jugadores a una plantilla inexistente.
6. Cuenta Equipo: comprobar que no puede publicar nuevas vacantes de «Equipo busca jugadores», pero sí buscar rival.
7. En Firestore, revisar `publicaciones/{id}` con `autorTipoCuenta: "capitan"` y `solicitudes/{id}` con `tipoSolicitud: "postulacion"`.
8. En cuenta antigua, abrir Perfil → Editar perfil, cambiar la descripción o la posición y guardar. Confirmar persistencia tras recargar.
9. Probar una cuenta Auth sin documento `usuarios/{uid}` en una instancia de pruebas: al completar sus campos, el formulario debería crear el documento.
10. Comprobar la app en móvil y confirmar que Inicio, Explorar, Matches, Mensajes y Mis publicaciones siguen funcionando.

## Seguridad

Los roles se verifican en reglas Firestore al crear anuncios. El tipo de una solicitud también se valida en Firestore; el jugador no puede falsificar `tipoSolicitud: "contacto"` para saltarse la restricción. Se mantienen los controles de propiedad para editar perfiles y borrar publicaciones. Los tipos de cuenta continúan siendo declarados por el usuario.
