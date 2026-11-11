# FutMatch — Equipos, plantillas, rivales y canchas en Firestore

## Qué incorpora esta versión

1. **Equipo y Capitán:** pueden registrar **Mi equipo**. El documento en `equipos/{UID}` contiene nombre, comuna, descripción, identificador del administrador y del capitán. El responsable aparece como capitán inicial. La ficha se puede consultar por los demás usuarios autenticados.
2. **Plantilla:** la subcolección `equipos/{UID}/integrantes/{UID_jugador}` contiene jugadores incorporados. **No** se genera una plantilla ficticia. La incorporación requiere solicitud aceptada, **confirmación expresa del jugador** y acción del responsable «Añadir jugador a mi plantilla».
3. **Designar capitán:** el responsable puede asignar como capitán a un integrante ya aceptado y visible en la plantilla. La regla comprueba que el UID designado corresponde a un miembro real.
4. **Directorio Equipos:** se puede buscar por nombre/comuna/capitán y abrir una ficha que muestra capitán y nombres de los integrantes. Un rival también tiene el acceso «Ver equipo rival y plantilla» desde un match aceptado.
5. **Jugador:** puede buscar equipos y consultar fichas; su flujo principal de postulación sigue siendo la vacante publicada por un Capitán.
6. **Capitán:** puede buscar jugadores que publicaron «Busco equipo», ver fichas y plantillas de otros clubes, registrar su equipo, publicar convocatorias y buscar rivales y canchas.
7. **Equipo:** puede buscar jugadores, rivales, canchas y otros equipos. Para incorporar a un jugador que publicó «Busco equipo», primero envía «Me interesa», el jugador acepta el contacto y **confirma su incorporación**.
8. **Match de rivales:** al aceptar la solicitud de contacto creada sobre un anuncio «Equipo busca rival», aparecen «Ver equipo rival y plantilla» y **«Buscar cancha para este match»**. El acuerdo de contacto no es una reserva ni un encuentro confirmado con resultado.
9. **Canchas:** el Dueño de cancha registra su recinto en la nueva colección `canchas` **al publicar su anuncio**, ambos documentos se escriben en una **única operación atómica**. Equipos y capitanes pueden consultar por comuna, modalidad y nombre y enviar una solicitud de contacto.
10. Las cuentas **Dueño de cancha** siguen limitadas a anunciar canchas, administrar sus anuncios y atender conversaciones. Las cuentas Jugador no pueden contactar canchas: permanecen centradas en equipos.

## Modelo de datos nuevo

| Colección / ruta | Función |
| --- | --- |
| `usuarios/{uid}` | Datos privados del perfil, región, comuna y tipo de cuenta (ya existente) |
| `equipos/{uid}` | Ficha pública para usuarios autenticados, propietario, nombre, capitán, descripción y comuna |
| `equipos/{uid}/integrantes/{uidJugador}` | Plantilla visible: nombre, UID y solicitud aceptada de origen |
| `canchas/{id}` | Registro de recinto, dueño, región/comuna, modalidad, anuncio de origen y descripción |
| `publicaciones/{id}` | Anuncios existentes con dos referencias nuevas `equipoId` y `canchaId` |
| `solicitudes/{id}` | Postulaciones y contactos, con nuevo consentimiento `incorporacionConfirmada` |
| `solicitudes/{id}/mensajes/{id}` | Conversaciones existentes sin cambios de funcionamiento |

**Migración:** los anuncios antiguos no tienen `equipoId` / `canchaId` ni una cancha registrada por separado. Continúan visibles y sus mensajes anteriores se conservan. Los nuevos encuentros, incorporaciones a plantilla y el catálogo de canchas requieren anuncios **nuevos**. Los dueños deben volver a anunciar las canchas antiguas para que aparezcan en `canchas`; se puede borrar el anuncio previo una vez comprobado el nuevo.

## Activación obligatoria en Firebase

1. Fusionar esta rama solo después de confirmar que GitHub Actions compila.
2. Sincronizar GitHub en VS Code.
3. Abrir Firebase Console → **Firestore Database → Reglas**.
4. Reemplazar el editor completo con **todo** `futmatch/firestore.rules` de la rama principal ya fusionada y presionar **Publicar**. Las colecciones nuevas quedarán denegadas por las reglas antiguas.
5. En la carpeta `futmatch`, ejecutar `npm ci`, `npm run build` y `npm run dev`.

No necesitas introducir documentos manuales en Firebase. Se guardan desde FutMatch cuando los usuarios crean sus fichas y anuncios. Este cambio de GitHub **no** escribe por sí mismo en tu proyecto Firebase.

## Prueba funcional entre cuentas

1. Capitán: abre Perfil y registra nombre de equipo, luego **Mi equipo → Registrar mi equipo**.
2. Capitán: crea una nueva publicación «Equipo busca jugadores». La nueva publicación debe incluir `equipoId`.
3. Jugador: encuentra esa vacante, presiona **Postular al equipo**, revisa Matches.
4. Capitán: recibe la postulación y pulsa **Aceptar contacto**.
5. Jugador: abre Matches, pulsa **Confirmar ingreso a la plantilla** (consentimiento para mostrarlo).
6. Capitán: en Matches, pulsa **Añadir jugador a mi plantilla**.
7. Capitán: abre **Mi equipo**. Debe aparecer el jugador en la subcolección `integrantes`. Si lo desea, puede designarlo como nuevo capitán.
8. Jugador o rival: abre **Equipos → Ver plantilla y capitán** y comprueba el nombre del jugador y el capitán.
9. Equipo: configura **Mi equipo**, encuentra una publicación «Busco equipo», pulsa «Me interesa»; el jugador acepta y confirma incorporación; después el equipo lo añade desde Matches.
10. Equipo A: publica «Equipo busca rival». Equipo B: tiene su propio equipo registrado y presiona «Me interesa» en el anuncio.
11. Equipo A: acepta la solicitud en Matches. Desde cualquiera de las dos cuentas, en Matches debe aparecer **Ver equipo rival y plantilla** y **Buscar cancha para este match**.
12. Dueño de cancha: publica un anuncio «Ofrezco cancha», el sistema debe crear **dos documentos en un batch**, en `publicaciones` y `canchas`.
13. Equipo A o B: entra a Buscar canchas, filtra por comuna y pulsa **Consultar cancha**. El dueño recibe la solicitud en Conversaciones y la acepta. Se habilita el chat.
14. Dueño: elimina el anuncio desde Mis canchas. El sistema elimina en batch tanto `publicaciones` como `canchas`. Las conversaciones previas no se eliminan.
15. Verificar en una cuenta ajena que no se puede editar la ficha o plantilla de otro equipo, agregar jugadores sin consentimiento, ni registrar canchas sin tener rol Dueño de cancha.

## Limitaciones explícitas

- Se admite **una ficha de equipo por cuenta administradora**. No existe transferencia de propiedad o administración compartida entre cuentas.
- El capitán es una persona identificada en la ficha del equipo. Designarlo no cambia su tipo de cuenta ni le transfiere automáticamente los permisos de administrador.
- La incorporación de jugadores es explícita en tres fases: solicitud aceptada, confirmación del jugador y acción de incorporación del responsable.
- Un jugador puede usar **Salir del equipo** desde su ficha. Esa acción elimina su registro de la plantilla y retira el consentimiento mediante un batch. El responsable no puede readmitirlo hasta que el propio jugador confirme de nuevo. El capitán actual debe dejar el cargo antes de salir.
- Editar el nombre del equipo no reescribe las publicaciones antiguas; los anuncios nuevos utilizarán el nombre vigente.
- El catálogo de `canchas` se alimenta con **nuevos anuncios**, no importa automáticamente los anuncios históricos.
- No hay reserva de cancha, pagos, confirmación de horario real ni gestión del resultado del partido.
- Los listados están limitados a 100 registros recientes; hay que añadir paginación si crece la comunidad.
- El rol indicado en el perfil es autodeclarado y no constituye verificación legal de representación o propiedad.
