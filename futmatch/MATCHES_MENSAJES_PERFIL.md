# FutMatch — Matches, mensajes y edición del perfil

## Estado de esta entrega

Se agregan funciones reales de **Matches**, **Mensajes** y **Perfil** con Firebase.

- En **Explorar**, el botón **Me interesa** crea una solicitud en Cloud Firestore para una publicación de otra persona.
- En **Matches**, el autor ve solicitudes recibidas y puede **aceptar** o **rechazar**. El interesado ve el estado de las solicitudes enviadas.
- En **Mensajes**, se puede enviar y recibir texto en tiempo real **solo cuando una solicitud fue aceptada**. No se puede conversar con usuarios que no hayan aceptado la solicitud.
- En **Perfil**, cada usuario puede editar su nombre, región, comuna, posición, nivel, disponibilidad y descripción personal. La región y comuna se eligen de una lista predefinida (16 regiones y 346 comunas de Chile); no se ingresan como texto libre.
- En la barra superior, el botón de avisos abre Matches; el avatar y el menú de perfil llevan a la pantalla de Perfil; el Centro de ayuda explica los pasos básicos.
- Se conserva el diseño responsive para PC y celular.
- El sistema no incluye notificaciones push, archivos adjuntos, fotos de perfil, bloqueo de usuarios ni reserva de canchas. Estas funciones requerirían trabajo adicional.

## Activación obligatoria

1. Integrar el PR en GitHub y actualizar Visual Studio Code con **Sync Changes**. Antes, comprobar que no haya cambios locales sin registrar.
2. En **Firebase Console → Firestore Database → Reglas**, **reemplazar todo** el contenido de las reglas por el archivo `futmatch/firestore.rules` incluido en esta rama, y pulsar **Publicar**.
3. Estas nuevas reglas preservan `usuarios` y `publicaciones` y habilitan las colecciones `solicitudes` y sus subcolecciones `mensajes`.
4. Dentro de `futmatch`, ejecutar:

```powershell
npm install
npm run build
npm run dev
```

5. Usar dos cuentas de prueba, cada una con documento de perfil en Firestore. En el caso de cuentas antiguas, entrar a **Perfil** y seleccionar región y comuna antes de modificar sus datos. El correo original no cambia.

## Pruebas funcionales con dos usuarios

1. Usuario A crea una publicación. Confirma en Firestore que existe en `publicaciones`.
2. Usuario B inicia sesión, entra a Explorar y pulsa **Me interesa** en la publicación de A. Se debe crear `solicitudes/{publicacionId}_{uidB}`.
3. Usuario B comprueba que su solicitud figura como **Pendiente** en Matches. No debe poder enviar mensajes aún.
4. Usuario A entra a Matches, revisa la solicitud y pulsa **Aceptar**.
5. Los dos usuarios abren Mensajes y comprueban que pueden enviar y recibir textos y que el contenido reaparece tras recargar.
6. Repetir con otra publicación, esta vez pulsando **Rechazar**; no debe habilitarse un chat.
7. Verificar que no sea posible solicitar contacto con una publicación propia ni duplicar una solicitud.
8. En Perfil, modificar el nombre y elegir una región y comuna distintas. Confirmar el resultado en Firestore `usuarios/{uid}` y el nombre mostrado en la barra lateral.
9. Comprobar que la UI se adapta a pantallas móviles y que los botones de avisos, perfil y ayuda abren su destino.
10. En una cuenta distinta, intentar leer por código un chat o solicitud ajena: Firestore debe rechazar la operación por permisos.

## Esquema Firestore

- `usuarios/{uid}`: datos del perfil y ubicación, gestionados por el propio usuario.
- `publicaciones/{id}`: publicaciones de categorías deportivas.
- `solicitudes/{publicacionId}_{uidInteresado}`: identificadores de ambas partes, nombres visibles, título de la publicación, estado pendiente/aceptada/rechazada, fecha de envío y respuesta.
- `solicitudes/{solicitudId}/mensajes/{id}`: texto, UID del autor y fecha de envío.

**Seguridad:** las solicitudes solo se pueden crear desde cuentas autenticadas para publicaciones ajenas; el autor puede responder una sola vez y sin alterar a las partes. Los mensajes solo son visibles y escribibles por las dos cuentas involucradas en una solicitud aceptada. Se prohíbe editar mensajes antiguos y suplantar la identidad del emisor.

## Limitaciones y notas importantes

- Cada publicación admite una solicitud por cuenta; una solicitud rechazada no puede reenviarse en esta versión.
- Las publicaciones antiguas conservan el nombre del autor con el que fueron creadas. Editar el perfil cambia el nombre de publicaciones futuras, pero no modifica el historial.
- El servicio de listados carga hasta 100 publicaciones recientes y el chat hasta 100 mensajes de cada conversación. Posteriormente conviene incorporar paginación.
- La edición de perfil obliga a seleccionar región y comuna válidas, incluso en cuentas antiguas que aún no tienen esos códigos.
- Después de publicar reglas, Firestore puede tardar unos instantes en aplicar los cambios. Si aparece `permission-denied`, revisa si se publicaron **todas** las reglas y si las cuentas de prueba tienen documentos en `usuarios`.
