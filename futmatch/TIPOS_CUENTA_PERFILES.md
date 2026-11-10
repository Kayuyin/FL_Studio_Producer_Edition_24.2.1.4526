# FutMatch — tipos de cuenta y perfiles editables

## Tipos de cuenta

FutMatch permite seleccionar un tipo durante el registro y cambiarlo después desde **Perfil → Editar perfil**:

| Tipo | Campos principales |
| --- | --- |
| Jugador | Nombre, región, comuna, descripción, posición, nivel y disponibilidad |
| Equipo | Nombre de la persona responsable, nombre del equipo, ubicación, descripción del equipo, nivel y disponibilidad |
| Capitán | Nombre, equipo representado, región, comuna, descripción, posición, nivel y disponibilidad |
| Dueño de cancha | Nombre de la persona responsable, nombre de la cancha, región, comuna y descripción del recinto |

El tipo de cuenta es **declarado por el usuario**. En esta versión no se comprueba legalmente la propiedad de una cancha ni la representación de un equipo.

Los campos `tipoCuenta`, `nombreEquipo`, `nombreCancha` y `bio` se guardan en el documento existente `usuarios/{uid}`. Los usuarios anteriores no pierden datos y se muestran como **Jugador** hasta que seleccionen otro tipo.

## Activación obligatoria de Firestore

Tras integrar la actualización en GitHub:

1. Sincronizar la rama principal en Visual Studio Code sin descartar cambios locales.
2. En Firebase Console → **Firestore Database → Reglas**, reemplazar el contenido por **todo** el archivo `futmatch/firestore.rules` actualizado y presionar **Publicar**.
3. Ejecutar desde la carpeta `futmatch`:

```powershell
npm ci
npm run build
npm run dev
```

**No omitir el paso 2**: las reglas anteriores no aceptarán los nuevos campos de registro y edición.

## Pruebas de aceptación

1. Registrar una cuenta de prueba de tipo **Jugador**. Confirmar en Firestore `tipoCuenta: "jugador"` y los campos de ubicación.
2. Registrar una cuenta **Equipo**. Debe pedir nombre del equipo y guardarlo en `nombreEquipo`, con `nombreCancha` vacío.
3. Registrar una cuenta **Capitán**. Debe pedir el equipo que representa, junto al nombre personal.
4. Registrar una cuenta **Dueño de cancha**. Debe pedir nombre de cancha; guardar `nombreCancha` y mantener `nombreEquipo` vacío.
5. Abrir **Perfil → Editar perfil**. Cambiar nombre, descripción y región/comuna; guardar y recargar para comprobar persistencia.
6. Cambiar el tipo de una cuenta antigua a **Equipo**: verificar que exige nombre de equipo, actualiza el documento y que la barra lateral muestra el tipo.
7. Cambiar una cuenta de **Equipo** a **Jugador**: las reglas deben guardar nombre de equipo y nombre de cancha vacíos y mostrar los datos deportivos del jugador.
8. Probar en una pantalla móvil y comprobar que el formulario no se desborda.
9. Intentar escribir en el perfil de otra cuenta con el SDK de Firebase: Firestore debe denegar el acceso.
10. Comprobar que siguen funcionando Inicio, Explorar, las publicaciones, Matches y Mensajes.

## Alcance y privacidad

- El tipo de cuenta no otorga permisos de administrador ni privilegios para acceder a datos de otras cuentas. Todas las cuentas siguen sujetas a las mismas reglas de seguridad.
- El correo electrónico de acceso no se puede modificar desde Editar perfil.
- Los perfiles históricos sin `tipoCuenta` permanecen válidos para lectura.
- Los nombres ya almacenados en publicaciones o solicitudes anteriores no se reescriben al editar el perfil.
- El perfil muestra los datos al propio usuario. Permitir consultar perfiles de otras personas requeriría definir permisos de lectura y privacidad por separado.
