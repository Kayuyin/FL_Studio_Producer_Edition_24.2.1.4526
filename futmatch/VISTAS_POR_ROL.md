# FutMatch — Vistas personalizadas por tipo de cuenta

## Experiencia por perfil

| Cuenta | Inicio y accesos funcionales |
| --- | --- |
| Jugador | Buscar equipos, ofrecerse como jugador, buscar anuncios de canchas y administrar sus publicaciones |
| Capitán | Ver jugadores disponibles, crear convocatorias, buscar rivales y editar datos del equipo que representa |
| Equipo | Ver jugadores disponibles, convocar refuerzos, explorar rivales y proponer amistosos mediante publicaciones |
| Dueño de cancha | Publicar **Ofrezco cancha**, explorar **Busco cancha**, administrar anuncios propios y responder solicitudes |

Todos los usuarios conservan **Explorar, Matches, Mensajes y Perfil**. La nueva vista **Mis publicaciones** permite ver y eliminar anuncios propios. La navegación sigue siendo responsive para PC y móvil.

## Publicación y contactos

- Las cuentas Dueño de cancha pueden crear anuncios en la nueva categoría `ofrece_cancha`. Es obligatorio registrar el nombre de la cancha; su región y comuna se eligen de un catálogo de Chile.
- Los jugadores y equipos pueden consultar esas ofertas en Explorar, contactar mediante **Me interesa** y conversar una vez aceptada la solicitud.
- Los dueños de cancha pueden contactar a usuarios que publican **Busco cancha**.
- El formulario de publicación usa **16 regiones y 346 comunas** para todos los roles, en lugar de permitir nombres de ubicación inventados.
- Los paneles muestran exclusivamente cifras derivadas de las publicaciones y solicitudes que se consultan de Firestore (dentro del límite actual de 100 publicaciones recientes).
- **No existe un motor de reservas**, calendario en tiempo real, pagos, ni confirmación de disponibilidad. Cualquier trato se acuerda entre las partes. Los campos de fecha/hora de los anuncios solo son informativos.

## Activación

1. Fusionar este Pull Request cuando su comprobación automática de compilación esté aprobada.
2. Sincronizar Visual Studio Code, respetando cambios locales pendientes.
3. En Firebase Console → Firestore Database → Reglas, reemplazar las reglas actuales con **todo** el contenido actualizado de `futmatch/firestore.rules` y presionar **Publicar**.
4. Desde `futmatch`, ejecutar `npm ci`, `npm run build` y `npm run dev`.

Las reglas nuevas validan las categorías por tipo de cuenta y permiten el uso de comunas de todo Chile. Sin publicar las reglas, la creación de anuncios `ofrece_cancha` y otras publicaciones nuevas no funcionará.

## Prueba manual con distintas cuentas

1. En una cuenta tipo Jugador, comprobar el panel, que **Buscar equipo** abre la categoría apropiada y que **Ofrecerme como jugador** selecciona `persona_busca_equipo`.
2. En Capitán, verificar botones de jugadores, rivales, convocatoria y edición del perfil del equipo.
3. En Equipo, verificar búsqueda, convocatorias y desafío a rivales.
4. En Dueño de cancha, comprobar **Anunciar mi cancha**, ingresar el nombre real del recinto y seleccionar región y comuna.
5. Publicar una oferta de cancha; confirmar que aparezca en `Firestore → publicaciones`, que se liste en Explorar → Ofrezco cancha y que se pueda eliminar desde Mis publicaciones.
6. Con otra cuenta, pulsar Me interesa en la oferta. En la cuenta dueña, revisar y aceptar la solicitud en Matches; comprobar el chat en Mensajes.
7. En la cuenta Dueño de cancha, pulsar **Encontrar interesados** y comprobar que abra la categoría `busca_cancha`.
8. Revisar la visualización en pantallas pequeñas, las notificaciones y que el rol de cada usuario siga correctamente indicado en el perfil.

## Protección de datos

Las publicaciones solo pueden crearse por una cuenta autenticada que posea perfil en Firestore, y las reglas comprueban que la categoría esté permitida para el rol declarado. Ofrecer una cancha requiere el rol `dueno_cancha`. El propietario de un anuncio puede eliminarlo, pero no un usuario ajeno. Las solicitudes y mensajes mantienen las restricciones existentes.

**Nota:** los tipos de cuenta son autodeclarados. Elegir Dueño de cancha no demuestra legalmente la propiedad del recinto, ni otorga privilegios administrativos.
