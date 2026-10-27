# FutMatch — Registro e inicio de sesión

Esta entrega agrega una pantalla responsive de registro, acceso y recuperación de contraseña mediante Firebase Authentication. El diseño de la interfaz principal de FutMatch se conserva; el nombre y el avatar toman los datos de la cuenta autenticada. El registro intenta guardar un perfil en la colección `usuarios` de Cloud Firestore.

## Configuración en Firebase Console

1. En **Authentication > Sign-in method**, habilitar **Correo electrónico/contraseña** (no es necesario habilitar acceso sin contraseña).
2. En **Firestore Database > Reglas**, sustituir las reglas iniciales de producción por el contenido de `firestore.rules` y hacer clic en **Publicar**. Estas reglas solo habilitan el perfil propio de cada usuario; todavía bloquean otras colecciones.
3. En **Authentication > Settings > Authorized domains**, confirmar que el dominio usado para el desarrollo y el futuro Hosting esté autorizado cuando corresponda. Para el entorno local, verificar localhost según la configuración del proyecto.
4. La aplicación web ya debe estar registrada en el proyecto `proyecto-de-titulo-futmatch` y `src/firebase.ts` debe contener la configuración del SDK web. Nunca se deben subir contraseñas, claves privadas ni archivos de cuenta de servicio al repositorio.

## Ejecutar

Desde la carpeta `futmatch`:

```bash
npm install
npm run dev
```

Abrir la URL local que indique Vite (por ejemplo, http://localhost:5173 o :5174).

## Registro con región y comuna (Chile completo)

El registro ya no permite escribir cualquier texto como comuna. Se elige **Región** y luego **Comuna**, mediante dos listas dependientes. Al cambiar de región, la comuna anterior se limpia automáticamente.

- Catálogo estático: `src/territorioChile.ts`, con **16 regiones y 346 comunas**, a partir de los datos normalizados y documentados de [ChileHub](https://github.com/cortega26/chile-hub/tree/main/data/normalized) (datos de división político-administrativa BCN/SUBDERE).
- El perfil en `usuarios/{uid}` de Firestore guarda `nombre`, `correo`, `region`, `regionCodigo`, `comuna`, `comunaCodigo` y `creadoEn`.
- Las **reglas de Firestore** deben publicarse nuevamente con el contenido actualizado de `firestore.rules` **antes de probar un registro nuevo**. Validan que el par región/comuna y sus nombres corresponda al catálogo oficial incorporado.
- Los usuarios creados antes de este cambio **no se borran**: sus documentos conservan `comuna` y todavía no tienen `regionCodigo` ni `comunaCodigo`. Más adelante se puede crear edición de perfil para completar esa información.
- Cambiar la ubicación del perfil de un usuario ya existente queda fuera de esta etapa; el formulario actual se aplica al registro de cuentas nuevas.

**Prueba sugerida:** seleccionar Región Metropolitana y La Florida, crear un usuario de prueba distinto; verificar en Firestore `regionCodigo: "13"` y el `comunaCodigo` correspondiente. Cambiar a Biobío antes de registrar y verificar que La Florida desaparece del selector. Verificar también una comuna de otra región. No es necesario desplegar un servidor geográfico externo.

## Verificar manualmente

1. Crear una cuenta de prueba con nombre, comuna, correo y contraseña de 8 o más caracteres.
2. Confirmar que la cuenta aparece en **Firebase Authentication > Usuarios**.
3. Confirmar que existe `usuarios/{UID}` en **Firestore Database > Datos** (si publicaste las reglas).
4. Cerrar sesión e iniciar con el mismo correo.
5. Intentar una contraseña incorrecta y comprobar que aparece un mensaje de error.
6. Pulsar **¿Olvidaste tu contraseña?** y probar el envío.
7. Revisar el formulario en pantalla de computador y en la vista móvil del navegador.

## Alcance de esta entrega

- La autenticación es real y utiliza Firebase.
- El perfil de Firestore se guarda tras registrar la cuenta, siempre que las reglas estén publicadas.
- Las tarjetas de publicaciones, los matches y los mensajes de la interfaz actual siguen siendo contenido de demostración; esta entrega no implementa todavía la publicación real de partidos, inscripción ni mensajería.
- Para implementar partidos e inscripciones en Firestore deben desarrollarse sus operaciones y reglas de seguridad específicas, incluidas transacciones de cupos.

Si el registro crea una cuenta pero no genera el documento de Firestore, se mostrará un aviso en pantalla. Revisar primero la pestaña **Reglas** de Cloud Firestore.
