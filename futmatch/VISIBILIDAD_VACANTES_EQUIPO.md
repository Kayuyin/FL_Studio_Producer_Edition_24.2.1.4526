# FutMatch — Visibilidad de vacantes entre equipos

## Restricción

Una cuenta de tipo **Equipo** puede buscar:

- Jugadores que publicaron **Persona busca equipo**.
- Otros equipos que publicaron **Equipo busca rival**.
- Solicitudes y ofertas de canchas.

No debe ver publicaciones **Equipo busca jugadores** de otros equipos/capitanes, ni en Explorar → Todas, por búsqueda de texto ni por acceso directo a Firestore. Esa categoría desaparece de los filtros de Explorar para las cuentas Equipo.

**Excepción:** si hay publicaciones propias antiguas de esa categoría, seguirán accesibles desde **Mis publicaciones** para que el dueño de la cuenta pueda eliminarlas.

Las cuentas **Jugador** siguen viendo vacantes publicadas por capitanes para postular. **Capitán** conserva la posibilidad de publicar vacantes. **Dueño de cancha** conserva su panel limitado.

## Implementación y activación

- `VistasPublicaciones.tsx`: la categoría no aparece en Explorar de Equipo y los resultados se filtran por rol.
- `publicaciones.ts`: para Equipo se hacen consultas separadas, una a categorías permitidas y otra a anuncios propios. Nunca se consulta toda la colección sin restricciones.
- `firestore.rules`: se deniega la lectura de una vacante ajena a cuentas Equipo, aunque intenten leer el documento directamente. También se impide enviar solicitudes hacia esas vacantes desde cuentas Equipo.
- `App.tsx`: se espera a cargar el perfil para suscribirse según su rol y se reinicia la consulta cuando cambia el tipo.

**Publicar las reglas actualizadas es obligatorio** para que el servidor refuerce la restricción. En Firebase Console → Firestore Database → Reglas se debe pegar el archivo completo de `futmatch/firestore.rules` y presionar **Publicar**, después de fusionar este cambio.

## Pruebas

1. Crear y entrar como **Capitán**. Publicar una vacante **Equipo busca jugadores**. Confirmar que el propio Capitán la puede ver y gestionar.
2. Entrar como **Jugador**. Abrir Explorar: la vacante del Capitán debe ser visible para postular.
3. Entrar como **Equipo**. En Explorar → Todas la vacante no aparece. Tampoco está su categoría en los filtros, ni sale buscando por el título.
4. En la misma cuenta Equipo, comprobar que sí se pueden ver publicaciones **Persona busca equipo**, **Equipo busca rival**, **Busca cancha** y **Ofrece cancha**.
5. Desde la cuenta Equipo, intentar leer directamente el ID del documento de la vacante de otra cuenta usando el SDK Firebase: debe dar `permission-denied`.
6. Si la cuenta Equipo tiene vacantes propias antiguas, comprobar que estas siguen visibles **solo en Mis publicaciones** y que puede eliminarlas.
7. Cambiar el tipo de una cuenta de Equipo a Jugador o Capitán desde Perfil y comprobar que la escucha vuelve a cargar los anuncios de acuerdo con el nuevo rol.

### Límites

Las pruebas de reglas y de consultas en Firebase real deben ejecutarse después de publicar. La compilación de GitHub Actions no comprueba los permisos contra una instancia de producción.
