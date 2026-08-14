/* ============================================================
   util.js — utilidades comunes (sin dependencias)
   ============================================================ */
(function (global) {
  'use strict';

  var U = {};

  /* ---------- Texto ---------- */

  /** Escapa HTML para poder interpolar texto de usuario sin riesgo. */
  U.esc = function (valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Normaliza para búsquedas: minúsculas y sin acentos. */
  U.normalizar = function (texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  };

  U.plural = function (n, singular, plural) {
    return n + ' ' + (n === 1 ? singular : (plural || singular + 's'));
  };

  U.mayus1 = function (texto) {
    var t = String(texto || '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  /** Recorta un texto largo añadiendo puntos suspensivos. */
  U.recortar = function (texto, max) {
    var t = String(texto || '').trim();
    return t.length > max ? t.slice(0, max - 1).trim() + '…' : t;
  };

  /* ---------- Identificadores ---------- */

  U.id = function () {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  };

  /** Identificador legible a partir de un texto: "Japón 2026" -> "japon-2026". */
  U.babosa = function (texto) {
    return U.normalizar(texto)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'viaje';
  };

  /* ---------- Fechas ----------
     Todo se guarda en horario local del destino, sin zona horaria: las
     reservas de un viaje se leen siempre en la hora que pone el billete.
     Las fechas son "2026-10-01" y los instantes "2026-10-01T09:30".      */

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  U.MESES = MESES;

  /** "2026-10-01" o "2026-10-01T09:30" -> Date local (sin desfase de zona). */
  U.aFecha = function (iso) {
    if (!iso) return null;
    var s = String(iso);
    var p = s.slice(0, 10).split('-');
    if (p.length !== 3) return null;
    var hm = s.length > 10 ? s.slice(11, 16).split(':') : ['0', '0'];
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]),
      Number(hm[0]) || 0, Number(hm[1]) || 0);
    return isNaN(d.getTime()) ? null : d;
  };

  /** Solo la parte de día: "2026-10-01T09:30" -> "2026-10-01". */
  U.soloDia = function (iso) { return iso ? String(iso).slice(0, 10) : ''; };

  /** Solo la hora: "2026-10-01T09:30" -> "09:30" (vacío si no la lleva). */
  U.soloHora = function (iso) {
    var s = String(iso || '');
    return s.length > 10 ? s.slice(11, 16) : '';
  };

  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };

  U.aIso = function (fecha) {
    return fecha.getFullYear() + '-' + U.pad(fecha.getMonth() + 1) + '-' + U.pad(fecha.getDate());
  };

  U.hoy = function () {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  U.isoHoy = function () { return U.aIso(new Date()); };

  /** Suma días a una fecha ISO y devuelve otra fecha ISO. */
  U.sumarDias = function (iso, dias) {
    var d = U.aFecha(iso);
    if (!d) return '';
    d.setDate(d.getDate() + dias);
    return U.aIso(d);
  };

  /** Días de diferencia entre dos fechas ISO (b - a). */
  U.diasEntre = function (isoA, isoB) {
    var a = U.aFecha(U.soloDia(isoA));
    var b = U.aFecha(U.soloDia(isoB));
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };

  /** Lista de fechas ISO desde inicio hasta fin, ambas incluidas. */
  U.rangoDias = function (inicio, fin) {
    var dias = [];
    var total = U.diasEntre(inicio, fin);
    if (total === null || total < 0) return dias;
    for (var i = 0; i <= Math.min(total, 400); i++) dias.push(U.sumarDias(inicio, i));
    return dias;
  };

  /** "1 de octubre de 2026" */
  U.fechaLarga = function (iso) {
    var d = U.aFecha(iso);
    if (!d) return '—';
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  };

  /** "1 oct 2026" */
  U.fechaCorta = function (iso) {
    var d = U.aFecha(iso);
    if (!d) return '—';
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  };

  /** "jueves, 1 de octubre" */
  U.fechaDia = function (iso) {
    var d = U.aFecha(iso);
    if (!d) return '—';
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  };

  /** "jue" */
  U.diaCorto = function (iso) {
    var d = U.aFecha(iso);
    return d ? DIAS[d.getDay()].slice(0, 3) : '';
  };

  /** "Octubre 2026" — clave para agrupar por mes. */
  U.mesLargo = function (iso) {
    var d = U.aFecha(iso);
    if (!d) return 'Sin fecha';
    return U.mayus1(MESES[d.getMonth()]) + ' ' + d.getFullYear();
  };

  /** "1–7 de octubre de 2026" / "28 sep – 3 oct 2026" */
  U.rangoTexto = function (inicio, fin) {
    var a = U.aFecha(inicio), b = U.aFecha(fin);
    if (!a) return '—';
    if (!b) return U.fechaLarga(inicio);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
      return a.getDate() + '–' + b.getDate() + ' de ' + MESES[a.getMonth()] + ' de ' + a.getFullYear();
    }
    if (a.getFullYear() === b.getFullYear()) {
      return a.getDate() + ' ' + MESES[a.getMonth()].slice(0, 3) + ' – ' +
        b.getDate() + ' ' + MESES[b.getMonth()].slice(0, 3) + ' ' + a.getFullYear();
    }
    return U.fechaCorta(inicio) + ' – ' + U.fechaCorta(fin);
  };

  /** Días desde hoy: negativo = pasado. */
  U.diasHasta = function (iso) { return U.diasEntre(U.isoHoy(), iso); };

  /** "en 12 días" / "mañana" / "hace 3 meses" */
  U.cuando = function (iso) {
    var dias = U.diasHasta(iso);
    if (dias === null) return 'sin fecha';
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    if (dias === -1) return 'ayer';
    var n = Math.abs(dias);
    var cantidad = n < 45 ? U.plural(n, 'día')
      : n < 365 ? U.plural(Math.round(n / 30), 'mes', 'meses')
      : U.plural(Math.round(n / 365), 'año');
    return (dias > 0 ? 'en ' : 'hace ') + cantidad;
  };

  /** Duración entre dos instantes: "2 h 35 min". */
  U.duracion = function (isoA, isoB) {
    var a = U.aFecha(isoA), b = U.aFecha(isoB);
    if (!a || !b) return '';
    var min = Math.round((b - a) / 60000);
    if (min <= 0) return '';
    var h = Math.floor(min / 60), m = min % 60;
    if (h >= 24) {
      var d = Math.floor(h / 24);
      return U.plural(d, 'día') + (h % 24 ? ' ' + (h % 24) + ' h' : '');
    }
    return (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : '') || '0 min';
  };

  /* ---------- Números y dinero ---------- */

  var SIMBOLOS = { EUR: '€', JPY: '¥', USD: '$', GBP: '£', KRW: '₩', CHF: 'CHF' };

  U.simbolo = function (moneda) { return SIMBOLOS[moneda] || (moneda || ''); };

  /** Importe formateado: 1234.5, "EUR" -> "1.234,50 €"; los yenes sin decimales. */
  U.dinero = function (cantidad, moneda) {
    var num = Number(cantidad) || 0;
    var mon = moneda || 'EUR';
    var decimales = (mon === 'JPY' || mon === 'KRW') ? 0 : 2;
    var texto = num.toFixed(decimales);
    var partes = texto.split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var unido = partes.join(',');
    return mon === 'JPY' || mon === 'KRW' || mon === 'USD' || mon === 'GBP'
      ? U.simbolo(mon) + unido
      : unido + ' ' + U.simbolo(mon);
  };

  U.porcentaje = function (parte, total) {
    if (!total) return 0;
    return Math.round((parte / total) * 100);
  };

  /* ---------- DOM ---------- */

  U.$ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  U.$$ = function (sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  };

  /** Notificación efímera en la esquina. tipo: 'ok' | 'error' | '' */
  U.aviso = function (mensaje, tipo) {
    var cont = document.getElementById('notificaciones');
    if (!cont) return;
    var nodo = document.createElement('div');
    nodo.className = 'nota' + (tipo ? ' nota--' + tipo : '');
    nodo.textContent = mensaje;
    cont.appendChild(nodo);
    setTimeout(function () {
      nodo.style.transition = 'opacity .3s';
      nodo.style.opacity = '0';
      setTimeout(function () { nodo.remove(); }, 300);
    }, 3600);
  };

  /* ---------- Modal ---------- */

  U.abrirModal = function (html, ancho) {
    var modal = document.getElementById('modal');
    var caja = U.$('.modal__caja', modal);
    caja.classList.toggle('modal__caja--ancha', ancho === 'ancha');
    document.getElementById('modalContenido').innerHTML = html;
    modal.classList.remove('oculto');
    document.body.style.overflow = 'hidden';
    var primero = U.$('input, textarea, select', modal);
    if (primero) setTimeout(function () { primero.focus(); }, 40);
    return modal;
  };

  U.cerrarModal = function () {
    document.getElementById('modal').classList.add('oculto');
    document.getElementById('modalContenido').innerHTML = '';
    document.body.style.overflow = '';
  };

  U.modalAbierto = function () {
    return !document.getElementById('modal').classList.contains('oculto');
  };

  /** Confirmación en modal. Devuelve una promesa con true/false. */
  U.confirmar = function (titulo, mensaje, textoBoton) {
    return new Promise(function (resolver) {
      U.abrirModal(
        '<h2>' + U.esc(titulo) + '</h2>' +
        '<p class="apagado">' + U.esc(mensaje) + '</p>' +
        '<div class="formulario__botones">' +
        '  <button class="btn btn--fantasma" data-cancelar>Cancelar</button>' +
        '  <button class="btn btn--peligro" data-aceptar>' + U.esc(textoBoton || 'Borrar') + '</button>' +
        '</div>'
      );
      var cont = document.getElementById('modalContenido');
      U.$('[data-cancelar]', cont).onclick = function () { U.cerrarModal(); resolver(false); };
      U.$('[data-aceptar]', cont).onclick = function () { U.cerrarModal(); resolver(true); };
    });
  };

  /* ---------- Almacenamiento local (tolerante a fallos) ---------- */

  U.guardarLocal = function (clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
      return false;
    }
  };

  U.leerLocal = function (clave, porDefecto) {
    try {
      var bruto = localStorage.getItem(clave);
      return bruto === null ? porDefecto : JSON.parse(bruto);
    } catch (e) {
      return porDefecto;
    }
  };

  U.borrarLocal = function (clave) {
    try { localStorage.removeItem(clave); } catch (e) { /* ignorado */ }
  };

  /* ---------- Ficheros ---------- */

  U.descargarJSON = function (nombre, datos) {
    var blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  U.leerFichero = function (fichero) {
    return new Promise(function (resolver, rechazar) {
      var lector = new FileReader();
      lector.onload = function () { resolver(lector.result); };
      lector.onerror = function () { rechazar(new Error('No se pudo leer el fichero.')); };
      lector.readAsText(fichero);
    });
  };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 300);
    };
  };

  /** Ordena por una clave calculada; los vacíos van al final. */
  U.ordenarPor = function (lista, clave) {
    return lista.slice().sort(function (a, b) {
      var va = clave(a), vb = clave(b);
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
  };

  /** Agrupa una lista en un objeto {clave: [elementos]} conservando el orden. */
  U.agrupar = function (lista, clave) {
    var mapa = {};
    lista.forEach(function (item) {
      var k = clave(item);
      (mapa[k] = mapa[k] || []).push(item);
    });
    return mapa;
  };

  /** Enlace a Google Maps por coordenadas o por búsqueda de texto. */
  U.enlaceMapa = function (lugar) {
    if (!lugar) return '';
    if (lugar.lat && lugar.lon) {
      return 'https://www.google.com/maps/search/?api=1&query=' + lugar.lat + ',' + lugar.lon;
    }
    var texto = [lugar.nombre, lugar.direccion].filter(Boolean).join(' ');
    if (!texto) return '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(texto);
  };

  global.U = U;
})(window);
