/* ============================================================
   parser.js — leer una confirmación pegada y sacar la reserva
   ------------------------------------------------------------
   Pegas el correo de la aerolínea, del hotel o de donde sea y esto
   intenta adivinar de qué reserva se trata y rellenar los campos.

   No pretende acertar siempre: lo que saca se enseña en un formulario
   para revisarlo antes de guardar. Por eso cada extracción es
   independiente y, cuando algo no está claro, se añade un aviso en vez
   de inventarse un valor.
   ============================================================ */
(function (global) {
  'use strict';

  var P = {};

  /* ══════════════════════════════════════════════════════════
     Fechas
     ══════════════════════════════════════════════════════════ */

  var MESES_TXT = {
    ene: 1, enero: 1, jan: 1, january: 1, january_: 1,
    feb: 2, febrero: 2, february: 2,
    mar: 3, marzo: 3, march: 3,
    abr: 4, abril: 4, apr: 4, april: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6, june: 6,
    jul: 7, julio: 7, july: 7,
    ago: 8, agosto: 8, aug: 8, august: 8,
    sep: 9, sept: 9, septiembre: 9, september: 9,
    oct: 10, octubre: 10, october: 10,
    nov: 11, noviembre: 11, november: 11,
    dic: 12, diciembre: 12, dec: 12, december: 12
  };

  function mesDeTexto(palabra) {
    var clave = U.normalizar(palabra).replace(/\.$/, '');
    if (MESES_TXT[clave]) return MESES_TXT[clave];
    // "septiembre" y "september" ya están; probamos con las 3 primeras letras.
    return MESES_TXT[clave.slice(0, 3)] || 0;
  }

  // Una dirección japonesa como «Ginza 8-2-10» tiene la misma pinta que una
  // fecha corta. Descartamos los años inverosímiles: un viaje se planifica
  // como mucho unos años antes y se apunta como mucho unos años después.
  var ANO_ACTUAL = new Date().getFullYear();
  var ANO_MIN = ANO_ACTUAL - 3;
  var ANO_MAX = ANO_ACTUAL + 7;

  function iso(ano, mes, dia) {
    if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
    if (ano < ANO_MIN || ano > ANO_MAX) return '';
    return ano + '-' + U.pad(mes) + '-' + U.pad(dia);
  }

  /** ¿La línea donde cae este índice parece una dirección postal? */
  function enLineaDeDireccion(texto, indice) {
    var ini = texto.lastIndexOf('\n', indice) + 1;
    var fin = texto.indexOf('\n', indice);
    var linea = texto.slice(ini, fin === -1 ? texto.length : fin);
    return /〒|\d{3}-\d{4}|chome|-ku\b|-shi\b|-cho\b|prefect|direcci[oó]n|address/i.test(linea);
  }

  function anoCompleto(bruto, anoPorDefecto) {
    var n = Number(bruto);
    if (!n) return anoPorDefecto;
    if (n < 100) return 2000 + n;
    return n;
  }

  /**
   * Busca todas las fechas del texto, en el orden en que aparecen.
   * Devuelve [{iso, indice, texto}].
   */
  function fechasEn(texto, anoPorDefecto) {
    var ano = anoPorDefecto || new Date().getFullYear();
    var encontradas = [];

    function anadir(indice, largo, valor, original) {
      if (!valor) return;
      encontradas.push({ iso: valor, indice: indice, fin: indice + largo, texto: original });
    }

    var m, re;

    // 2026-10-12
    re = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
    while ((m = re.exec(texto))) {
      anadir(m.index, m[0].length, iso(Number(m[1]), Number(m[2]), Number(m[3])), m[0]);
    }

    // 2026年10月12日
    re = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
    while ((m = re.exec(texto))) {
      anadir(m.index, m[0].length, iso(Number(m[1]), Number(m[2]), Number(m[3])), m[0]);
    }

    // 12 de octubre de 2026 · 12 Oct 2026 · 12 oct
    re = /\b(\d{1,2})\s*(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,10})\.?(?:\s+de)?\s*,?\s*(\d{2,4})?\b/g;
    while ((m = re.exec(texto))) {
      var mes = mesDeTexto(m[2]);
      if (!mes) continue;
      anadir(m.index, m[0].length, iso(anoCompleto(m[3], ano), mes, Number(m[1])), m[0]);
    }

    // October 12, 2026 · Oct 12
    re = /\b([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,10})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{2,4})?\b/g;
    while ((m = re.exec(texto))) {
      var mes2 = mesDeTexto(m[1]);
      if (!mes2) continue;
      anadir(m.index, m[0].length, iso(anoCompleto(m[3], ano), mes2, Number(m[2])), m[0]);
    }

    // 12/10/2026 · 12-10-26 · 12.10.2026 (por defecto día/mes, como aquí)
    re = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
    while ((m = re.exec(texto))) {
      if (enLineaDeDireccion(texto, m.index)) continue;
      var a = Number(m[1]), b = Number(m[2]);
      var dia, mes3;
      if (a > 12 && b <= 12) { dia = a; mes3 = b; }        // 25/12 solo cabe como día/mes
      else if (b > 12 && a <= 12) { dia = b; mes3 = a; }   // 12/25 es mes/día, formato de EE. UU.
      else { dia = a; mes3 = b; }                          // ambiguo: día/mes
      anadir(m.index, m[0].length, iso(anoCompleto(m[3], ano), mes3, dia), m[0]);
    }

    // Quitamos solapes: si dos patrones cogen el mismo trozo, gana el primero
    // que se encontró (el orden de arriba va de más fiable a más ambiguo).
    encontradas.sort(function (x, y) { return x.indice - y.indice; });
    var limpias = [];
    encontradas.forEach(function (f) {
      var choca = limpias.some(function (g) { return f.indice < g.fin && g.indice < f.fin; });
      if (!choca) limpias.push(f);
    });
    return limpias;
  }

  /**
   * Busca todas las horas del texto. Devuelve [{hm, indice}].
   */
  function horasEn(texto) {
    var encontradas = [];

    function anadir(indice, largo, h, min, sufijo) {
      var hora = Number(h), minuto = Number(min || 0);
      if (sufijo) {
        var s = U.normalizar(sufijo).replace(/\./g, '');
        if (s === 'pm' && hora < 12) hora += 12;
        if (s === 'am' && hora === 12) hora = 0;
      }
      if (hora > 23 || minuto > 59) return;
      encontradas.push({
        hm: U.pad(hora) + ':' + U.pad(minuto),
        indice: indice, fin: indice + largo
      });
    }

    var m, re;

    // 09:30 · 9:30 PM
    re = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/gi;
    while ((m = re.exec(texto))) anadir(m.index, m[0].length, m[1], m[2], m[3]);

    // 21h30 · 21 h
    re = /\b(\d{1,2})\s*h\s*(\d{2})?\b/gi;
    while ((m = re.exec(texto))) anadir(m.index, m[0].length, m[1], m[2], '');

    // 10時30分
    re = /(\d{1,2})時\s*(\d{1,2})?分?/g;
    while ((m = re.exec(texto))) anadir(m.index, m[0].length, m[1], m[2], '');

    // 9 PM (sin minutos)
    re = /\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/gi;
    while ((m = re.exec(texto))) anadir(m.index, m[0].length, m[1], 0, m[2]);

    encontradas.sort(function (x, y) { return x.indice - y.indice; });
    var limpias = [];
    encontradas.forEach(function (h) {
      var choca = limpias.some(function (g) { return h.indice < g.fin && g.indice < h.fin; });
      if (!choca) limpias.push(h);
    });
    return limpias;
  }

  /** Une día y hora en "2026-10-12T09:30" (sin hora, solo el día). */
  function instante(dia, hora) {
    if (!dia) return '';
    return hora ? dia + 'T' + hora : dia;
  }

  /* ══════════════════════════════════════════════════════════
     Números y dinero
     ══════════════════════════════════════════════════════════ */

  /**
   * "1.234,56" y "1,234.56" quieren decir lo mismo en sitios distintos.
   * El separador que manda es el último que aparece; si solo hay uno y le
   * siguen tres cifras, es de millares.
   */
  function aNumero(bruto) {
    var s = String(bruto).replace(/\s/g, '');
    var ultimaComa = s.lastIndexOf(',');
    var ultimoPunto = s.lastIndexOf('.');
    var decimal = Math.max(ultimaComa, ultimoPunto);

    if (decimal === -1) return Number(s) || 0;

    var traseros = s.length - decimal - 1;
    if (traseros === 3 && Math.min(ultimaComa, ultimoPunto) === -1) {
      // "12.000" o "1,500": separador de millares, no hay decimales.
      return Number(s.replace(/[.,]/g, '')) || 0;
    }
    var entera = s.slice(0, decimal).replace(/[.,]/g, '');
    var fraccion = s.slice(decimal + 1);
    return Number(entera + '.' + fraccion) || 0;
  }

  var MONEDAS = [
    { moneda: 'EUR', re: /(?:€|EUR|euros?)\s*([\d.,]+)|([\d.,]+)\s*(?:€|EUR\b|euros?)/gi },
    { moneda: 'JPY', re: /(?:¥|JPY|円)\s*([\d.,]+)|([\d.,]+)\s*(?:¥|JPY\b|円|yenes?)/gi },
    { moneda: 'USD', re: /(?:US\$|\$|USD)\s*([\d.,]+)|([\d.,]+)\s*(?:USD\b|d[oó]lares)/gi },
    { moneda: 'GBP', re: /(?:£|GBP)\s*([\d.,]+)|([\d.,]+)\s*(?:£|GBP\b)/gi }
  ];

  var RE_TOTAL = /(total|importe|precio|coste|a pagar|amount|price|charged|pagado|grand total)/i;

  /** Precio de la reserva: manda el que esté pegado a un "total". */
  function precioEn(texto) {
    var candidatos = [];
    MONEDAS.forEach(function (def) {
      var m, re = new RegExp(def.re.source, def.re.flags);
      while ((m = re.exec(texto))) {
        var bruto = m[1] || m[2];
        if (!bruto) continue;
        var cantidad = aNumero(bruto);
        if (!cantidad) continue;
        var antes = texto.slice(Math.max(0, m.index - 45), m.index);
        candidatos.push({
          cantidad: cantidad, moneda: def.moneda,
          esTotal: RE_TOTAL.test(antes)
        });
      }
    });
    if (!candidatos.length) return null;
    var totales = candidatos.filter(function (c) { return c.esTotal; });
    var lista = totales.length ? totales : candidatos;
    // Sin pista de "total", el importe mayor suele ser el del conjunto.
    return lista.sort(function (a, b) { return b.cantidad - a.cantidad; })[0];
  }

  /* ══════════════════════════════════════════════════════════
     Campos sueltos
     ══════════════════════════════════════════════════════════ */

  var RE_LOCALIZADOR = new RegExp(
    '(?:localizador|c[oó]digo de reserva|n[uú]mero de reserva|clave de reserva|' +
    'confirmation\\s*(?:code|number|no)|booking\\s*(?:reference|number|code|id)|' +
    'reservation\\s*(?:code|number|id)|reference|referencia|pnr|record locator)' +
    '\\s*(?:n[.º°]?\\s*)?[:#]?\\s*([A-Z0-9][A-Z0-9\\-]{3,19})', 'i');

  function localizadorEn(texto) {
    var m = RE_LOCALIZADOR.exec(texto);
    return m ? m[1].toUpperCase().replace(/[-]+$/, '') : '';
  }

  function personasEn(texto) {
    var m = /(\d+)\s*(?:adultos?|personas?|pasajeros?|hu[eé]spedes|viajeros?|guests?|adults?|pax|comensales)/i.exec(texto);
    return m ? Number(m[1]) : 0;
  }

  function terminalEn(texto) {
    var m = /terminal\s*[:#]?\s*([0-9]{1,2}[A-Z]?|[A-Z])\b/i.exec(texto);
    return m ? m[1].toUpperCase() : '';
  }

  function asientoEn(texto) {
    var m = /(?:asiento|seat|plaza)s?\s*[:#]?\s*(\d{1,3}\s*[A-F]|[A-F]\s*\d{1,3})/i.exec(texto);
    if (m) return m[1].replace(/\s+/g, '').toUpperCase();
    m = /(\d{1,2})番\s*([A-F])席/.exec(texto);
    return m ? m[1] + m[2] : '';
  }

  function cocheEn(texto) {
    var m = /(?:coche|vag[oó]n|car)\s*[:#]?\s*(\d{1,2})\b/i.exec(texto);
    if (m) return m[1];
    m = /(\d{1,2})号車/.exec(texto);
    return m ? m[1] : '';
  }

  /* ---------- Aeropuertos ---------- */

  // Palabras de tres letras en mayúsculas que también son códigos IATA y
  // aparecen a menudo en facturas en español. Sin esto, "SIN IVA" acabaría
  // convertido en una escala en Singapur.
  var FALSOS_IATA = ['SIN', 'CON', 'POR', 'DEL', 'LOS', 'LAS', 'MAS', 'TAN', 'SUR',
    'VIA', 'IVA', 'NIF', 'CIF', 'DNI', 'PDF', 'URL', 'WEB', 'TEL', 'FAX',
    'APP', 'ETA', 'ETD', 'ADT', 'CHD', 'INF', 'ECO', 'PRE', 'FIN', 'TOT', 'NUM'];

  /** Códigos de aeropuerto del texto, en orden. Los pares "MAD → HND" mandan. */
  function aeropuertosEn(texto) {
    var lista = [];
    function anadir(codigo, seguro) {
      var c = codigo.toUpperCase();
      if (!CAT.esAeropuerto(c)) return;
      if (!seguro && FALSOS_IATA.indexOf(c) !== -1) return;
      if (lista.indexOf(c) === -1) lista.push(c);
    }

    // MAD - HND · MAD → HND · MAD/HND
    var m, re = /\b([A-Z]{3})\s*(?:-|–|—|→|>|\/|a|to)\s*([A-Z]{3})\b/g;
    while ((m = re.exec(texto))) { anadir(m[1], true); anadir(m[2], true); }

    // Madrid (MAD)
    re = /\(([A-Z]{3})\)/g;
    while ((m = re.exec(texto))) anadir(m[1], true);

    // Sueltos
    re = /\b([A-Z]{3})\b/g;
    while ((m = re.exec(texto))) anadir(m[1], false);

    return lista;
  }

  function lugarDeAeropuerto(codigo) {
    var a = CAT.aeropuerto(codigo);
    if (!a) return null;
    return {
      nombre: a.nombre + ' (' + a.codigo + ')',
      codigo: a.codigo, ciudad: a.ciudad, lat: a.lat, lon: a.lon
    };
  }

  /* ---------- Estaciones ---------- */

  /** Estaciones conocidas que aparezcan en el texto, en orden de aparición. */
  function estacionesEn(texto) {
    var normal = U.normalizar(texto);
    var vistas = [];
    CAT.nombresEstacion().forEach(function (clave) {
      var pos = normal.indexOf(clave);
      if (pos === -1) return;
      // Que no sea parte de otra palabra ("nara" dentro de "narashino").
      var antes = normal.charAt(pos - 1), despues = normal.charAt(pos + clave.length);
      if (/[a-z0-9]/.test(antes) || /[a-z0-9]/.test(despues)) return;
      vistas.push({ pos: pos, clave: clave, largo: clave.length });
    });
    vistas.sort(function (a, b) { return a.pos - b.pos || b.largo - a.largo; });

    var lista = [], ocupado = [];
    vistas.forEach(function (v) {
      var choca = ocupado.some(function (o) { return v.pos < o.fin && o.ini < v.pos + v.largo; });
      if (choca) return;
      ocupado.push({ ini: v.pos, fin: v.pos + v.largo });
      var e = CAT.estacion(v.clave);
      if (e && !lista.some(function (x) { return x.nombre === e.nombre; })) lista.push(e);
    });
    return lista;
  }

  /* ---------- Vuelos ---------- */

  /** Números de vuelo con una compañía reconocida: [{codigo, numero, indice}]. */
  function vuelosEn(texto) {
    var lista = [];
    var m, re = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])[\s\-]?(\d{1,4})\b/g;
    while ((m = re.exec(texto))) {
      var codigo = m[1].toUpperCase();
      if (!CAT.aerolinea(codigo)) continue;
      lista.push({ codigo: codigo, numero: m[2], indice: m.index, texto: codigo + m[2] });
    }
    return lista;
  }

  /* ══════════════════════════════════════════════════════════
     Qué clase de reserva es
     ══════════════════════════════════════════════════════════ */

  var PISTAS = [
    ['vuelo', /\bvuelos?\b|\bflights?\b|aerol[ií]nea|airline|tarjeta de embarque|boarding pass|equipaje de mano|carry-?on|facturaci[oó]n|check-?in online|iberia|air europa|vueling|japan airlines|\bana\b|emirates|qatar airways|turkish|finnair|lufthansa|klm|ryanair/i, 3],
    ['alojamiento', /\bhotel\b|ryokan|hostal|hostel|\binn\b|guest ?house|apartamento|apartment|resort|booking\.com|airbnb|agoda|expedia|habitaci[oó]n|\broom\b|check-?in|check-?out|noches?\b|nights?\b|minshuku|alojamiento/i, 3],
    ['tren', /\btren\b|\btrain\b|shinkansen|jr ?pass|nozomi|hikari|kodama|hayabusa|mizuho|sakura|thunderbird|haruka|narita express|and[eé]n|platform|号車|ferrocarril|railway|\brail\b|renfe|smartex/i, 3],
    ['restaurante', /restaurante|restaurant|reserva de mesa|\bmesa\b|\btable\b|comensales|omakase|izakaya|kaiseki|sushi|ramen|men[uú] degustaci[oó]n|dinner reservation|cena para|almuerzo para/i, 3],
    ['actividad', /entradas?\b|tickets?\b|\btour\b|visita guiada|museo|museum|admission|actividad|experiencia|excursi[oó]n|pase de|park ticket|teamlab|universal studios|disney/i, 2],
    ['coche', /alquiler de coche|car rental|rent ?a ?car|toyota rent|nippon rent|times car|recogida del veh[ií]culo|pick-?up location|drop-?off|veh[ií]culo/i, 3],
    ['autobus', /autob[uú]s|\bbus\b|highway bus|willer|kintetsu bus|jr bus/i, 2],
    ['ferry', /\bferry\b|barco|crucero|cruise|naviera/i, 3],
    ['traslado', /traslado|transfer|\btaxi\b|shuttle|limousine bus|welcome pickups/i, 2]
  ];

  function detectarTipo(texto, pistas) {
    var puntos = {};
    PISTAS.forEach(function (p) {
      var coincidencias = texto.match(new RegExp(p[1].source, 'gi'));
      if (coincidencias) puntos[p[0]] = (puntos[p[0]] || 0) + coincidencias.length * p[2];
    });

    // Un número de vuelo con aerolínea conocida pesa más que cualquier palabra.
    if (pistas.vuelos.length) puntos.vuelo = (puntos.vuelo || 0) + 12;
    if (pistas.vuelos.length && pistas.aeropuertos.length >= 2) puntos.vuelo += 8;
    if (pistas.estaciones.length >= 2) puntos.tren = (puntos.tren || 0) + 6;

    var mejor = '', mejorPuntos = 0;
    Object.keys(puntos).forEach(function (tipo) {
      if (puntos[tipo] > mejorPuntos) { mejor = tipo; mejorPuntos = puntos[tipo]; }
    });
    return { tipo: mejor || 'otro', puntos: mejorPuntos };
  }

  /* ══════════════════════════════════════════════════════════
     Montaje por tipo
     ══════════════════════════════════════════════════════════ */

  function lineasDe(texto) {
    return texto.split(/\r?\n/).map(function (l) { return l.trim(); });
  }

  /** Primera línea con algo de sustancia, para usarla de título. */
  function tituloPorDefecto(texto) {
    var linea = lineasDe(texto).filter(function (l) {
      return l.length > 3 && !/^(de|para|asunto|from|to|subject|fecha|date)\s*:/i.test(l);
    })[0] || '';
    return U.recortar(linea.replace(/^[-*•\s]+/, ''), 70);
  }

  /**
   * Un correo de vuelos suele traer ida y vuelta, o varias escalas.
   * Partimos el texto en trozos, uno por número de vuelo, para poder
   * crear una reserva por trayecto.
   */
  function trozosDeVuelo(texto, vuelos) {
    if (vuelos.length <= 1) return [{ texto: texto, vuelo: vuelos[0] || null }];

    // Se reparte por líneas enteras: cada trayecto se queda con la línea de
    // su número de vuelo, un par de líneas por encima (donde suelen ir la
    // fecha y el aeropuerto de salida) y todo lo que venga detrás hasta el
    // siguiente vuelo. Así la ida y la vuelta no se pisan.
    var lineas = texto.split('\n');
    var finDeLinea = [];
    var acumulado = 0;
    lineas.forEach(function (l) {
      acumulado += l.length + 1;
      finDeLinea.push(acumulado);
    });

    function lineaDe(indice) {
      for (var i = 0; i < finDeLinea.length; i++) if (indice < finDeLinea[i]) return i;
      return lineas.length - 1;
    }

    var lineasVuelo = vuelos.map(function (v) { return lineaDe(v.indice); });

    // El trayecto empieza al principio de su párrafo: se sube desde el número
    // de vuelo hasta la línea en blanco anterior, sin llegar nunca a invadir
    // el vuelo de antes. Sirve tanto si la fecha va encima del número de vuelo
    // como si va debajo.
    var inicios = lineasVuelo.map(function (linea, i) {
      if (i === 0) return 0;
      var tope = lineasVuelo[i - 1] + 1;
      var inicio = linea;
      while (inicio > tope && lineas[inicio - 1].trim() !== '') inicio--;
      return inicio;
    });

    return vuelos.map(function (vuelo, i) {
      var desde = inicios[i];
      var hasta = i === vuelos.length - 1 ? lineas.length : Math.max(desde + 1, inicios[i + 1]);
      return { texto: lineas.slice(desde, hasta).join('\n'), vuelo: vuelo };
    });
  }

  function montarVuelos(texto, ano, comun) {
    var vuelos = vuelosEn(texto);
    var trozos = trozosDeVuelo(texto, vuelos);
    var avisos = [];
    var reservas = [];

    trozos.forEach(function (trozo, indice) {
      var fechas = fechasEn(trozo.texto, ano);
      var horas = horasEn(trozo.texto);
      var codigos = aeropuertosEn(trozo.texto);

      var origen = lugarDeAeropuerto(codigos[0]);
      var destino = lugarDeAeropuerto(codigos[1]);

      var diaSalida = fechas[0] ? fechas[0].iso : '';
      var diaLlegada = fechas[1] ? fechas[1].iso : diaSalida;
      var horaSalida = horas[0] ? horas[0].hm : '';
      var horaLlegada = horas[1] ? horas[1].hm : '';

      // Vuelo que aterriza al día siguiente: si no venía una segunda fecha y
      // la hora de llegada es anterior a la de salida, cae en el día de después.
      if (diaSalida && diaSalida === diaLlegada && horaSalida && horaLlegada &&
          horaLlegada < horaSalida) {
        diaLlegada = U.sumarDias(diaSalida, 1);
        avisos.push('El vuelo parece llegar al día siguiente; comprueba la fecha de llegada.');
      }

      var numero = trozo.vuelo ? trozo.vuelo.codigo + ' ' + trozo.vuelo.numero : '';
      var compania = trozo.vuelo ? CAT.aerolinea(trozo.vuelo.codigo) : '';
      var ruta = [origen && (origen.ciudad || origen.codigo), destino && (destino.ciudad || destino.codigo)]
        .filter(Boolean).join(' → ');

      reservas.push({
        tipo: 'vuelo',
        titulo: [numero, ruta].filter(Boolean).join(' · ') || tituloPorDefecto(texto),
        proveedor: compania,
        localizador: comun.localizador,
        inicio: instante(diaSalida, horaSalida),
        fin: instante(diaLlegada, horaLlegada),
        desde: origen,
        hasta: destino,
        // El importe del correo es el del billete entero: se lo apuntamos
        // solo al primer trayecto para no contarlo dos veces en los gastos.
        precio: indice === 0 ? comun.precio : null,
        detalles: {
          numeroVuelo: numero,
          terminal: terminalEn(trozo.texto),
          asiento: asientoEn(trozo.texto),
          personas: comun.personas || 0
        }
      });
    });

    if (reservas.length > 1) {
      avisos.push('Se han detectado ' + reservas.length + ' trayectos. El precio se ha puesto solo en el primero.');
    }
    return { reservas: reservas, avisos: avisos };
  }

  function montarAlojamiento(texto, ano, comun) {
    var lineas = lineasDe(texto);
    var avisos = [];

    // Fechas de entrada y salida: primero por la línea donde aparecen.
    function fechaEnLineasQue(re) {
      for (var i = 0; i < lineas.length; i++) {
        if (!re.test(lineas[i])) continue;
        var f = fechasEn(lineas[i], ano);
        if (f.length) {
          var h = horasEn(lineas[i].replace(f[0].texto, ''));
          return { dia: f[0].iso, hora: h.length ? h[0].hm : '' };
        }
        // A veces la fecha va en la línea de debajo del rótulo.
        if (lineas[i + 1]) {
          var f2 = fechasEn(lineas[i + 1], ano);
          if (f2.length) {
            var h2 = horasEn(lineas[i + 1].replace(f2[0].texto, ''));
            return { dia: f2[0].iso, hora: h2.length ? h2[0].hm : '' };
          }
        }
      }
      return null;
    }

    var entrada = fechaEnLineasQue(/check.?in|entrada|llegada|arrival|desde el/i);
    var salida = fechaEnLineasQue(/check.?out|salida|departure|hasta el/i);

    var todas = fechasEn(texto, ano);
    if (!entrada && todas[0]) entrada = { dia: todas[0].iso, hora: '' };
    if (!salida && todas[1]) salida = { dia: todas[1].iso, hora: '' };

    // "3 noches" cuadra la salida cuando el correo solo trae la entrada.
    var noches = /(\d+)\s*(?:noches?|nights?|泊)/i.exec(texto);
    if (entrada && !salida && noches) {
      salida = { dia: U.sumarDias(entrada.dia, Number(noches[1])), hora: '' };
    }
    if (entrada && salida && U.diasEntre(entrada.dia, salida.dia) <= 0) {
      avisos.push('La salida no es posterior a la entrada; revisa las fechas.');
    }

    // Nombre del alojamiento.
    var nombre = '';
    var etiquetado = /(?:hotel|alojamiento|propiedad|property|establecimiento)\s*[:]\s*(.+)/i.exec(texto);
    if (etiquetado) nombre = etiquetado[1].trim();
    if (!nombre) {
      nombre = lineas.filter(function (l) {
        return l.length > 3 && l.length < 80 &&
          /hotel|ryokan|hostal|hostel|\binn\b|guest ?house|apartamento|apartment|resort|lodge|minshuku|apa |toyoko|dormy|sunroute|villa|casa|studio/i.test(l) &&
          !/check.?in|check.?out|pol[ií]tica|cancelaci|incluye|desayuno incluido/i.test(l);
      })[0] || '';
    }
    if (!nombre) nombre = tituloPorDefecto(texto);

    // Dirección: código postal japonés, rótulo explícito o mención al país.
    var direccion = '';
    var postal = /〒\s*\d{3}-?\d{4}[^\n]*/.exec(texto);
    if (postal) direccion = postal[0].trim();
    if (!direccion) {
      var rotulo = /(?:direcci[oó]n|address|ubicaci[oó]n)\s*[:]\s*(.+)/i.exec(texto);
      if (rotulo) direccion = rotulo[1].trim();
    }
    if (!direccion) {
      direccion = lineas.filter(function (l) {
        return /\d/.test(l) && /jap[oó]n|japan|chome|-ku|-shi|prefect|tokyo|kyoto|osaka/i.test(l) && l.length < 120;
      })[0] || '';
    }

    // Que el nombre del hotel mencione "Shinjuku" no quiere decir que esté en
    // la estación, así que aquí no se inventan coordenadas: queda la dirección
    // y el botón de localizar del formulario pone el punto en el mapa.
    var ciudad = estacionesEn(nombre + ' ' + direccion)[0];

    return {
      reservas: [{
        tipo: 'alojamiento',
        titulo: U.recortar(nombre, 80),
        proveedor: /booking\.com/i.test(texto) ? 'Booking.com'
          : /airbnb/i.test(texto) ? 'Airbnb'
          : /agoda/i.test(texto) ? 'Agoda'
          : /expedia/i.test(texto) ? 'Expedia' : '',
        localizador: comun.localizador,
        inicio: entrada ? instante(entrada.dia, entrada.hora || '15:00') : '',
        fin: salida ? instante(salida.dia, salida.hora || '11:00') : '',
        desde: {
          nombre: U.recortar(nombre, 80),
          direccion: direccion,
          ciudad: ciudad ? ciudad.ciudad : '',
          lat: null, lon: null
        },
        hasta: null,
        precio: comun.precio,
        detalles: {
          direccion: direccion,
          habitacion: (/(?:habitaci[oó]n|room type|tipo de habitaci[oó]n)\s*[:]\s*(.+)/i.exec(texto) || [])[1] || '',
          personas: comun.personas || 0,
          noches: entrada && salida ? U.diasEntre(entrada.dia, salida.dia) : 0
        }
      }],
      avisos: avisos.concat(
        entrada && !entrada.hora ? ['Sin hora de entrada en el correo: se ha puesto las 15:00.'] : []
      )
    };
  }

  function montarTren(texto, ano, comun) {
    var fechas = fechasEn(texto, ano);
    var horas = horasEn(texto);
    var estaciones = estacionesEn(texto);
    var avisos = [];

    var nombreTren = '';
    Object.keys(CAT.TRENES).forEach(function (clave) {
      if (nombreTren) return;
      if (new RegExp('\\b' + clave + '\\b', 'i').test(texto)) nombreTren = CAT.TRENES[clave];
    });
    var numeroTren = new RegExp('(?:' + Object.keys(CAT.TRENES).join('|') + ')\\s*(\\d{1,4})', 'i').exec(texto);

    var origen = estaciones[0] || null;
    var destino = estaciones[1] || null;
    if (estaciones.length < 2) avisos.push('No se han reconocido las dos estaciones; complétalas a mano.');

    var ruta = [origen && origen.nombre, destino && destino.nombre].filter(Boolean).join(' → ');
    var etiqueta = [nombreTren, numeroTren && numeroTren[1]].filter(Boolean).join(' ');

    var dia = fechas[0] ? fechas[0].iso : '';
    var diaFin = fechas[1] ? fechas[1].iso : dia;
    var horaSalida = horas[0] ? horas[0].hm : '';
    var horaLlegada = horas[1] ? horas[1].hm : '';

    return {
      reservas: [{
        tipo: 'tren',
        titulo: [etiqueta, ruta].filter(Boolean).join(' · ') || tituloPorDefecto(texto),
        proveedor: /jr ?pass/i.test(texto) ? 'Japan Rail Pass' : (/\bjr\b/i.test(texto) ? 'JR' : ''),
        localizador: comun.localizador,
        inicio: instante(dia, horaSalida),
        fin: instante(diaFin, horaLlegada),
        desde: origen ? { nombre: origen.nombre, ciudad: origen.ciudad, lat: origen.lat, lon: origen.lon } : null,
        hasta: destino ? { nombre: destino.nombre, ciudad: destino.ciudad, lat: destino.lat, lon: destino.lon } : null,
        precio: comun.precio,
        detalles: {
          tren: etiqueta,
          coche: cocheEn(texto),
          asiento: asientoEn(texto),
          personas: comun.personas || 0
        }
      }],
      avisos: avisos
    };
  }

  function montarSimple(tipo, texto, ano, comun) {
    var fechas = fechasEn(texto, ano);
    var horas = horasEn(texto);
    var estaciones = estacionesEn(texto);
    var lineas = lineasDe(texto);

    var nombre = '';
    var rotulo = /(?:restaurante|lugar|sitio|venue|actividad|nombre|name)\s*[:]\s*(.+)/i.exec(texto);
    if (rotulo) nombre = rotulo[1].trim();
    if (!nombre) nombre = tituloPorDefecto(texto);

    var direccion = (/(?:direcci[oó]n|address)\s*[:]\s*(.+)/i.exec(texto) || [])[1] ||
      (/〒\s*\d{3}-?\d{4}[^\n]*/.exec(texto) || [])[0] || '';

    var dia = fechas[0] ? fechas[0].iso : '';

    // Una cena o una entrada ocurren a una hora, no duran del día 3 al 8: solo
    // los alquileres y los trayectos tienen fecha de fin, y aun así la segunda
    // fecha tiene que ser posterior a la primera para creérsela.
    var conRango = ['coche', 'ferry', 'autobus', 'traslado'].indexOf(tipo) !== -1;
    var diaFin = (conRango && fechas[1] && fechas[1].iso >= dia) ? fechas[1].iso : '';
    var ciudad = estaciones[0];

    return {
      reservas: [{
        tipo: tipo,
        titulo: U.recortar(nombre, 80),
        proveedor: '',
        localizador: comun.localizador,
        inicio: instante(dia, horas[0] ? horas[0].hm : ''),
        fin: diaFin ? instante(diaFin, horas[1] ? horas[1].hm : '') : '',
        desde: (nombre || direccion) ? {
          nombre: U.recortar(nombre, 80),
          direccion: direccion.trim(),
          ciudad: ciudad ? ciudad.ciudad : '',
          lat: null, lon: null
        } : null,
        hasta: null,
        precio: comun.precio,
        detalles: {
          direccion: direccion.trim(),
          personas: comun.personas || 0,
          notaLinea: lineas.filter(function (l) { return /(?:mesa|table|men[uú]|sala|planta)/i.test(l); })[0] || ''
        }
      }],
      avisos: dia ? [] : ['No se ha encontrado ninguna fecha; ponla a mano.']
    };
  }

  /* ══════════════════════════════════════════════════════════
     Punto de entrada
     ══════════════════════════════════════════════════════════ */

  /**
   * Analiza un texto pegado y devuelve una o varias reservas propuestas.
   *
   * @param {string} texto   contenido del correo o del billete
   * @param {object} [viaje] viaje activo, para saber de qué año hablamos
   * @returns {{reservas: Array, avisos: string[], tipo: string, confianza: number}}
   */
  P.analizar = function (texto, viaje) {
    var limpio = String(texto || '').replace(/ /g, ' ').trim();
    if (!limpio) {
      return { reservas: [], avisos: ['No has pegado nada.'], tipo: '', confianza: 0 };
    }

    // Sin año en el texto, mandan las fechas del viaje.
    var ano = new Date().getFullYear();
    if (viaje && viaje.inicio) ano = Number(viaje.inicio.slice(0, 4)) || ano;

    var pistas = {
      vuelos: vuelosEn(limpio),
      aeropuertos: aeropuertosEn(limpio),
      estaciones: estacionesEn(limpio)
    };
    var deteccion = detectarTipo(limpio, pistas);

    var comun = {
      localizador: localizadorEn(limpio),
      precio: precioEn(limpio),
      personas: personasEn(limpio)
    };

    var resultado;
    switch (deteccion.tipo) {
      case 'vuelo': resultado = montarVuelos(limpio, ano, comun); break;
      case 'alojamiento': resultado = montarAlojamiento(limpio, ano, comun); break;
      case 'tren': resultado = montarTren(limpio, ano, comun); break;
      default: resultado = montarSimple(deteccion.tipo, limpio, ano, comun); break;
    }

    // Cada reserva se queda con el texto original: si el parser se ha
    // equivocado en algo, el correo entero sigue estando a mano.
    resultado.reservas.forEach(function (r) {
      r.estado = 'confirmada';
      r.notas = '';
      r.textoOriginal = limpio;
      if (!r.titulo) r.titulo = 'Reserva sin título';
    });

    var avisos = resultado.avisos.slice();
    if (!comun.localizador) avisos.push('No se ha encontrado ningún localizador.');
    if (!comun.precio) avisos.push('No se ha encontrado ningún importe.');
    else if (/por persona|per person|c\/u|cada uno|por noche|per night/i.test(limpio)) {
      avisos.push('El importe podría ser por persona o por noche, no el total.');
    }
    if (viaje && viaje.inicio && viaje.fin) {
      resultado.reservas.forEach(function (r) {
        var dia = U.soloDia(r.inicio);
        if (dia && (dia < viaje.inicio || dia > viaje.fin)) {
          avisos.push('La fecha ' + U.fechaCorta(dia) + ' cae fuera de las fechas del viaje.');
        }
      });
    }

    return {
      reservas: resultado.reservas,
      avisos: avisos,
      tipo: deteccion.tipo,
      confianza: confianzaDe(resultado.reservas, deteccion)
    };
  };

  /** Nota de 0 a 100 según cuántos campos han salido rellenos. */
  function confianzaDe(reservas, deteccion) {
    if (!reservas.length) return 0;
    var r = reservas[0];
    var puntos = 0;
    if (deteccion.puntos >= 6) puntos += 25;
    else if (deteccion.puntos > 0) puntos += 12;
    if (r.inicio) puntos += 25;
    if (U.soloHora(r.inicio)) puntos += 10;
    if (r.fin) puntos += 10;
    if (r.localizador) puntos += 12;
    if (r.precio) puntos += 8;
    if (r.desde) puntos += 10;
    return Math.min(100, puntos);
  }

  /** Ejemplo para probar el importador sin tener un correo a mano. */
  P.EJEMPLO = [
    'Iberia — Confirmación de reserva',
    'Localizador: 7KQ4ZB',
    '',
    'Vuelo IB 6800   Madrid (MAD) → Tokio Narita (NRT)',
    'Salida: 12 de octubre de 2026, 12:05   Terminal 4S',
    'Llegada: 13 de octubre de 2026, 08:40',
    '',
    'Vuelo IB 6801   Tokio Narita (NRT) → Madrid (MAD)',
    'Salida: 26 de octubre de 2026, 10:35',
    'Llegada: 26 de octubre de 2026, 17:55',
    '',
    '2 pasajeros — Asiento 32A',
    'Total: 1.842,60 €'
  ].join('\n');

  global.P = P;
})(window);
