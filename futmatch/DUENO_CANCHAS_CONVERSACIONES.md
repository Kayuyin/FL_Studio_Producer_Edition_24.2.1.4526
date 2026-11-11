# Dueño de cancha — Anuncios y conversaciones

En FutMatch las cuentas **Dueño de cancha** tienen ahora un menú específico:

1. **Inicio** — Resumen de sus anuncios y contactos.
2. **Anunciar cancha** — Formulario que permite crear únicamente anuncios `ofrece_cancha`.
3. **Mis canchas** — Ver y eliminar sus propios anuncios de cancha.
4. **Conversaciones** — Revisar solicitudes recibidas, aceptarlas/rechazarlas y conversar en el mismo lugar.
5. **Perfil** — Editar datos personales, ubicación y nombre del recinto.

Se quitaron de esta cuenta las opciones de **Explorar**, **Matches** como pantalla separada y cualquier acceso para buscar jugadores, equipos u otras canchas. El botón de notificaciones dirige a **Conversaciones**.

## Cómo funciona la conversación

- Una cuenta **Equipo o Capitán** puede abrir **Explorar**, ver una oferta de cancha y pulsar **Me interesa**.
- El propietario ve la solicitud en **Conversaciones → Solicitudes por responder**.
- Cuando acepta, aparece un chat en **Conversaciones activas** y los dos usuarios pueden intercambiar mensajes.
- Cuando rechaza, no se abre el chat.
- Las solicitudes existentes y los mensajes anteriores se mantienen.
- El usuario **Jugador** se mantiene exclusivamente en la búsqueda de equipo y en las postulaciones a vacantes de capitanes, como se acordó anteriormente. No puede enviar nuevas solicitudes a canchas.

## Reglas de seguridad

- En `firestore.rules`, la creación de anuncios `ofrece_cancha` está limitada a las cuentas con `tipoCuenta == "dueno_cancha"`.
- Las cuentas de Dueño de cancha **no pueden crear solicitudes de contacto nuevas**: solo pueden recibirlas y decidir sobre las que llegan a sus publicaciones.
- Las conversaciones continúan protegidas por las mismas reglas: solo el autor y la persona interesada pueden leer y enviar mensajes, cuando la solicitud está aceptada.
- Los propios anuncios solo pueden eliminarse por el UID que los creó.

## Activación

1. Fusionar el Pull Request después de comprobar que `npm run build` pasa.
2. Sincronizar el proyecto en Visual Studio Code sin perder cambios locales.
3. En Firebase Console → Firestore Database → Reglas, reemplazar **todo** el editor por `futmatch/firestore.rules` actualizado desde `main`. Pulsar **Publicar**.
4. Ejecutar `npm run dev` desde la carpeta `futmatch`.

## Pruebas rápidas

1. Iniciar sesión como Dueño de cancha y verificar que el menú solo tiene Inicio, Anunciar cancha, Mis canchas, Conversaciones y Perfil.
2. Publicar una cancha y comprobar el anuncio en Mis canchas y en Firestore `publicaciones`.
3. Iniciar sesión con una segunda cuenta Capitán (o Equipo), visitar Explorar y pulsar **Me interesa** en la oferta.
4. Volver a la cuenta Dueño de cancha, abrir Conversaciones y pulsar **Aceptar** sobre la solicitud.
5. Enviar y recibir mensajes entre las dos cuentas y actualizar ambas ventanas.
6. Repetir con otra solicitud, rechazarla y comprobar que no se abre una conversación.
7. Comprobar que el dueño no tiene botón de búsqueda y que las reglas rechazan una solicitud saliente nueva.
8. Probar en teléfono o en la vista móvil del navegador.

**Alcance:** no hay reservas confirmadas, pagos ni horarios en tiempo real.
