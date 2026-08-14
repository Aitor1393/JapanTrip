/* ============================================================
   datos.js — modelo de datos y almacenamiento
   ------------------------------------------------------------
   El fichero data/viajes.json del repositorio es la copia buena.
   Al editar, los cambios se guardan primero en el localStorage de
   este navegador (así puedes trastear sin publicar nada) y el botón
   "Publicar" los sube al repo mediante la API de GitHub.
   ============================================================ */
(function (global) {
  'use strict';

  var D = {};

  D.RUTA_JSON = 'data/viajes.json';
  D.VERSION = 1;
  var CLAVE_LOCAL = 'jt:datos';
  var CLAVE_BASE = 'jt:base';       // copia de lo publicado, para saber si hay cambios

  /* ---------- Catálogo de tipos ---------- */

  D.TIPOS = {
    vuelo:       { etiqueta: 'Vuelo',        icono: '✈️', color: 'azul',    tramo: true },
    tren:        { etiqueta: 'Tren',         icono: '🚄', color: 'violeta', tramo: true },
    autobus:     { etiqueta: 'Autobús',      icono: '🚌', color: 'violeta', tramo: true },
    ferry:       { etiqueta: 'Ferry',        icono: '⛴️', color: 'azul',    tramo: true },
    coche:       { etiqueta: 'Coche',        icono: '🚗', color: 'violeta', tramo: true },
    traslado:    { etiqueta: 'Traslado',     icono: '🚕', color: 'violeta', tramo: true },
    alojamiento: { etiqueta: 'Alojamiento',  icono: '🏨', color: 'verde',   estancia: true },
    restaurante: { etiqueta: 'Restaurante',  icono: '🍜', color: 'ambar' },
    actividad:   { etiqueta: 'Actividad',    icono: '🎟️', color: 'rosa' },
    otro:        { etiqueta: 'Otro',         icono: '📌', color: 'gris' }
  };

  D.CATEGORIAS_LUGAR = {
    imprescindible: { etiqueta: 'Imprescindible', icono: '⭐' },
    templo:         { etiqueta: 'Templo o santuario', icono: '⛩️' },
    museo:          { etiqueta: 'Museo', icono: '🏛️' },
    comida:         { etiqueta: 'Comer', icono: '🍽️' },
    compras:        { etiqueta: 'Compras', icono: '🛍️' },
    naturaleza:     { etiqueta: 'Naturaleza', icono: '🌿' },
    mirador:        { etiqueta: 'Mirador', icono: '🌇' },
    barrio:         { etiqueta: 'Barrio o zona', icono: '🏙️' },
    otro:           { etiqueta: 'Otro', icono: '📍' }
  };

  D.CATEGORIAS_GASTO = {
    transporte:  { etiqueta: 'Transporte', icono: '🚄' },
    alojamiento: { etiqueta: 'Alojamiento', icono: '🏨' },
    comida:      { etiqueta: 'Comida', icono: '🍜' },
    actividades: { etiqueta: 'Actividades', icono: '🎟️' },
    compras:     { etiqueta: 'Compras', icono: '🛍️' },
    otro:        { etiqueta: 'Otro', icono: '💴' }
  };

  D.tipo = function (clave) { return D.TIPOS[clave] || D.TIPOS.otro; };

  /* ---------- Estado en memoria ---------- */

  var datos = null;     // documento completo
  var publicado = null; // última copia conocida del repo, para comparar

  D.datos = function () { return datos; };

  /* ---------- Carga ---------- */

  /** Documento vacío por si no hay nada que cargar. */
  function documentoVacio() {
    return { version: D.VERSION, actualizado: U.isoHoy(), viajeActivo: '', viajes: [] };
  }

  /**
   * Rellena los campos que falten. Al añadir apartados nuevos a la app,
   * los viajes guardados con una versión anterior siguen abriéndose.
   */
  function normalizar(doc) {
    var d = doc && typeof doc === 'object' ? doc : {};
    d.version = d.version || D.VERSION;
    d.viajes = Array.isArray(d.viajes) ? d.viajes : [];
    d.viajes.forEach(function (v) {
      v.id = v.id || U.id();
      v.nombre = v.nombre || 'Viaje sin nombre';
      v.emoji = v.emoji || '🧳';
      v.moneda = v.moneda || 'EUR';
      v.monedaBase = v.monedaBase || 'EUR';
      if (typeof v.cambio !== 'number' || !v.cambio) v.cambio = 1;
      v.presupuesto = Number(v.presupuesto) || 0;
      // Nota suelta de un día concreto: {"2026-12-02": "El jet lag juega a favor…"}
      if (!v.notasDia || typeof v.notasDia !== 'object') v.notasDia = {};
      ['reservas', 'lugares', 'actividades', 'gastos', 'equipaje', 'pendientes', 'notas', 'viajeros']
        .forEach(function (clave) {
          if (!Array.isArray(v[clave])) v[clave] = [];
        });
      v.reservas.forEach(function (r) {
        r.id = r.id || U.id();
        r.tipo = D.TIPOS[r.tipo] ? r.tipo : 'otro';
        r.estado = r.estado || 'confirmada';
        r.desde = r.desde || null;
        r.hasta = r.hasta || null;
        r.detalles = r.detalles || {};
      });
      v.lugares.forEach(function (l) {
        l.id = l.id || U.id();
        l.categoria = D.CATEGORIAS_LUGAR[l.categoria] ? l.categoria : 'otro';
      });
      v.actividades.forEach(function (a) { a.id = a.id || U.id(); });
      v.gastos.forEach(function (g) {
        g.id = g.id || U.id();
        g.categoria = D.CATEGORIAS_GASTO[g.categoria] ? g.categoria : 'otro';
      });
      v.equipaje.forEach(function (e) { e.id = e.id || U.id(); });
      v.pendientes.forEach(function (p) {
        p.id = p.id || U.id();
        p.grupo = p.grupo || 'General';
      });
      v.notas.forEach(function (n) { n.id = n.id || U.id(); });
    });
    if (!d.viajeActivo || !d.viajes.some(function (v) { return v.id === d.viajeActivo; })) {
      d.viajeActivo = d.viajes.length ? d.viajes[0].id : '';
    }
    return d;
  }

  function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

  /**
   * Carga el JSON del repositorio y, si hay cambios locales sin publicar,
   * se queda con la versión local.
   */
  D.cargar = function () {
    return fetch(D.RUTA_JSON + '?v=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : documentoVacio(); })
      .catch(function () { return documentoVacio(); })
      .then(function (delRepo) {
        publicado = normalizar(delRepo);
        U.guardarLocal(CLAVE_BASE, publicado);
        var local = U.leerLocal(CLAVE_LOCAL, null);
        datos = local ? normalizar(local) : clonar(publicado);
        return datos;
      });
  };

  /* ---------- Cambios sin publicar ---------- */

  function guardar() {
    datos.actualizado = U.isoHoy();
    U.guardarLocal(CLAVE_LOCAL, datos);
    document.dispatchEvent(new CustomEvent('datos:cambio'));
  }
  D.guardar = guardar;

  D.hayCambios = function () {
    if (!datos) return false;
    var base = publicado || U.leerLocal(CLAVE_BASE, null);
    if (!base) return true;
    return JSON.stringify(sinMarcaTiempo(datos)) !== JSON.stringify(sinMarcaTiempo(base));
  };

  /** La fecha de actualización cambia sola; no cuenta como cambio real. */
  function sinMarcaTiempo(doc) {
    var copia = clonar(doc);
    delete copia.actualizado;
    return copia;
  }

  /** Vuelve a la versión publicada, tirando los cambios locales. */
  D.descartarCambios = function () {
    U.borrarLocal(CLAVE_LOCAL);
    datos = clonar(publicado || U.leerLocal(CLAVE_BASE, null) || documentoVacio());
    document.dispatchEvent(new CustomEvent('datos:cambio'));
  };

  /** Tras publicar con éxito, lo local pasa a ser lo publicado. */
  D.marcarPublicado = function () {
    publicado = clonar(datos);
    U.guardarLocal(CLAVE_BASE, publicado);
    U.borrarLocal(CLAVE_LOCAL);
    document.dispatchEvent(new CustomEvent('datos:cambio'));
  };

  /** Sustituye el documento entero (importar copia de seguridad). */
  D.reemplazar = function (doc) {
    datos = normalizar(doc);
    guardar();
  };

  /* ---------- Viajes ---------- */

  D.viajes = function () { return datos ? datos.viajes : []; };

  D.viaje = function (id) {
    return D.viajes().filter(function (v) { return v.id === (id || datos.viajeActivo); })[0] || null;
  };

  D.activo = function () { return D.viaje(datos && datos.viajeActivo); };

  D.cambiarViaje = function (id) {
    if (!D.viaje(id)) return false;
    datos.viajeActivo = id;
    guardar();
    return true;
  };

  D.crearViaje = function (campos) {
    var viaje = {
      id: U.babosa(campos.nombre) + '-' + U.id().slice(0, 4),
      nombre: campos.nombre || 'Viaje nuevo',
      destino: campos.destino || '',
      emoji: campos.emoji || '🧳',
      inicio: campos.inicio || '',
      fin: campos.fin || '',
      moneda: campos.moneda || 'EUR',
      monedaBase: campos.monedaBase || 'EUR',
      cambio: Number(campos.cambio) || 1,
      presupuesto: Number(campos.presupuesto) || 0,
      notasGenerales: campos.notasGenerales || '',
      notasDia: {},
      viajeros: campos.viajeros || [],
      reservas: [], lugares: [], actividades: [], gastos: [], equipaje: [],
      pendientes: [], notas: []
    };
    datos.viajes.push(viaje);
    datos.viajeActivo = viaje.id;
    guardar();
    return viaje;
  };

  D.actualizarViaje = function (id, campos) {
    var v = D.viaje(id);
    if (!v) return null;
    Object.keys(campos).forEach(function (k) { v[k] = campos[k]; });
    guardar();
    return v;
  };

  D.borrarViaje = function (id) {
    datos.viajes = datos.viajes.filter(function (v) { return v.id !== id; });
    if (datos.viajeActivo === id) {
      datos.viajeActivo = datos.viajes.length ? datos.viajes[0].id : '';
    }
    guardar();
  };

  D.duplicarViaje = function (id) {
    var v = D.viaje(id);
    if (!v) return null;
    var copia = clonar(v);
    copia.id = U.babosa(v.nombre) + '-' + U.id().slice(0, 4);
    copia.nombre = v.nombre + ' (copia)';
    // Identificadores nuevos: si no, editar la copia tocaría también el original.
    ['reservas', 'lugares', 'actividades', 'gastos', 'equipaje', 'pendientes', 'notas']
      .forEach(function (clave) {
        copia[clave].forEach(function (item) { item.id = U.id(); });
      });
    datos.viajes.push(copia);
    guardar();
    return copia;
  };

  /* ---------- Colecciones dentro de un viaje ---------- */

  /** Fabrica las cuatro operaciones habituales sobre una lista del viaje. */
  function coleccion(clave) {
    return {
      lista: function (idViaje) {
        var v = D.viaje(idViaje);
        return v ? v[clave] : [];
      },
      uno: function (id, idViaje) {
        return this.lista(idViaje).filter(function (x) { return x.id === id; })[0] || null;
      },
      anadir: function (item, idViaje) {
        var v = D.viaje(idViaje);
        if (!v) return null;
        item.id = item.id || U.id();
        item.creado = item.creado || new Date().toISOString();
        v[clave].push(item);
        guardar();
        return item;
      },
      actualizar: function (id, campos, idViaje) {
        var item = this.uno(id, idViaje);
        if (!item) return null;
        Object.keys(campos).forEach(function (k) { item[k] = campos[k]; });
        guardar();
        return item;
      },
      borrar: function (id, idViaje) {
        var v = D.viaje(idViaje);
        if (!v) return;
        v[clave] = v[clave].filter(function (x) { return x.id !== id; });
        guardar();
      }
    };
  }

  D.reservas = coleccion('reservas');
  D.lugares = coleccion('lugares');
  D.actividades = coleccion('actividades');
  D.gastos = coleccion('gastos');
  D.equipaje = coleccion('equipaje');
  D.pendientes = coleccion('pendientes');
  D.notas = coleccion('notas');

  /** Nota suelta de un día del itinerario. */
  D.notaDia = function (dia, idViaje) {
    var v = D.viaje(idViaje);
    return (v && v.notasDia && v.notasDia[dia]) || '';
  };

  D.guardarNotaDia = function (dia, texto, idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return;
    if (texto) v.notasDia[dia] = texto;
    else delete v.notasDia[dia];
    guardar();
  };

  /* ---------- Itinerario ----------
     El itinerario no se guarda: se calcula juntando reservas y actividades
     y repartiéndolas por días. Así una reserva editada aparece sola en el
     día que toca, sin listas paralelas que se queden desincronizadas.     */

  /**
   * Días del viaje. Si el viaje tiene fechas, ese rango manda; si no, se
   * deduce de lo que haya reservado.
   */
  D.diasViaje = function (idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return [];
    var inicio = v.inicio, fin = v.fin;
    if (!inicio || !fin) {
      var fechas = [];
      v.reservas.forEach(function (r) {
        if (r.inicio) fechas.push(U.soloDia(r.inicio));
        if (r.fin) fechas.push(U.soloDia(r.fin));
      });
      v.actividades.forEach(function (a) { if (a.fecha) fechas.push(a.fecha); });
      fechas = fechas.filter(Boolean).sort();
      if (!fechas.length) return [];
      inicio = inicio || fechas[0];
      fin = fin || fechas[fechas.length - 1];
    }
    return U.rangoDias(inicio, fin);
  };

  /**
   * Eventos de un día concreto, ya ordenados por hora.
   * Una reserva puede generar dos eventos (salida y llegada, entrada y
   * salida del hotel) y por eso cada evento lleva el momento al que
   * corresponde además de la reserva de la que sale.
   */
  D.eventosDelDia = function (dia, idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return [];
    var eventos = [];

    v.reservas.forEach(function (r) {
      if (r.estado === 'cancelada') return;
      var diaInicio = U.soloDia(r.inicio);
      var diaFin = U.soloDia(r.fin);
      var meta = D.tipo(r.tipo);

      if (diaInicio === dia) {
        eventos.push({
          clase: 'reserva', momento: 'inicio', reserva: r, tipo: r.tipo,
          hora: U.soloHora(r.inicio),
          titulo: meta.estancia ? 'Entrada · ' + r.titulo : r.titulo
        });
      }
      if (diaFin && diaFin === dia && diaFin !== diaInicio) {
        eventos.push({
          clase: 'reserva', momento: 'fin', reserva: r, tipo: r.tipo,
          hora: U.soloHora(r.fin),
          titulo: meta.estancia ? 'Salida · ' + r.titulo
            : meta.tramo ? 'Llegada · ' + r.titulo
            : 'Fin · ' + r.titulo
        });
      }
    });

    v.actividades.forEach(function (a) {
      if (a.fecha !== dia) return;
      eventos.push({
        clase: 'actividad', momento: 'inicio', actividad: a,
        tipo: a.tipo || 'actividad', hora: a.hora || '', titulo: a.titulo
      });
    });

    // Sin hora van al final del día: son cosas "para ese día", no a una hora.
    return eventos.sort(function (a, b) {
      if (!a.hora && !b.hora) return 0;
      if (!a.hora) return 1;
      if (!b.hora) return -1;
      return a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0;
    });
  };

  /** Alojamientos activos en una noche concreta (para la cinta del día). */
  D.alojamientoDe = function (dia, idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return null;
    return v.reservas.filter(function (r) {
      if (r.tipo !== 'alojamiento' || r.estado === 'cancelada') return false;
      var a = U.soloDia(r.inicio), b = U.soloDia(r.fin);
      return a && b && dia >= a && dia < b;
    })[0] || null;
  };

  /** La siguiente reserva a partir de ahora (para el resumen). */
  D.proximaReserva = function (idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return null;
    var ahora = U.isoHoy();
    var futuras = v.reservas.filter(function (r) {
      return r.estado !== 'cancelada' && r.inicio && U.soloDia(r.inicio) >= ahora;
    });
    return U.ordenarPor(futuras, function (r) { return r.inicio; })[0] || null;
  };

  /* ---------- Dinero ---------- */

  /** Convierte un importe a la moneda base del viaje. */
  D.aBase = function (cantidad, moneda, idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return Number(cantidad) || 0;
    var n = Number(cantidad) || 0;
    if (!moneda || moneda === v.monedaBase) return n;
    if (moneda === v.moneda) return n * (v.cambio || 1);
    return n;   // moneda desconocida: se muestra tal cual
  };

  /**
   * Resumen de gastos del viaje. Las reservas con precio cuentan salvo que
   * se marquen como excluidas, para no tener que apuntarlas dos veces.
   */
  D.resumenGastos = function (idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return { total: 0, pagado: 0, pendiente: 0, porCategoria: {}, presupuesto: 0 };

    var porCategoria = {};
    var total = 0, pagado = 0;

    function apuntar(categoria, importe, estaPagado) {
      porCategoria[categoria] = (porCategoria[categoria] || 0) + importe;
      total += importe;
      if (estaPagado) pagado += importe;
    }

    v.reservas.forEach(function (r) {
      if (r.estado === 'cancelada' || r.excluirGasto) return;
      var precio = r.precio && Number(r.precio.cantidad);
      if (!precio) return;
      var importe = D.aBase(precio, r.precio.moneda, idViaje);
      var meta = D.tipo(r.tipo);
      var categoria = meta.estancia ? 'alojamiento'
        : meta.tramo ? 'transporte'
        : r.tipo === 'restaurante' ? 'comida'
        : 'actividades';
      apuntar(categoria, importe, r.pagado !== false);
    });

    v.gastos.forEach(function (g) {
      apuntar(g.categoria || 'otro', D.aBase(g.cantidad, g.moneda, idViaje), g.pagado !== false);
    });

    return {
      total: total,
      pagado: pagado,
      pendiente: Math.max(0, total - pagado),
      porCategoria: porCategoria,
      presupuesto: Number(v.presupuesto) || 0
    };
  };

  /* ---------- Estadísticas para el resumen ---------- */

  D.resumen = function (idViaje) {
    var v = D.viaje(idViaje);
    if (!v) return null;
    var dias = D.diasViaje(idViaje);
    var activas = v.reservas.filter(function (r) { return r.estado !== 'cancelada'; });
    var noches = v.reservas
      .filter(function (r) { return r.tipo === 'alojamiento' && r.estado !== 'cancelada'; })
      .reduce(function (suma, r) {
        var n = U.diasEntre(r.inicio, r.fin);
        return suma + (n > 0 ? n : 0);
      }, 0);
    var conFecha = {};
    v.actividades.forEach(function (a) { if (a.fecha) conFecha[a.fecha] = true; });
    activas.forEach(function (r) { if (r.inicio) conFecha[U.soloDia(r.inicio)] = true; });

    return {
      dias: dias.length,
      diasPlanificados: Object.keys(conFecha).length,
      reservas: activas.length,
      vuelos: activas.filter(function (r) { return r.tipo === 'vuelo'; }).length,
      noches: noches,
      lugares: v.lugares.length,
      lugaresVistos: v.lugares.filter(function (l) { return l.visitado; }).length,
      actividades: v.actividades.length,
      equipajeTotal: v.equipaje.length,
      equipajeListo: v.equipaje.filter(function (e) { return e.hecho; }).length,
      pendientesTotal: v.pendientes.length,
      pendientesHechos: v.pendientes.filter(function (p) { return p.hecho; }).length,
      // Lo que ya se ha pasado de fecha y sigue sin hacer.
      pendientesVencidos: v.pendientes.filter(function (p) {
        return !p.hecho && p.fecha && p.fecha < U.isoHoy();
      }).length,
      gastos: D.resumenGastos(idViaje)
    };
  };

  global.D = D;
})(window);
