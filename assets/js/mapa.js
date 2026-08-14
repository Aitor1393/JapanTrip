/* ============================================================
   mapa.js — mapa con Leaflet y búsqueda de coordenadas
   ------------------------------------------------------------
   Leaflet se descarga de un CDN la primera vez que hace falta, no al
   abrir la página: si nunca entras en el mapa, no se baja nada. Si el
   CDN no responde, el resto de la aplicación sigue funcionando y en el
   hueco del mapa aparece un aviso.

   Para poner en el mapa un hotel del que solo tenemos la dirección se
   usa Nominatim (el buscador de OpenStreetMap), y siempre pulsando un
   botón: no se manda ninguna dirección a ningún sitio por tu cuenta.
   ============================================================ */
(function (global) {
  'use strict';

  var M = {};

  var CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var TESELAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  var promesaCarga = null;
  var mapa = null;
  var capaPuntos = null;

  /** Descarga Leaflet una sola vez. */
  M.cargar = function () {
    if (global.L) return Promise.resolve(global.L);
    if (promesaCarga) return promesaCarga;

    promesaCarga = new Promise(function (resolver, rechazar) {
      var hoja = document.createElement('link');
      hoja.rel = 'stylesheet';
      hoja.href = CSS;
      document.head.appendChild(hoja);

      // Con una red que traga la petición sin contestar, el onerror no llega
      // nunca y el hueco del mapa se queda en blanco para siempre. Con el
      // plazo de espera al menos se dice qué ha pasado.
      var plazo = setTimeout(function () {
        promesaCarga = null;
        rechazar(new Error('El mapa tarda demasiado en cargar. Comprueba la conexión y vuelve a entrar.'));
      }, 12000);

      var guion = document.createElement('script');
      guion.src = JS;
      guion.onload = function () {
        clearTimeout(plazo);
        resolver(global.L);
      };
      guion.onerror = function () {
        clearTimeout(plazo);
        promesaCarga = null;
        rechazar(new Error('No se ha podido cargar el mapa. ¿Estás sin conexión?'));
      };
      document.head.appendChild(guion);
    });
    return promesaCarga;
  };

  /** Suelta el mapa anterior: al cambiar de vista el contenedor desaparece. */
  M.destruir = function () {
    if (mapa) {
      mapa.remove();
      mapa = null;
      capaPuntos = null;
    }
  };

  var COLORES = {
    vuelo: '#3d8bfd', tren: '#7c5cff', autobus: '#7c5cff', ferry: '#3d8bfd',
    coche: '#7c5cff', traslado: '#7c5cff', alojamiento: '#2fbf71',
    restaurante: '#f0a020', actividad: '#e8552f', lugar: '#e04f5f', otro: '#8b95a5'
  };

  function icono(L, punto) {
    var color = COLORES[punto.tipo] || COLORES.otro;
    return L.divIcon({
      className: 'punto-mapa',
      html: '<span class="punto-mapa__bola" style="background:' + color + '">' +
        (punto.icono || '📍') + '</span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
  }

  /**
   * Pinta los puntos en el contenedor indicado.
   * @param {HTMLElement} contenedor
   * @param {Array} puntos  [{lat, lon, titulo, subtitulo, tipo, icono}]
   */
  M.pintar = function (contenedor, puntos) {
    return M.cargar().then(function (L) {
      var validos = puntos.filter(function (p) {
        return typeof p.lat === 'number' && typeof p.lon === 'number';
      });

      if (!mapa || mapa._container !== contenedor) {
        M.destruir();
        mapa = L.map(contenedor, { scrollWheelZoom: false });
        L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19 }).addTo(mapa);
        // Con la rueda se hace zoom solo tras pinchar dentro: si no, bajar por
        // la página encima del mapa se convierte en un zoom accidental.
        mapa.on('click', function () { mapa.scrollWheelZoom.enable(); });
        mapa.on('mouseout', function () { mapa.scrollWheelZoom.disable(); });
      }

      if (capaPuntos) capaPuntos.remove();
      capaPuntos = L.layerGroup().addTo(mapa);

      validos.forEach(function (p) {
        var marca = L.marker([p.lat, p.lon], { icon: icono(L, p) }).addTo(capaPuntos);
        var html = '<strong>' + U.esc(p.titulo) + '</strong>' +
          (p.subtitulo ? '<br><span style="opacity:.7">' + U.esc(p.subtitulo) + '</span>' : '') +
          '<br><a href="' + U.enlaceMapa({ lat: p.lat, lon: p.lon }) +
          '" target="_blank" rel="noopener">Abrir en Google Maps</a>';
        marca.bindPopup(html);
      });

      if (validos.length === 1) {
        mapa.setView([validos[0].lat, validos[0].lon], 14);
      } else if (validos.length > 1) {
        mapa.fitBounds(validos.map(function (p) { return [p.lat, p.lon]; }), { padding: [40, 40] });
      } else {
        mapa.setView([36.2048, 138.2529], 5);   // Japón entero, por poner algo
      }

      // El contenedor acaba de aparecer y Leaflet necesita que le digan
      // que ya tiene tamaño para no dibujar las teselas a medias.
      setTimeout(function () { if (mapa) mapa.invalidateSize(); }, 60);
      return validos.length;
    });
  };

  /**
   * Busca las coordenadas de una dirección con Nominatim.
   * @returns {Promise<{lat:number, lon:number, nombre:string}>}
   */
  M.geocodificar = function (consulta) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(consulta);
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('El buscador de direcciones no responde (HTTP ' + r.status + ').');
        return r.json();
      })
      .then(function (resultados) {
        if (!resultados || !resultados.length) {
          throw new Error('No se ha encontrado esa dirección. Prueba con menos detalle.');
        }
        return {
          lat: Number(resultados[0].lat),
          lon: Number(resultados[0].lon),
          nombre: resultados[0].display_name || ''
        };
      });
  };

  /**
   * Saca coordenadas de lo que se pegue: un enlace de Google Maps o un
   * "35.6812, 139.7671" a pelo.
   */
  M.coordenadasDe = function (texto) {
    var s = String(texto || '');
    var m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s) ||           // .../@35.68,139.76,15z
            /[?&]query=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s) || // ...?query=35.68,139.76
            /[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s) ||
            /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/.exec(s);
    if (!m) return null;
    var lat = Number(m[1]), lon = Number(m[2]);
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat: lat, lon: lon };
  };

  global.M = M;
})(window);
