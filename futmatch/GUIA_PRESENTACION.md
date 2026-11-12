# FutMatch — Guía para la defensa del proyecto de título

## Objetivo de la demostración
Mostrar una plataforma funcional con **React, TypeScript, Firebase Authentication y Cloud Firestore**.
La aplicación ya dispone de cuentas Jugador, Capitán y Dueño de cancha. La demostración usa datos reales creados en vivo; **no depende de importar las 1.730 fichas ficticias**.

## Preparación antes de presentar
- [ ] Actualizar el código desde GitHub y comprobar que `npm ci` y `npm run build` terminen correctamente.
- [ ] Publicar la versión vigente de `futmatch/firestore.rules` en Firebase Console → Firestore Database → Reglas.
- [ ] Comprobar que el proyecto Firebase seleccionado es el de FutMatch y que Authentication por email/contraseña funciona.
- [ ] Disponer de tres cuentas de demostración **sin revelar contraseñas**: un Jugador, dos Capitanes con equipos distintos y un Dueño de cancha. Para el flujo de rivales se necesitan dos capitanes.
- [ ] Registrar con anticipación los dos equipos de los capitanes y una publicación de desafío con fecha futura y hora exacta; **la cancha se registra en vivo**.
- [ ] Abrir la web en una ventana normal y otra de incógnito para alternar entre las cuentas sin interrumpir la sesión.
- [ ] Verificar conexión a Internet, acceso a Firebase Console y un navegador actualizado. Evitar usar datos personales reales durante la defensa.
- [ ] Si existe un fallo por reglas o índices de Firestore, resolverlo **antes** de la presentación. No desactivar las reglas de seguridad.

## Recorrido recomendado para enseñar el sistema

### 1. Explicar los roles
En la pantalla de inicio de cada cuenta, mostrar la navegación específica:
- **Jugador:** buscar equipos y vacantes, publicar una búsqueda, postular y conversar si es aceptado.
- **Capitán:** administrar su equipo, publicar desafíos, contactar rivales, confirmar partidos y solicitar cancha.
- **Dueño de cancha:** anunciar recintos, mantener sus precios, responder conversaciones y aprobar/rechazar reservas.

### 2. Crear una cancha en vivo
1. Entrar como **Dueño de cancha**.
2. Abrir **Anunciar cancha**.
3. Rellenar un nombre de prueba identificable, dirección de demostración, comuna, modalidad, precio por hora, descripción y horario habitual.
4. Pulsar **Registrar cancha en FutMatch**.
5. Mostrar la confirmación y, desde Firebase Console, los nuevos documentos en `canchas` y `publicaciones`.

**Los datos creados para esta prueba deben señalarse como datos de evaluación**, no como disponibilidad comercial efectiva.

### 3. Mostrar la búsqueda por comuna
1. Cambiar a **Capitán** y abrir **Buscar canchas**.
2. Seleccionar la **misma comuna** que se usó al registrar el recinto.
3. Verificar que aparece el nombre, la dirección, el precio y la modalidad recién registrados.

### 4. Conexión entre equipos
1. Desde Capitán A, abrir **Publicar** y crear un desafío `Equipo busca rival` con fecha futura y hora exacta (p. ej., 19:00).
2. Desde Capitán B, abrir **Buscar rivales** y **Contactar para jugar**.
3. Desde Capitán A, abrir **Solicitudes** y aceptar el contacto.
4. Mostrar que el chat se habilita y que se puede proponer el partido desde **Mis partidos**.
5. Confirmar el partido con la otra cuenta y revisar el estado.

### 5. Reserva
1. Con el partido confirmado, solicitar la reserva de la cancha registrada.
2. Cambiar al Dueño de cancha, abrir **Solicitudes y mensajes** y confirmar la solicitud.
3. Mostrar en Firebase los registros de reserva y comprobar el estado en **Mis reservas**.

## Qué explicar a la comisión
- Los registros se guardan realmente en Cloud Firestore y se sincronizan con suscripciones en tiempo real.
- Las vistas y las acciones dependen del rol del usuario.
- Las reglas de Firestore validan las operaciones: ocultar botones no sustituye la seguridad.
- Los partidos y las reservas requieren aceptación de las partes; FutMatch no procesa pagos.

## Plan de respaldo
Si falla la conexión a Internet o el inicio de sesión, mostrar el flujo previamente ensayado y el código del módulo correspondiente. No afirmar que una operación se ejecutó si no aparece confirmada en Firestore.

## Pruebas de aceptación
- [ ] Un Jugador no ve administración de canchas ni partidos.
- [ ] Un Dueño no ve búsqueda de rivales ni plantillas.
- [ ] Un Capitán puede registrar equipo, publicar desafío y recibir respuestas.
- [ ] Una cancha registrada aparece en la comuna correcta, con sus datos.
- [ ] El partido no se registra como confirmado hasta recibir la aceptación.
- [ ] La reserva no se considera confirmada hasta que el dueño acepte el turno.
- [ ] El diseño es legible en computador y teléfono.
