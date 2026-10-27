# FutMatch — Publicaciones por categoría (Cloud Firestore)

Esta versión reemplaza las cuatro tarjetas demostrativas por publicaciones reales creadas por usuarios autenticados. Funciona en computador y celular con la misma interfaz React.

## Categorías disponibles

- **Persona busca equipo**: un jugador que quiere incorporarse a un equipo.
- **Equipo busca jugadores**: un equipo que necesita refuerzos.
- **Equipo busca rival**: un equipo que quiere disputar un encuentro contra otro.
- **Busco cancha**: un jugador o equipo publica en qué comuna de la Región Metropolitana necesita una cancha. Esta opción presenta una lista de las 52 comunas y se filtra desde Explorar; por ahora es una solicitud de cancha, no un sistema de disponibilidad ni reservas.

La sección **Explorar publicaciones** permite filtrar por categoría y nivel, y buscar por título, descripción, comuna o nombre. Muestra primero las publicaciones más recientes. El inicio muestra hasta tres de las últimas y el recuento real por categoría.

Para solicitudes de cancha, la comuna se selecciona desde un menú desplegable. Las otras categorías mantienen el campo libre de comuna o ciudad. Lista de comunas basada en el [Gobierno de Santiago](https://munilab52.gobiernosantiago.cl/ecosistema-regional/).

## Activación (obligatoria)

1. En GitHub, aprobar la rama y sincronizar `main` en Visual Studio Code, sin perder cambios locales.
2. En **Firebase Console → Firestore Database → Reglas**, reemplazar las reglas existentes por el contenido completo de `futmatch/firestore.rules` actualizado, y seleccionar **Publicar**. Las reglas anteriores bloquean la colección `publicaciones`; sin este paso aparecerá «permission-denied».
3. Confirmar que la cuenta de prueba tiene documento en `usuarios/{UID}`, con `nombre` igual al nombre del perfil de Authentication. El permiso de creación consulta este documento para impedir suplantación del autor.
4. Desde el directorio `futmatch`, ejecutar `npm install`, `npm run build` y `npm run dev` para verificar compilación y probar la web.
5. Tras publicar desde la web, abrir **Firestore Database → Datos → publicaciones**, donde deberá aparecer un documento con `categoria`, `autorUid`, `autorNombre`, `titulo`, `descripcion`, `comuna`, `equipoNombre`, `fecha`, `hora`, `futbol`, `nivel`, `estado` y `creadoEn`.

## Pruebas funcionales sugeridas

- Crear una publicación de **Persona busca equipo**, sin nombre de equipo, sin fecha/hora y comprobar que aparece en su categoría.
- Crear una publicación de **Equipo busca jugadores**, agregando nombre del equipo.
- Crear **Equipo busca rival** con nombre del equipo, fecha y hora propuestas.
- Crear **Busco cancha**, seleccionar una comuna desde la lista y verificar que se muestra en la categoría correspondiente.
- En Explorar, seleccionar **Busco cancha** y filtrar por otra comuna; comprobar que solo se muestran solicitudes de dicha comuna.
- Filtrar en Explorar por las tres categorías; comprobar que ninguna se mezcla con las otras.
- Buscar por comuna, título y nombre de equipo; filtrar por nivel.
- Recargar la página, cerrar e iniciar sesión; comprobar que las publicaciones siguen disponibles.
- Desde otra cuenta autenticada, comprobar que se ven las publicaciones y que las reglas no permiten falsificar `autorUid` ni `autorNombre`.
- Abrir la vista móvil y revisar formulario, selector y tarjetas.

## Alcance y seguridad

- Los documentos creados persisten en Cloud Firestore; la suscripción en tiempo real actualiza los listados automáticamente.
- Los campos se validan en el formulario y también en las reglas de Firestore. El ID del autor procede de Firebase Authentication; el nombre se compara con su perfil de Firestore.
- En esta versión no está habilitada la edición, cierre o eliminación de publicaciones. Tampoco se han implementado inscripciones a partidos, chats o «Me interesa» persistente.
- La consulta inicial utiliza los **100 documentos más recientes**. En una fase posterior convendrá incluir paginación.
- La base de datos solo permite leer publicaciones a usuarios autenticados. No almacenar teléfonos o información privada en las descripciones.

Estas tareas deben probarse en Firebase real antes de presentar una demo como funcional.
