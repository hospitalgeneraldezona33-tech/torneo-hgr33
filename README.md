# PLATAFORMA V3.1 — TORNEO DE FÚTBOL HGR No. 33

## Esta es la versión institucional ampliada

## CORRECCIONES APLICADAS SOBRE LA V3

Se revisó el código contra el Reglamento oficial del torneo y se corrigieron los siguientes puntos:

1. **Roster mínimo/máximo.** El formulario aceptaba equipos desde 4 jugadores y sin tope máximo. El Reglamento (punto 6) exige mínimo 10 y máximo 15. Ahora `app.js` valida ese rango y la interfaz muestra un contador (`X / 15 jugadores`) y bloquea el botón "Agregar jugador" al llegar a 15.
2. **Fotografías que podían mezclarse entre jugadores.** Las fotos se guardaban en Storage usando la *posición* del jugador en la lista (1, 2, 3...). Al eliminar un jugador de en medio del roster y reordenarse la lista, la foto de un jugador podía terminar sobreescribiendo o mostrándose en el lugar de otro. Se corrigió asignando un identificador único y estable a cada jugador (`pid`) que se usa como nombre de archivo en Storage y se conserva aunque se reordene el roster.
3. **Folios duplicados.** El folio (`HGR33-VAR-001`, etc.) se generaba con un contador guardado en `localStorage`, es decir, local a cada navegador/dispositivo. Dos capitanes registrándose desde equipos distintos podían recibir el mismo folio. Ahora el folio se asigna con una transacción de Firestore (`/counters/VAR` y `/counters/FEM`), que garantiza folios consecutivos y sin duplicados sin importar desde dónde se registre cada equipo.
4. **Un capitán podía auto-validar su inscripción.** Las reglas de Firestore solo verificaban que el dueño del documento fuera quien editaba, pero no impedían que, escribiendo directamente a la base de datos (sin pasar por la interfaz), un capitán cambiara el campo `status` a `VALIDADO`, alterara su `folio` o borrara la observación del administrador. Se corrigieron `firestore.rules` para que el capitán solo pueda dejar su equipo en `BORRADOR` o `PENDIENTE DE VALIDACIÓN`, sin tocar el folio ni los campos de validación; solo una cuenta de `admins` puede validar, rechazar o anotar observaciones.
5. **Edición después de validado.** Si un capitán editaba su equipo después de haber sido validado, el cambio quedaba guardado como "VALIDADO" sin que el administrador lo revisara de nuevo. Ahora, si el equipo estaba validado y el capitán guarda cambios, el estado regresa automáticamente a "PENDIENTE DE VALIDACIÓN".
6. **Duplicados dentro del propio roster.** Se agregó validación para detectar matrículas/ID o dorsales repetidos entre los jugadores de un mismo equipo antes de guardar.
7. **Reglamento no estaba disponible dentro de la plataforma.** La casilla "Acepto el Reglamento" no tenía un lugar donde leerlo. Se agregó `reglamento.html` con el texto completo del Reglamento oficial, enlazado desde el formulario y el pie de página.
8. Se agregó una descripción meta a `index.html` para mejorar cómo se ve el enlace al compartirse.

### Capitán
- Crear cuenta con correo y contraseña.
- Iniciar sesión.
- Recuperar contraseña.
- Registrar equipo Varonil/Femenil.
- Registrar datos del capitán.
- Registrar roster.
- Subir fotografía de cada jugador.
- Guardar como borrador.
- Actualizar información.
- Enviar a validación.
- Consultar folio y estado.
- Consultar observación del administrador.

### Administrador
- Acceso protegido.
- Panel con estadísticas.
- Buscar por equipo, capitán, matrícula o folio.
- Filtrar por categoría y estado.
- Revisar roster y fotografías.
- Validar equipo.
- Rechazar equipo con motivo.
- Imprimir roster.
- Descargar Excel.

## IMPORTANTE: GitHub + Firebase

Sí se puede publicar en GitHub Pages. GitHub aloja el HTML/CSS/JS y Firebase maneja autenticación, base de datos y fotografías.

GitHub Pages por sí solo NO debe manejar contraseñas ni almacenar fotografías.

## CONFIGURACIÓN PASO A PASO

1. Crea un proyecto en Firebase.
2. Agrega una aplicación Web.
3. Copia la configuración de Firebase en:
   `public/firebase-config.js`
4. En Firebase Authentication habilita:
   Authentication > Sign-in method > Email/Password
5. Crea Firestore Database.
6. Crea Storage.
7. Publica `firestore.rules`.
8. Publica `storage.rules`.
9. Crea una cuenta de administrador en Authentication.
10. Copia el UID de esa cuenta.
11. En Firestore crea:
    `admins`
    y dentro un documento con el ID = UID del administrador (el contenido del documento puede quedar vacío, solo importa que exista).
12. La colección `counters` (usada para folios consecutivos) se crea sola la primera vez que un capitán guarda su inscripción; no requiere configuración manual.
13. Sube el contenido de este repositorio a GitHub (o solo la carpeta `public/`, según cómo configures Pages).
14. Activa GitHub Pages apuntando a la carpeta que contiene `index.html`.

## ARCHIVOS

- `index.html` = inscripción de capitanes.
- `admin.html` = panel de administración.
- `app.js` = lógica del capitán.
- `admin.js` = lógica del administrador.
- `firebase-config.js` = configuración Firebase.
- `aviso-privacidad.html` = modelo inicial de aviso.
- `firestore.rules` = seguridad de base de datos.
- `storage.rules` = seguridad de fotografías.
- `styles.css` = diseño responsive.
- `reglamento.html` = texto oficial del reglamento del torneo.

## FOLIOS

La interfaz genera folios del tipo:
- HGR33-VAR-001
- HGR33-FEM-001

El folio se asigna mediante una transacción de Firestore (`/counters/VAR` y `/counters/FEM`), por lo que es consecutivo y sin duplicados sin importar cuántos capitanes se registren al mismo tiempo desde distintos dispositivos.

## EXCEL

El administrador puede descargar:
`Inscripciones_Torneo_HGR33.xlsx`

Incluye una fila por jugador:
Folio, Estado, Equipo, Categoría, Capitán, ID, Área, Teléfono, Jugador, ID del jugador, Área, Dorsal y URL de fotografía.

## RECOMENDACIÓN INSTITUCIONAL

Antes de recopilar datos y fotografías de trabajadores, el aviso de privacidad debe ser revisado y autorizado por las áreas institucionales correspondientes.

## V4 RECOMENDADA (pendiente, no incluido en esta versión)

- Control de límite total de equipos aceptados (cupo limitado, según el póster del torneo).
- Validación individual de cada jugador (no solo del equipo completo).
- Estados por jugador.
- QR individual.
- Generación de credencial/roster con QR.
- Bitácora de modificaciones (quién y cuándo validó/rechazó).
- Eliminar del Storage la fotografía de un jugador cuando se borra su fila del roster (hoy el archivo permanece huérfano en Storage aunque ya no aparezca en el roster).
- Respaldo automático.
- Dashboard con gráficas.
