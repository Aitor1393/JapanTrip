# Mis viajes

Planificador de viajes personal: el itinerario día a día de Wanderlog con la
manía de TripIt de leer los correos de confirmación y colocar cada reserva en
su sitio. Hecho para el viaje a Japón, pero con varios viajes desde el primer
día: se cambia de uno a otro con el desplegable de la cabecera.

Sitio estático, sin servidor ni base de datos. Todo vive en
[`data/viajes.json`](data/viajes.json) y se publica con GitHub Pages.

## Qué hace

**Reservas.** Pegas el correo de confirmación en «Pegar confirmación» y se
intenta sacar de qué reserva se trata, las fechas, las horas, el localizador,
el precio y los aeropuertos o estaciones. Lo detectado se enseña en un
formulario para revisarlo antes de guardar; nada se guarda a tus espaldas.
Reconoce vuelos (incluidos los correos con ida, vuelta y escalas, que se
parten en un trayecto por reserva), hoteles, trenes, restaurantes, entradas,
alquileres de coche, autobuses y ferris. También se pueden meter a mano.

**Itinerario.** El día a día se calcula solo juntando las reservas con los
planes que añadas. Un vuelo aparece el día de salida y otra vez el de llegada,
un hotel pone su entrada y su salida y marca dónde duermes cada noche, y los
días sin nada se ven de un vistazo. Cada día admite una nota suelta (el botón
📝) para lo que no es un plan a una hora: «el jet lag juega a favor, os
despertaréis sobre las 5-6». Los planes sin hora van al final del día bajo el
rótulo «Sin hora fija», en el orden en que los metiste.

**Lugares.** La lista de lo que quieres ver, agrupada por ciudad, con
categorías y un catálogo de sugerencias de Japón con las coordenadas ya
puestas. Cualquier lugar se manda al itinerario al día que elijas.

**Mapa.** Todo lo que tenga coordenadas, sobre OpenStreetMap. Lo que no las
tenga sale en una lista aparte con un botón para buscarlas por la dirección.

**Gastos.** Presupuesto, reparto por categorías y conversión de yenes a euros.
Las reservas con precio ya cuentan, así que no hay que apuntarlas dos veces.

**Equipaje.** Lista con grupos y una plantilla para Japón.

**Pendientes.** Las tareas con fecha límite: reservar el shinkansen en cuanto
se abra la venta, comprar las entradas que se agotan, escribir al ryokan.
Agrupadas y con aviso en rojo cuando se pasa la fecha y siguen sin marcar.

## Dónde está publicado

<https://aitor1393.github.io/JapanTrip/>

Cada push a `main` lo publica el workflow `pages.yml`, que antes comprueba
que `data/viajes.json` sigue siendo JSON válido y que el JavaScript no tiene
errores de sintaxis.

Hacen falta dos ajustes en el repositorio, una sola vez:

1. **Settings → Pages → Source**: `GitHub Actions`.
2. **Settings → Environments → `github-pages` → Deployment branches and
   tags**: que `main` esté permitida. El entorno se crea con la rama por
   defecto que hubiera en ese momento, así que si se renombra después hay
   que actualizarlo o el trabajo se rechaza antes de arrancar.

## Cómo se usa

Los cambios se guardan al momento en el navegador que estés usando. Para que
queden en el repositorio —y para verlos desde el móvil— hay que pulsar
**Publicar**, que escribe `data/viajes.json` con la API de GitHub. Mientras
haya cambios sin publicar aparece un aviso en la parte de arriba.

### Configurar la publicación

1. Crea un token de acceso personal *de grano fino* en
   **GitHub → Settings → Developer settings → Fine-grained tokens**.
2. Dale acceso solo a este repositorio y solo al permiso
   **Contents: Read and write**. Nada más.
3. En **Ajustes → Publicar en GitHub**, pega el token y elige una contraseña.

El token se guarda **cifrado** (PBKDF2-SHA256 + AES-GCM) en el `localStorage`
de ese navegador y nunca se sube al repositorio. La contraseña es lo único que
lo descifra: sin ella no se puede publicar, y al recargar la página hay que
volver a escribirla. El cifrado necesita `https` o `localhost`.

Si prefieres no usar token, en **Ajustes → Copias de seguridad** puedes
descargar el JSON y subirlo tú al repositorio.

### En local

```sh
python3 -m http.server 8000
```

y abre <http://localhost:8000>.

## Cómo está montado

JavaScript sin dependencias ni compilación, salvo Leaflet, que se descarga de
un CDN la primera vez que entras en el mapa. Si no entras nunca, no se baja.

| Fichero | Para qué |
| --- | --- |
| `assets/js/util.js` | Fechas, dinero, textos, modal y almacenamiento local |
| `assets/js/catalogo.js` | Aeropuertos, estaciones, aerolíneas y sugerencias |
| `assets/js/datos.js` | Modelo de datos, viajes, colecciones e itinerario |
| `assets/js/parser.js` | Leer una confirmación pegada y sacar la reserva |
| `assets/js/mapa.js` | Leaflet y búsqueda de coordenadas |
| `assets/js/vistas.js` | Cada pantalla |
| `assets/js/formularios.js` | Los modales de crear y editar |
| `assets/js/app.js` | Navegación, acciones y publicación |
| `assets/js/cripto.js` | Cifrado del token |
| `assets/js/github.js` | API de contenidos de GitHub |

### Cómo se guardan las fechas

En hora local del destino y sin zona horaria: `2026-10-12T09:30`. Un billete
pone la hora del reloj de allí y eso es lo que interesa ver. Por eso un vuelo
de Madrid a Tokio sale a las 12:05 y llega a las 08:40 del día siguiente, sin
que la aplicación tenga que saber nada de husos.

### Qué hace el parser cuando duda

Nunca se inventa un dato. Si no encuentra el localizador o el importe, lo dice
en un aviso en vez de rellenarlo a ojo. Cuando algo es ambiguo avisa también:
un vuelo que parece llegar al día siguiente, un precio que puede ser por
persona, o una fecha que cae fuera de las fechas del viaje. Las direcciones
japonesas del tipo `Ginza 8-2-10` se parecen mucho a una fecha, así que se
descartan las fechas con años inverosímiles y las que caen en una línea con
pinta de dirección postal.

Lo que no reconoce se guarda igualmente como reserva genérica, y el correo
original se queda con la reserva: el botón «Ver el correo» lo enseña entero
por si el parser se comió algo.

### Dónde se busca fuera

- **unpkg.com** — Leaflet, solo al abrir el mapa.
- **tile.openstreetmap.org** — las teselas del mapa.
- **nominatim.openstreetmap.org** — buscar las coordenadas de una dirección,
  solo cuando pulsas «Localizar» o «buscar por la dirección».
- **api.github.com** — al publicar.

Nada más sale de tu navegador.

## El viaje que viene cargado

`data/viajes.json` trae el itinerario de **Tokio, 30 nov – 15 dic de 2026**
volcado desde `TOKIO_V6.docx`: los dos vuelos, los cuatro alojamientos, los
92 planes repartidos por los 16 días, las 22 tareas pendientes con sus fechas
y las notas de logística.

Cosas que quedaron a medias a propósito, porque el documento no las decía:

- **Las horas de entrada y salida de los hoteles** son las de siempre (15:00 y
  11:00) salvo el check-out de Takimikan, que sí venía puesto a las 10:00.
- **Los hoteles no tienen coordenadas.** El documento da el nombre, no la
  dirección, y no se inventan: en **Mapa → Sin situar** hay un botón
  «Localizar» que las busca por el nombre.
- **El tour del Fuji está apuntado a 13.000 ¥**, que es el precio *por
  persona*. En cuanto sepas cuántos vais, multiplícalo.
- **Los vuelos no llevan precio ni localizador**, que no venían en el
  documento.
- **El presupuesto está a cero** y el cambio del yen a 0,0058 €, que es
  orientativo y se queda viejo enseguida. Los dos se cambian en
  **Viajes → Editar**.

Las cuatro reservas todavía sin cerrar (tour del Fuji, Shibuya Sky, TeamLab
Planets y el bus de Gotemba) están metidas como **sin confirmar**, así que
salen en el itinerario con su aviso pero no cuentan como cerradas.
