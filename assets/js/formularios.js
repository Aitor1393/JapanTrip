/* ============================================================
   formularios.js — los modales para crear y editar
   ------------------------------------------------------------
   Todos siguen el mismo patrón: se pinta el HTML en el modal, se
   engancha el submit, se guarda en D y se vuelve a pintar la vista.
   ============================================================ */
(function (global) {
  'use strict';

  var F = {};

  /* ══════════════════════════════════════════════════════════
     Piezas de formulario
     ══════════════════════════════════════════════════════════ */

  function campo(etiqueta, nombre, valor, tipo, extra) {
    return '<label class="campo">' +
      '<span>' + U.esc(etiqueta) + '</span>' +
      '<input type="' + (tipo || 'text') + '" name="' + nombre + '" value="' +
      U.esc(valor === null || valor === undefined ? '' : valor) + '"' + (extra || '') + '>' +
      '</label>';
  }

  function area(etiqueta, nombre, valor, filas) {
    return '<label class="campo">' +
      '<span>' + U.esc(etiqueta) + '</span>' +
      '<textarea name="' + nombre + '" rows="' + (filas || 3) + '">' +
      U.esc(valor || '') + '</textarea></label>';
  }

  function selector(etiqueta, nombre, valor, opciones) {
    var html = '<label class="campo"><span>' + U.esc(etiqueta) + '</span><select name="' + nombre + '">';
    opciones.forEach(function (o) {
      html += '<option value="' + U.esc(o.valor) + '"' +
        (String(o.valor) === String(valor) ? ' selected' : '') + '>' + U.esc(o.texto) + '</option>';
    });
    return html + '</select></label>';
  }

  function casilla(etiqueta, nombre, marcada) {
    return '<label class="campo campo--casilla">' +
      '<input type="checkbox" name="' + nombre + '"' + (marcada ? ' checked' : '') + '>' +
      '<span>' + U.esc(etiqueta) + '</span></label>';
  }

  /** Fecha y hora en dos casillas: se guardan juntas como "2026-10-12T09:30". */
  function fechaHora(etiqueta, nombre, valor) {
    return '<div class="campo"><span>' + U.esc(etiqueta) + '</span>' +
      '<div class="campo__doble">' +
      '<input type="date" name="' + nombre + 'Dia" value="' + U.esc(U.soloDia(valor)) + '">' +
      '<input type="time" name="' + nombre + 'Hora" value="' + U.esc(U.soloHora(valor)) + '">' +
      '</div></div>';
  }

  function botones(textoGuardar, extraIzquierda) {
    return '<div class="formulario__botones">' +
      (extraIzquierda || '') +
      '<div class="crece"></div>' +
      '<button type="button" class="btn btn--fantasma" data-cerrar-modal>Cancelar</button>' +
      '<button type="submit" class="btn btn--primario">' + U.esc(textoGuardar) + '</button>' +
      '</div>';
  }

  function opcionesTipo() {
    return Object.keys(D.TIPOS).map(function (k) {
      return { valor: k, texto: D.TIPOS[k].icono + ' ' + D.TIPOS[k].etiqueta };
    });
  }

  function opcionesMoneda(viaje) {
    var lista = ['EUR', 'JPY', 'USD', 'GBP', 'KRW', 'CHF'];
    [viaje.moneda, viaje.monedaBase].forEach(function (m) {
      if (m && lista.indexOf(m) === -1) lista.push(m);
    });
    return lista.map(function (m) { return { valor: m, texto: m + ' ' + U.simbolo(m) }; });
  }

  /** Lee todos los campos con nombre de un formulario. */
  function valores(form) {
    var datos = {};
    U.$$('[name]', form).forEach(function (el) {
      datos[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    return datos;
  }

  function juntarFechaHora(datos, nombre) {
    var dia = datos[nombre + 'Dia'];
    var hora = datos[nombre + 'Hora'];
    if (!dia) return '';
    return hora ? dia + 'T' + hora : dia;
  }

  /** Abre el modal y engancha el envío. */
  function montar(html, alEnviar, ancho) {
    U.abrirModal('<form class="formulario" id="formModal">' + html + '</form>', ancho);
    var form = document.getElementById('formModal');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alEnviar(valores(form), form);
    });
    return form;
  }

  /* ══════════════════════════════════════════════════════════
     Reserva
     ══════════════════════════════════════════════════════════ */

  /** Campos de un lugar (origen/destino de una reserva). */
  function camposLugar(prefijo, etiqueta, lugar) {
    var l = lugar || {};
    return '<fieldset class="grupo"><legend>' + U.esc(etiqueta) + '</legend>' +
      campo('Nombre', prefijo + 'Nombre', l.nombre) +
      campo('Dirección', prefijo + 'Direccion', l.direccion) +
      '<div class="campo"><span>Coordenadas</span><div class="campo__doble">' +
      '<input type="text" name="' + prefijo + 'Lat" value="' + U.esc(l.lat === null || l.lat === undefined ? '' : l.lat) + '" placeholder="Latitud">' +
      '<input type="text" name="' + prefijo + 'Lon" value="' + U.esc(l.lon === null || l.lon === undefined ? '' : l.lon) + '" placeholder="Longitud">' +
      '</div>' +
      '<div class="campo__ayuda">Pega aquí un enlace de Google Maps y se rellenan solas, ' +
      'o pulsa <button type="button" class="enlace" data-geo="' + prefijo + '">buscar por la dirección</button>.</div>' +
      '</div></fieldset>';
  }

  function leerLugar(datos, prefijo) {
    var nombre = datos[prefijo + 'Nombre'];
    var direccion = datos[prefijo + 'Direccion'];
    var lat = parseFloat(datos[prefijo + 'Lat']);
    var lon = parseFloat(datos[prefijo + 'Lon']);
    if (!nombre && !direccion && isNaN(lat)) return null;
    return {
      nombre: nombre, direccion: direccion,
      lat: isNaN(lat) ? null : lat,
      lon: isNaN(lon) ? null : lon
    };
  }

  /**
   * Deja que se pegue un enlace de Google Maps en el campo de latitud y
   * reparte las dos coordenadas, y busca la dirección si se pide.
   */
  function engancharGeo(form) {
    U.$$('[data-geo]', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var prefijo = b.getAttribute('data-geo');
        var consulta = [
          U.$('[name="' + prefijo + 'Nombre"]', form).value,
          U.$('[name="' + prefijo + 'Direccion"]', form).value
        ].filter(Boolean).join(', ');
        if (!consulta) { U.aviso('Escribe antes el nombre o la dirección.', 'error'); return; }
        b.disabled = true;
        b.textContent = 'buscando…';
        M.geocodificar(consulta).then(function (r) {
          U.$('[name="' + prefijo + 'Lat"]', form).value = r.lat;
          U.$('[name="' + prefijo + 'Lon"]', form).value = r.lon;
          U.aviso('Encontrado: ' + U.recortar(r.nombre, 60), 'ok');
        }).catch(function (e) {
          U.aviso(e.message, 'error');
        }).then(function () {
          b.disabled = false;
          b.textContent = 'buscar por la dirección';
        });
      });
    });

    U.$$('input[name$="Lat"]', form).forEach(function (campoLat) {
      campoLat.addEventListener('paste', function (e) {
        var texto = (e.clipboardData || global.clipboardData).getData('text');
        var coords = M.coordenadasDe(texto);
        if (!coords) return;
        e.preventDefault();
        campoLat.value = coords.lat;
        var campoLon = U.$('[name="' + campoLat.name.replace(/Lat$/, 'Lon') + '"]', form);
        if (campoLon) campoLon.value = coords.lon;
        U.aviso('Coordenadas leídas del enlace.', 'ok');
      });
    });
  }

  /**
   * @param {string} [id]    reserva existente que se edita
   * @param {object} [base]  valores con los que arrancar; mandan sobre los
   *                         guardados y sirven para no perder lo escrito al
   *                         cambiar el tipo, que reordena el formulario
   */
  F.reserva = function (id, base) {
    var viaje = D.activo();
    var esNueva = !id;
    var r = base || (id ? D.reservas.uno(id) : null) ||
      { tipo: 'actividad', estado: 'confirmada', detalles: {}, precio: null };
    r.detalles = r.detalles || {};
    var meta = D.tipo(r.tipo);

    var html = '<h2>' + (esNueva ? 'Nueva reserva' : 'Editar reserva') + '</h2>' +
      '<div class="campo__doble">' +
      selector('Tipo', 'tipo', r.tipo, opcionesTipo()) +
      selector('Estado', 'estado', r.estado, [
        { valor: 'confirmada', texto: 'Confirmada' },
        { valor: 'pendiente', texto: 'Sin confirmar' },
        { valor: 'cancelada', texto: 'Cancelada' }
      ]) +
      '</div>' +
      campo('Título', 'titulo', r.titulo, 'text', ' required placeholder="Vuelo Madrid → Tokio"') +
      '<div class="campo__doble">' +
      campo('Proveedor', 'proveedor', r.proveedor) +
      campo('Localizador', 'localizador', r.localizador) +
      '</div>' +
      '<div class="campo__doble">' +
      fechaHora(meta.estancia ? 'Entrada' : 'Salida', 'inicio', r.inicio) +
      fechaHora(meta.estancia ? 'Salida' : 'Llegada', 'fin', r.fin) +
      '</div>' +
      '<div class="campo__doble">' +
      campo('Precio', 'precioCantidad', r.precio ? r.precio.cantidad : '', 'number', ' step="0.01" min="0"') +
      selector('Moneda', 'precioMoneda', r.precio ? r.precio.moneda : viaje.moneda, opcionesMoneda(viaje)) +
      '</div>' +
      '<div class="campo__doble">' +
      casilla('Ya pagado', 'pagado', r.pagado !== false) +
      casilla('No contar en los gastos', 'excluirGasto', !!r.excluirGasto) +
      '</div>' +
      camposLugar('desde', meta.estancia ? 'Dónde está' : meta.tramo ? 'Origen' : 'Dónde es', r.desde) +
      (meta.tramo ? camposLugar('hasta', 'Destino', r.hasta) : '') +
      '<fieldset class="grupo"><legend>Detalles</legend><div class="campo__doble">' +
      campo('Asiento', 'asiento', r.detalles.asiento) +
      campo('Coche / vagón', 'coche', r.detalles.coche) +
      '</div><div class="campo__doble">' +
      campo('Terminal', 'terminal', r.detalles.terminal) +
      campo('Habitación', 'habitacion', r.detalles.habitacion) +
      '</div>' +
      campo('Personas', 'personas', r.detalles.personas || '', 'number', ' min="0"') +
      '</fieldset>' +
      area('Notas', 'notas', r.notas) +
      botones(esNueva ? 'Añadir reserva' : 'Guardar cambios');

    var form = montar(html, function (datos) {
      if (!datos.titulo) { U.aviso('Ponle un título a la reserva.', 'error'); return; }
      var campos = {
        tipo: datos.tipo,
        estado: datos.estado,
        titulo: datos.titulo,
        proveedor: datos.proveedor,
        localizador: datos.localizador.toUpperCase(),
        inicio: juntarFechaHora(datos, 'inicio'),
        fin: juntarFechaHora(datos, 'fin'),
        precio: datos.precioCantidad
          ? { cantidad: Number(datos.precioCantidad), moneda: datos.precioMoneda }
          : null,
        pagado: datos.pagado,
        excluirGasto: datos.excluirGasto,
        desde: leerLugar(datos, 'desde'),
        hasta: leerLugar(datos, 'hasta'),
        detalles: {
          asiento: datos.asiento, coche: datos.coche, terminal: datos.terminal,
          habitacion: datos.habitacion, personas: Number(datos.personas) || 0,
          direccion: datos.desdeDireccion
        },
        notas: datos.notas
      };
      if (esNueva) D.reservas.anadir(campos);
      else D.reservas.actualizar(id, campos);
      U.cerrarModal();
      U.aviso(esNueva ? 'Reserva añadida.' : 'Reserva guardada.', 'ok');
      App.pintar();
    }, 'ancha');

    engancharGeo(form);

    // Un hotel no tiene destino y un vuelo sí, así que al cambiar el tipo hay
    // que rehacer el formulario. Se rehace con lo que ya estuviera escrito,
    // sin tocar nada de lo guardado.
    U.$('[name="tipo"]', form).addEventListener('change', function (e) {
      var datos = valores(form);
      F.reserva(id, {
        tipo: e.target.value, estado: datos.estado, titulo: datos.titulo,
        proveedor: datos.proveedor, localizador: datos.localizador,
        inicio: juntarFechaHora(datos, 'inicio'), fin: juntarFechaHora(datos, 'fin'),
        precio: datos.precioCantidad
          ? { cantidad: Number(datos.precioCantidad), moneda: datos.precioMoneda } : null,
        pagado: datos.pagado, excluirGasto: datos.excluirGasto,
        desde: leerLugar(datos, 'desde'), hasta: leerLugar(datos, 'hasta'),
        detalles: {
          asiento: datos.asiento, coche: datos.coche, terminal: datos.terminal,
          habitacion: datos.habitacion, personas: datos.personas
        },
        notas: datos.notas, textoOriginal: r.textoOriginal
      });
    });
  };

  /* ══════════════════════════════════════════════════════════
     Pegar una confirmación
     ══════════════════════════════════════════════════════════ */

  F.pegar = function () {
    var html = '<h2>Pegar una confirmación</h2>' +
      '<p class="apagado">Copia el correo del vuelo, del hotel o de donde sea y pégalo aquí. ' +
      'Se intenta reconocer el tipo de reserva, las fechas, el localizador y el precio. ' +
      'Antes de guardar lo revisas.</p>' +
      '<label class="campo"><span>Texto de la confirmación</span>' +
      '<textarea name="texto" rows="12" placeholder="Pega aquí el correo entero…" autofocus></textarea></label>' +
      '<div class="formulario__botones">' +
      '<button type="button" class="btn btn--fantasma" data-ejemplo>Probar con un ejemplo</button>' +
      '<div class="crece"></div>' +
      '<button type="button" class="btn btn--fantasma" data-cerrar-modal>Cancelar</button>' +
      '<button type="submit" class="btn btn--primario">Analizar</button>' +
      '</div>';

    var form = montar(html, function (datos) {
      if (!datos.texto) { U.aviso('Pega antes el texto de la confirmación.', 'error'); return; }
      F.revisarPropuestas(P.analizar(datos.texto, D.activo()));
    }, 'ancha');

    U.$('[data-ejemplo]', form).addEventListener('click', function () {
      U.$('[name="texto"]', form).value = P.EJEMPLO;
    });
  };

  /** Pantalla de revisión: lo detectado, editable, antes de guardar. */
  F.revisarPropuestas = function (analisis) {
    var viaje = D.activo();

    if (!analisis.reservas.length) {
      U.abrirModal('<h2>No se ha podido leer</h2>' +
        '<p class="apagado">' + U.esc(analisis.avisos.join(' ')) + '</p>' +
        '<div class="formulario__botones">' +
        '<button class="btn" data-cerrar-modal>Cerrar</button></div>');
      return;
    }

    var nivel = analisis.confianza >= 70 ? 'verde' : analisis.confianza >= 40 ? 'ambar' : 'rojo';
    var etiquetaNivel = analisis.confianza >= 70 ? 'Detección buena'
      : analisis.confianza >= 40 ? 'Detección regular' : 'Detección floja';

    var html = '<h2>Revisa lo detectado</h2>' +
      '<div class="analisis">' +
      '<span class="chip chip--' + nivel + '">' + etiquetaNivel + ' · ' + analisis.confianza + '%</span> ' +
      '<span class="apagado">' + U.plural(analisis.reservas.length, 'reserva') + ' de tipo ' +
      U.esc(D.tipo(analisis.tipo).etiqueta.toLowerCase()) + '</span>' +
      '</div>';

    if (analisis.avisos.length) {
      html += '<ul class="avisos">';
      analisis.avisos.forEach(function (a) { html += '<li>' + U.esc(a) + '</li>'; });
      html += '</ul>';
    }

    analisis.reservas.forEach(function (r, i) {
      html += '<fieldset class="grupo propuesta" data-indice="' + i + '">' +
        '<legend><label><input type="checkbox" name="usar' + i + '" checked> ' +
        'Guardar esta</label></legend>' +
        '<div class="campo__doble">' +
        selector('Tipo', 'tipo' + i, r.tipo, opcionesTipo()) +
        campo('Localizador', 'localizador' + i, r.localizador) +
        '</div>' +
        campo('Título', 'titulo' + i, r.titulo) +
        '<div class="campo__doble">' +
        fechaHora(D.tipo(r.tipo).estancia ? 'Entrada' : 'Salida', 'inicio' + i, r.inicio) +
        fechaHora(D.tipo(r.tipo).estancia ? 'Salida' : 'Llegada', 'fin' + i, r.fin) +
        '</div>' +
        '<div class="campo__doble">' +
        campo('Precio', 'precio' + i, r.precio ? r.precio.cantidad : '', 'number', ' step="0.01" min="0"') +
        selector('Moneda', 'moneda' + i, r.precio ? r.precio.moneda : viaje.moneda, opcionesMoneda(viaje)) +
        '</div>' +
        (r.desde || r.hasta
          ? '<div class="propuesta__ruta apagado">' +
            (r.desde ? U.esc(r.desde.nombre) : '—') +
            (r.hasta ? ' → ' + U.esc(r.hasta.nombre) : '') +
            (r.desde && r.desde.direccion ? '<br>' + U.esc(r.desde.direccion) : '') +
            '</div>'
          : '') +
        '</fieldset>';
    });

    html += '<div class="formulario__botones">' +
      '<button type="button" class="btn btn--fantasma" data-volver>← Volver a pegar</button>' +
      '<div class="crece"></div>' +
      '<button type="button" class="btn btn--fantasma" data-cerrar-modal>Cancelar</button>' +
      '<button type="submit" class="btn btn--primario">Guardar</button>' +
      '</div>';

    var form = montar(html, function (datos) {
      var guardadas = 0;
      analisis.reservas.forEach(function (r, i) {
        if (!datos['usar' + i]) return;
        var inicio = juntarFechaHora(datos, 'inicio' + i);
        var fin = juntarFechaHora(datos, 'fin' + i);
        D.reservas.anadir({
          tipo: datos['tipo' + i],
          estado: 'confirmada',
          titulo: datos['titulo' + i] || r.titulo,
          proveedor: r.proveedor || '',
          localizador: (datos['localizador' + i] || '').toUpperCase(),
          inicio: inicio, fin: fin,
          desde: r.desde, hasta: r.hasta,
          precio: datos['precio' + i]
            ? { cantidad: Number(datos['precio' + i]), moneda: datos['moneda' + i] }
            : null,
          pagado: true,
          detalles: r.detalles || {},
          notas: '',
          textoOriginal: r.textoOriginal
        });
        guardadas++;
      });
      U.cerrarModal();
      U.aviso(guardadas
        ? U.plural(guardadas, 'reserva') + ' añadida' + (guardadas === 1 ? '' : 's') + '.'
        : 'No has marcado ninguna.', guardadas ? 'ok' : 'error');
      App.pintar();
    }, 'ancha');

    U.$('[data-volver]', form).addEventListener('click', F.pegar);
  };

  F.verOriginal = function (id) {
    var r = D.reservas.uno(id);
    if (!r) return;
    U.abrirModal('<h2>Correo original</h2>' +
      '<p class="apagado">' + U.esc(r.titulo) + '</p>' +
      '<pre class="original">' + U.esc(r.textoOriginal || '(no se guardó)') + '</pre>' +
      '<div class="formulario__botones">' +
      '<button class="btn" data-cerrar-modal>Cerrar</button></div>', 'ancha');
  };

  /* ══════════════════════════════════════════════════════════
     Actividad del itinerario
     ══════════════════════════════════════════════════════════ */

  F.actividad = function (id, dia) {
    var viaje = D.activo();
    var a = id ? D.actividades.uno(id) : null;
    var esNueva = !a;
    a = a || { fecha: dia || viaje.inicio || U.isoHoy(), tipo: 'actividad' };

    var html = '<h2>' + (esNueva ? 'Añadir al itinerario' : 'Editar plan') + '</h2>' +
      campo('Qué', 'titulo', a.titulo, 'text', ' required placeholder="Paseo por Gion"') +
      '<div class="campo__doble">' +
      campo('Día', 'fecha', a.fecha, 'date') +
      campo('Hora', 'hora', a.hora, 'time') +
      '</div>' +
      '<div class="campo__ayuda">Con hora va a la agenda del día. <strong>Déjala vacía</strong> si es ' +
      'algo para ver sin hora concreta: irá a «Para ver ese día», donde se puede ir tachando.</div>' +
      '<div class="campo__doble">' +
      selector('Tipo', 'tipo', a.tipo, opcionesTipo()) +
      campo('Cuánto dura', 'duracion', a.duracion, 'text', ' placeholder="2 h"') +
      '</div>' +
      campo('Dónde', 'lugar', a.lugar) +
      area('Notas', 'notas', a.notas) +
      botones(esNueva ? 'Añadir' : 'Guardar',
        esNueva ? '' : '<button type="button" class="btn btn--peligro" data-borrar>Borrar</button>');

    var form = montar(html, function (datos) {
      if (!datos.titulo) { U.aviso('Escribe qué vas a hacer.', 'error'); return; }
      var campos = {
        titulo: datos.titulo, fecha: datos.fecha, hora: datos.hora,
        tipo: datos.tipo, duracion: datos.duracion, lugar: datos.lugar, notas: datos.notas
      };
      if (esNueva) D.actividades.anadir(campos);
      else D.actividades.actualizar(id, campos);
      U.cerrarModal();
      U.aviso('Itinerario actualizado.', 'ok');
      App.pintar();
    });

    var borrar = U.$('[data-borrar]', form);
    if (borrar) {
      borrar.addEventListener('click', function () {
        U.cerrarModal();
        U.confirmar('Borrar el plan', '¿Seguro que quieres quitar «' + a.titulo + '» del itinerario?')
          .then(function (si) {
            if (!si) return;
            D.actividades.borrar(id);
            U.aviso('Plan borrado.', 'ok');
            App.pintar();
          });
      });
    }
  };

  /* ══════════════════════════════════════════════════════════
     Lugares
     ══════════════════════════════════════════════════════════ */

  F.lugar = function (id) {
    var l = id ? D.lugares.uno(id) : null;
    var esNuevo = !l;
    l = l || { categoria: 'imprescindible' };

    var html = '<h2>' + (esNuevo ? 'Nuevo lugar' : 'Editar lugar') + '</h2>' +
      campo('Nombre', 'nombre', l.nombre, 'text', ' required placeholder="Fushimi Inari"') +
      '<div class="campo__doble">' +
      campo('Ciudad o zona', 'ciudad', l.ciudad) +
      selector('Categoría', 'categoria', l.categoria, Object.keys(D.CATEGORIAS_LUGAR).map(function (k) {
        return { valor: k, texto: D.CATEGORIAS_LUGAR[k].icono + ' ' + D.CATEGORIAS_LUGAR[k].etiqueta };
      })) +
      '</div>' +
      campo('Dirección', 'lugarDireccion', l.direccion) +
      '<div class="campo"><span>Coordenadas</span><div class="campo__doble">' +
      '<input type="text" name="lugarLat" value="' + U.esc(l.lat === null || l.lat === undefined ? '' : l.lat) + '" placeholder="Latitud">' +
      '<input type="text" name="lugarLon" value="' + U.esc(l.lon === null || l.lon === undefined ? '' : l.lon) + '" placeholder="Longitud">' +
      '</div><div class="campo__ayuda">Pega un enlace de Google Maps en la latitud y se reparten solas, ' +
      'o pulsa <button type="button" class="enlace" data-geo="lugar">buscar por la dirección</button>.</div></div>' +
      casilla('Ya lo he visitado', 'visitado', !!l.visitado) +
      area('Notas', 'notas', l.notas) +
      botones(esNuevo ? 'Añadir lugar' : 'Guardar',
        esNuevo ? '' : '<button type="button" class="btn btn--peligro" data-borrar>Borrar</button>');

    var form = montar(html, function (datos) {
      if (!datos.nombre) { U.aviso('Ponle nombre al lugar.', 'error'); return; }
      var lat = parseFloat(datos.lugarLat), lon = parseFloat(datos.lugarLon);
      var campos = {
        nombre: datos.nombre, ciudad: datos.ciudad, categoria: datos.categoria,
        direccion: datos.lugarDireccion,
        lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon,
        visitado: datos.visitado, notas: datos.notas
      };
      if (esNuevo) D.lugares.anadir(campos);
      else D.lugares.actualizar(id, campos);
      U.cerrarModal();
      U.aviso(esNuevo ? 'Lugar añadido.' : 'Lugar guardado.', 'ok');
      App.pintar();
    });

    engancharGeo(form);

    var borrar = U.$('[data-borrar]', form);
    if (borrar) {
      borrar.addEventListener('click', function () {
        U.cerrarModal();
        U.confirmar('Borrar el lugar', '¿Quitar «' + l.nombre + '» de la lista?').then(function (si) {
          if (!si) return;
          D.lugares.borrar(id);
          U.aviso('Lugar borrado.', 'ok');
          App.pintar();
        });
      });
    }
  };

  F.sugerencias = function () {
    var viaje = D.activo();
    var yaEstan = {};
    viaje.lugares.forEach(function (l) { yaEstan[U.normalizar(l.nombre)] = true; });

    var porCiudad = U.agrupar(CAT.SUGERENCIAS, function (s) { return s.ciudad; });

    var html = '<h2>Sugerencias para Japón</h2>' +
      '<p class="apagado">Sitios muy conocidos con sus coordenadas puestas. ' +
      'Marca los que te interesen y se añaden a tus lugares.</p>';

    Object.keys(porCiudad).forEach(function (ciudad) {
      html += '<fieldset class="grupo"><legend>' + U.esc(ciudad) + '</legend><div class="sugerencias">';
      porCiudad[ciudad].forEach(function (s) {
        var indice = CAT.SUGERENCIAS.indexOf(s);
        var puesto = yaEstan[U.normalizar(s.nombre)];
        html += '<label class="sugerencia' + (puesto ? ' sugerencia--puesta' : '') + '">' +
          '<input type="checkbox" name="s' + indice + '"' + (puesto ? ' disabled' : '') + '>' +
          '<span>' + (D.CATEGORIAS_LUGAR[s.categoria] || D.CATEGORIAS_LUGAR.otro).icono + ' ' +
          U.esc(s.nombre) + (puesto ? ' <em>(ya la tienes)</em>' : '') + '</span></label>';
      });
      html += '</div></fieldset>';
    });

    html += botones('Añadir los marcados');

    montar(html, function (datos) {
      var anadidos = 0;
      CAT.SUGERENCIAS.forEach(function (s, i) {
        if (!datos['s' + i]) return;
        D.lugares.anadir({
          nombre: s.nombre, ciudad: s.ciudad, categoria: s.categoria,
          lat: s.lat, lon: s.lon, visitado: false, notas: ''
        });
        anadidos++;
      });
      U.cerrarModal();
      U.aviso(anadidos ? U.plural(anadidos, 'lugar', 'lugares') + ' añadido' + (anadidos === 1 ? '' : 's') + '.'
        : 'No has marcado ninguno.', anadidos ? 'ok' : 'error');
      App.pintar();
    }, 'ancha');
  };

  /** Manda un lugar guardado al itinerario, en el día que se elija. */
  F.lugarAlItinerario = function (id) {
    var l = D.lugares.uno(id);
    if (!l) return;
    var viaje = D.activo();
    var dias = D.diasViaje(viaje.id);

    if (!dias.length) {
      U.aviso('El viaje no tiene fechas todavía.', 'error');
      return;
    }

    var html = '<h2>Añadir al itinerario</h2>' +
      '<p class="apagado">' + U.esc(l.nombre) + '</p>' +
      selector('Día', 'fecha', dias[0], dias.map(function (d, i) {
        return { valor: d, texto: 'Día ' + (i + 1) + ' · ' + U.mayus1(U.fechaDia(d)) };
      })) +
      campo('Hora (opcional)', 'hora', '', 'time') +
      botones('Añadir al itinerario');

    montar(html, function (datos) {
      D.actividades.anadir({
        titulo: l.nombre, fecha: datos.fecha, hora: datos.hora,
        tipo: 'actividad', lugar: l.ciudad || '', notas: l.notas || '', idLugar: l.id
      });
      U.cerrarModal();
      U.aviso('Añadido al día ' + U.fechaCorta(datos.fecha) + '.', 'ok');
      App.pintar();
    });
  };

  /* ══════════════════════════════════════════════════════════
     Gastos
     ══════════════════════════════════════════════════════════ */

  F.gasto = function (id) {
    var viaje = D.activo();
    var g = id ? D.gastos.uno(id) : null;
    var esNuevo = !g;
    g = g || { categoria: 'comida', moneda: viaje.moneda, fecha: U.isoHoy(), pagado: true };

    var html = '<h2>' + (esNuevo ? 'Nuevo gasto' : 'Editar gasto') + '</h2>' +
      campo('Concepto', 'concepto', g.concepto, 'text', ' required placeholder="Cena en Dotonbori"') +
      '<div class="campo__doble">' +
      campo('Cantidad', 'cantidad', g.cantidad, 'number', ' step="0.01" min="0" required') +
      selector('Moneda', 'moneda', g.moneda, opcionesMoneda(viaje)) +
      '</div>' +
      '<div class="campo__doble">' +
      selector('Categoría', 'categoria', g.categoria, Object.keys(D.CATEGORIAS_GASTO).map(function (k) {
        return { valor: k, texto: D.CATEGORIAS_GASTO[k].icono + ' ' + D.CATEGORIAS_GASTO[k].etiqueta };
      })) +
      campo('Fecha', 'fecha', g.fecha, 'date') +
      '</div>' +
      casilla('Ya pagado', 'pagado', g.pagado !== false) +
      area('Notas', 'notas', g.notas, 2) +
      botones(esNuevo ? 'Añadir gasto' : 'Guardar');

    montar(html, function (datos) {
      if (!datos.concepto || !datos.cantidad) {
        U.aviso('Hacen falta el concepto y la cantidad.', 'error');
        return;
      }
      var campos = {
        concepto: datos.concepto, cantidad: Number(datos.cantidad), moneda: datos.moneda,
        categoria: datos.categoria, fecha: datos.fecha, pagado: datos.pagado, notas: datos.notas
      };
      if (esNuevo) D.gastos.anadir(campos);
      else D.gastos.actualizar(id, campos);
      U.cerrarModal();
      U.aviso('Gasto guardado.', 'ok');
      App.pintar();
    });
  };

  /* ══════════════════════════════════════════════════════════
     Equipaje
     ══════════════════════════════════════════════════════════ */

  F.equipaje = function () {
    var html = '<h2>Añadir a la maleta</h2>' +
      campo('Qué', 'nombre', '', 'text', ' required placeholder="Adaptador de enchufe"') +
      '<div class="campo__doble">' +
      campo('Grupo', 'grupo', 'General', 'text', ' placeholder="Ropa, documentos…"') +
      campo('Cantidad', 'cantidad', 1, 'number', ' min="1"') +
      '</div>' +
      botones('Añadir');

    montar(html, function (datos) {
      if (!datos.nombre) { U.aviso('Escribe qué quieres meter.', 'error'); return; }
      D.equipaje.anadir({
        nombre: datos.nombre, grupo: datos.grupo || 'General',
        cantidad: Number(datos.cantidad) || 1, hecho: false
      });
      U.cerrarModal();
      App.pintar();
    });
  };

  var PLANTILLA_JAPON = [
    ['Documentos', ['Pasaporte', 'Copia del pasaporte', 'Seguro de viaje', 'Tarjetas de embarque',
      'Japan Rail Pass o billetes', 'Reservas de hotel impresas', 'Tarjeta de crédito sin comisiones']],
    ['Dinero y móvil', ['Yenes en efectivo', 'Tarjeta Suica o Pasmo', 'eSIM o wifi de bolsillo',
      'Adaptador de enchufe tipo A', 'Batería externa', 'Cables de carga']],
    ['Ropa', ['Calcetines sin agujeros (te descalzas mucho)', 'Zapatos cómodos de andar',
      'Chaqueta ligera', 'Paraguas plegable', 'Ropa para capas']],
    ['Aseo y salud', ['Neceser', 'Medicamentos habituales', 'Protector solar', 'Toallitas',
      'Pañuelos de papel']],
    ['Prácticos', ['Mochila pequeña de día', 'Bolsa para la ropa sucia', 'Bolsa para la basura ' +
      '(hay pocas papeleras)', 'Botella de agua reutilizable']]
  ];

  F.plantillaEquipaje = function () {
    var viaje = D.activo();
    var yaEstan = {};
    viaje.equipaje.forEach(function (e) { yaEstan[U.normalizar(e.nombre)] = true; });

    var html = '<h2>Lista para Japón</h2>' +
      '<p class="apagado">Marca lo que quieras añadir a tu maleta. ' +
      'Lo que ya tengas apuntado sale desmarcado y sin poder elegirse.</p>';

    var indice = 0;
    var referencias = [];
    PLANTILLA_JAPON.forEach(function (par) {
      html += '<fieldset class="grupo"><legend>' + U.esc(par[0]) + '</legend><div class="sugerencias">';
      par[1].forEach(function (cosa) {
        var puesto = yaEstan[U.normalizar(cosa)];
        referencias.push({ nombre: cosa, grupo: par[0] });
        html += '<label class="sugerencia' + (puesto ? ' sugerencia--puesta' : '') + '">' +
          '<input type="checkbox" name="p' + indice + '"' +
          (puesto ? ' disabled' : ' checked') + '>' +
          '<span>' + U.esc(cosa) + (puesto ? ' <em>(ya la tienes)</em>' : '') + '</span></label>';
        indice++;
      });
      html += '</div></fieldset>';
    });

    html += botones('Añadir lo marcado');

    montar(html, function (datos) {
      var anadidos = 0;
      referencias.forEach(function (ref, i) {
        if (!datos['p' + i]) return;
        D.equipaje.anadir({ nombre: ref.nombre, grupo: ref.grupo, cantidad: 1, hecho: false });
        anadidos++;
      });
      U.cerrarModal();
      U.aviso(anadidos ? U.plural(anadidos, 'cosa') + ' añadida' + (anadidos === 1 ? '' : 's') + '.'
        : 'No has marcado nada.', anadidos ? 'ok' : 'error');
      App.pintar();
    }, 'ancha');
  };

  /* ══════════════════════════════════════════════════════════
     Pendientes
     ══════════════════════════════════════════════════════════ */

  F.pendiente = function (id) {
    var viaje = D.activo();
    var p = id ? D.pendientes.uno(id) : null;
    var esNuevo = !p;
    p = p || { grupo: 'General' };

    // Se ofrecen los grupos que ya existan para no acabar con «Antes de
    // salir» y «Antes de salir de casa» como dos listas distintas.
    var grupos = [];
    viaje.pendientes.forEach(function (x) {
      if (x.grupo && grupos.indexOf(x.grupo) === -1) grupos.push(x.grupo);
    });

    var html = '<h2>' + (esNuevo ? 'Nueva tarea' : 'Editar tarea') + '</h2>' +
      campo('Qué hay que hacer', 'titulo', p.titulo, 'text',
        ' required placeholder="Reservar el shinkansen a Yamagata"') +
      '<div class="campo__doble">' +
      campo('Grupo', 'grupo', p.grupo, 'text', ' list="gruposPendientes" placeholder="Antes de salir de casa"') +
      campo('Fecha límite', 'fecha', p.fecha, 'date') +
      '</div>' +
      '<datalist id="gruposPendientes">' +
      grupos.map(function (g) { return '<option value="' + U.esc(g) + '">'; }).join('') +
      '</datalist>' +
      casilla('Ya está hecho', 'hecho', !!p.hecho) +
      area('Detalles', 'notas', p.notas) +
      botones(esNuevo ? 'Añadir tarea' : 'Guardar');

    montar(html, function (datos) {
      if (!datos.titulo) { U.aviso('Escribe qué hay que hacer.', 'error'); return; }
      var campos = {
        titulo: datos.titulo, grupo: datos.grupo || 'General',
        fecha: datos.fecha, hecho: datos.hecho, notas: datos.notas
      };
      if (esNuevo) D.pendientes.anadir(campos);
      else D.pendientes.actualizar(id, campos);
      U.cerrarModal();
      U.aviso('Tarea guardada.', 'ok');
      App.pintar();
    });
  };

  /* ══════════════════════════════════════════════════════════
     Nota de un día
     ══════════════════════════════════════════════════════════ */

  F.notaDia = function (dia) {
    var viaje = D.activo();
    var html = '<h2>Nota del día</h2>' +
      '<p class="apagado">' + U.esc(U.mayus1(U.fechaDia(dia))) + '</p>' +
      area('Nota', 'nota', D.notaDia(dia, viaje.id), 4) +
      '<div class="campo__ayuda">Sale arriba del día, encima de los planes. ' +
      'Déjala vacía para quitarla.</div>' +
      botones('Guardar');

    montar(html, function (datos) {
      D.guardarNotaDia(dia, datos.nota, viaje.id);
      U.cerrarModal();
      App.pintar();
    });
  };

  /* ══════════════════════════════════════════════════════════
     Foto de un día
     ══════════════════════════════════════════════════════════ */

  /**
   * Busca imágenes en Wikipedia. Se usa la imagen principal de cada
   * artículo, que suele ser la foto representativa del sitio, en vez de
   * rebuscar en Commons y sacar el plano de una estación.
   */
  function buscarImagenes(consulta) {
    var url = 'https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
      '&generator=search&gsrsearch=' + encodeURIComponent(consulta) + '&gsrlimit=8' +
      '&prop=pageimages&piprop=thumbnail|original|name&pithumbsize=320&redirects=1';
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var paginas = (j.query && j.query.pages) || {};
        return Object.keys(paginas).map(function (k) { return paginas[k]; })
          .filter(function (p) { return p.thumbnail && p.original; })
          .map(function (p) {
            return {
              titulo: p.title,
              miniatura: p.thumbnail.source,
              url: p.original.source,
              fichero: p.pageimage,
              fuente: 'https://es.wikipedia.org/wiki/' + encodeURIComponent(p.title)
            };
          });
      });
  }

  /** Autor y licencia del fichero, que hay que enseñar por la licencia. */
  function creditosDe(fichero) {
    var url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
      '&prop=imageinfo&iiprop=extmetadata&titles=' + encodeURIComponent('File:' + fichero);
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var paginas = (j.query && j.query.pages) || {};
        var p = paginas[Object.keys(paginas)[0]];
        var m = p && p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata;
        function limpiar(v) {
          return String((v && v.value) || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        }
        return m
          ? { autor: limpiar(m.Artist).slice(0, 90), licencia: limpiar(m.LicenseShortName).slice(0, 40) }
          : { autor: '', licencia: '' };
      })
      .catch(function () { return { autor: '', licencia: '' }; });
  }

  F.fotoDia = function (dia) {
    var viaje = D.activo();
    var actual = D.imagenDia(dia, viaje.id) || {};

    var html = '<h2>Foto del día</h2>' +
      '<p class="apagado">' + U.esc(U.mayus1(U.fechaDia(dia))) + '</p>' +
      '<div class="campo"><span>Buscar en Wikipedia</span>' +
      '<div class="campo__doble">' +
      '<input type="search" id="buscarFoto" placeholder="Ginzan Onsen, Senso-ji, Kawagoe…">' +
      '<button type="button" class="btn" id="btnBuscarFoto">Buscar</button>' +
      '</div>' +
      '<div class="campo__ayuda">Se coge la foto principal del artículo, con su autor y su licencia.</div>' +
      '</div>' +
      '<div id="resultadosFoto" class="resultados"></div>' +
      campo('Dirección de la imagen', 'url', actual.url, 'url', ' placeholder="https://…"') +
      '<div class="campo__doble">' +
      campo('Autor', 'autor', actual.autor) +
      campo('Licencia', 'licencia', actual.licencia) +
      '</div>' +
      campo('Enlace de origen', 'fuente', actual.fuente, 'url') +
      '<div id="vistaPrevia" class="vista-previa">' +
      (actual.url ? '<img src="' + U.esc(actual.url) + '" alt="">' : '') +
      '</div>' +
      botones('Guardar', actual.url
        ? '<button type="button" class="btn btn--peligro" data-quitar>Quitar la foto</button>' : '');

    var form = montar(html, function (datos) {
      D.guardarImagenDia(dia, datos.url ? {
        url: datos.url, autor: datos.autor, licencia: datos.licencia, fuente: datos.fuente
      } : null, viaje.id);
      U.cerrarModal();
      U.aviso(datos.url ? 'Foto guardada.' : 'Foto quitada.', 'ok');
      App.pintar();
    }, 'ancha');

    var quitar = U.$('[data-quitar]', form);
    if (quitar) {
      quitar.addEventListener('click', function () {
        D.guardarImagenDia(dia, null, viaje.id);
        U.cerrarModal();
        U.aviso('Foto quitada.', 'ok');
        App.pintar();
      });
    }

    var caja = U.$('#buscarFoto', form);
    var resultados = U.$('#resultadosFoto', form);
    var previa = U.$('#vistaPrevia', form);

    function ponerFoto(r) {
      U.$('[name="url"]', form).value = r.url;
      U.$('[name="fuente"]', form).value = r.fuente;
      previa.innerHTML = '<img src="' + U.esc(r.miniatura) + '" alt="">';
      creditosDe(r.fichero).then(function (c) {
        U.$('[name="autor"]', form).value = c.autor;
        U.$('[name="licencia"]', form).value = c.licencia;
      });
    }

    function buscar() {
      var q = caja.value.trim();
      if (!q) return;
      resultados.innerHTML = '<p class="apagado">Buscando…</p>';
      buscarImagenes(q).then(function (lista) {
        if (!lista.length) {
          resultados.innerHTML = '<p class="apagado">Sin resultados con foto. Prueba con otro nombre.</p>';
          return;
        }
        resultados.innerHTML = lista.map(function (r, i) {
          return '<button type="button" class="resultado" data-i="' + i + '">' +
            '<img src="' + U.esc(r.miniatura) + '" alt="" loading="lazy">' +
            '<span>' + U.esc(r.titulo) + '</span></button>';
        }).join('');
        U.$$('.resultado', resultados).forEach(function (b) {
          b.addEventListener('click', function () {
            ponerFoto(lista[Number(b.getAttribute('data-i'))]);
            U.$$('.resultado', resultados).forEach(function (o) { o.classList.remove('resultado--elegido'); });
            b.classList.add('resultado--elegido');
          });
        });
      }).catch(function () {
        resultados.innerHTML = '<p class="apagado">No se ha podido buscar. ¿Estás sin conexión?</p>';
      });
    }

    U.$('#btnBuscarFoto', form).addEventListener('click', buscar);
    caja.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); buscar(); }
    });
  };

  /* ══════════════════════════════════════════════════════════
     Viaje
     ══════════════════════════════════════════════════════════ */

  F.viaje = function (id) {
    var v = id ? D.viaje(id) : null;
    var esNuevo = !v;
    v = v || {
      emoji: '🧳', moneda: 'EUR', monedaBase: 'EUR', cambio: 1, presupuesto: 0,
      inicio: '', fin: ''
    };

    var html = '<h2>' + (esNuevo ? 'Nuevo viaje' : 'Editar viaje') + '</h2>' +
      '<div class="campo__doble">' +
      campo('Nombre', 'nombre', v.nombre, 'text', ' required placeholder="Japón 2026"') +
      campo('Emoji', 'emoji', v.emoji, 'text', ' maxlength="4"') +
      '</div>' +
      campo('Destino', 'destino', v.destino, 'text', ' placeholder="Tokio, Kioto y Osaka"') +
      '<div class="campo__doble">' +
      campo('Ida', 'inicio', v.inicio, 'date') +
      campo('Vuelta', 'fin', v.fin, 'date') +
      '</div>' +
      '<fieldset class="grupo"><legend>Dinero</legend>' +
      '<div class="campo__doble">' +
      selector('Moneda del destino', 'moneda', v.moneda, opcionesMoneda(v)) +
      selector('Tu moneda', 'monedaBase', v.monedaBase, opcionesMoneda(v)) +
      '</div>' +
      '<div class="campo__doble">' +
      campo('1 unidad del destino son…', 'cambio', v.cambio, 'number', ' step="0.000001" min="0"') +
      campo('Presupuesto', 'presupuesto', v.presupuesto || '', 'number', ' step="1" min="0"') +
      '</div>' +
      '<div class="campo__ayuda">Ejemplo: si 1 ¥ son 0,0058 €, escribe 0.0058. ' +
      'Sirve para ver los gastos en yenes convertidos a euros.</div>' +
      '</fieldset>' +
      area('Notas del viaje', 'notasGenerales', v.notasGenerales) +
      botones(esNuevo ? 'Crear viaje' : 'Guardar');

    montar(html, function (datos) {
      if (!datos.nombre) { U.aviso('Ponle nombre al viaje.', 'error'); return; }
      if (datos.inicio && datos.fin && datos.fin < datos.inicio) {
        U.aviso('La vuelta no puede ser anterior a la ida.', 'error');
        return;
      }
      var campos = {
        nombre: datos.nombre, emoji: datos.emoji || '🧳', destino: datos.destino,
        inicio: datos.inicio, fin: datos.fin,
        moneda: datos.moneda, monedaBase: datos.monedaBase,
        cambio: Number(datos.cambio) || 1, presupuesto: Number(datos.presupuesto) || 0,
        notasGenerales: datos.notasGenerales
      };
      if (esNuevo) D.crearViaje(campos);
      else D.actualizarViaje(id, campos);
      U.cerrarModal();
      U.aviso(esNuevo ? 'Viaje creado.' : 'Viaje guardado.', 'ok');
      App.pintar();
    }, 'ancha');
  };

  /* ══════════════════════════════════════════════════════════
     GitHub
     ══════════════════════════════════════════════════════════ */

  F.github = function () {
    var cfg = GH.config();

    if (!C.disponible()) {
      U.abrirModal('<h2>Aquí no se puede cifrar</h2>' +
        '<p class="apagado">El cifrado del token necesita una conexión segura. ' +
        'Abre la página en <code>https</code> o en <code>localhost</code>.</p>' +
        '<div class="formulario__botones"><button class="btn" data-cerrar-modal>Cerrar</button></div>');
      return;
    }

    var html = '<h2>Publicar en GitHub</h2>' +
      '<p class="apagado">Necesitas un token de acceso personal de grano fino, limitado a este ' +
      'repositorio y con el permiso «Contents: Read and write». El token se guarda cifrado en este ' +
      'navegador con la contraseña que pongas: no viaja a ningún sitio ni se sube al repositorio.</p>' +
      '<div class="campo__doble">' +
      campo('Usuario u organización', 'owner', cfg.owner, 'text', ' required') +
      campo('Repositorio', 'repo', cfg.repo, 'text', ' required') +
      '</div>' +
      '<div class="campo__doble">' +
      campo('Rama', 'rama', cfg.rama, 'text', ' required') +
      campo('Fichero', 'ruta', cfg.ruta, 'text', ' required') +
      '</div>' +
      campo('Token', 'token', '', 'password', ' required placeholder="github_pat_…" autocomplete="off"') +
      campo('Contraseña para cifrarlo', 'contrasena', '', 'password', ' required autocomplete="new-password"') +
      botones('Guardar');

    montar(html, function (datos) {
      if (!datos.token || !datos.contrasena) {
        U.aviso('Hacen falta el token y la contraseña.', 'error');
        return;
      }
      GH.guardarConfig({
        owner: datos.owner, repo: datos.repo, rama: datos.rama, ruta: datos.ruta
      }, datos.token, datos.contrasena).then(function () {
        U.cerrarModal();
        U.aviso('Token guardado y cifrado.', 'ok');
        App.pintar();
      }).catch(function (e) {
        U.aviso(e.message, 'error');
      });
    });
  };

  /** Pide la contraseña para descifrar el token. */
  F.desbloquear = function () {
    return new Promise(function (resolver) {
      var html = '<h2>Contraseña</h2>' +
        '<p class="apagado">Hace falta para descifrar el token de GitHub y poder publicar.</p>' +
        campo('Contraseña', 'contrasena', '', 'password', ' required autocomplete="current-password"') +
        botones('Desbloquear');

      montar(html, function (datos, form) {
        var btn = U.$('button[type="submit"]', form);
        btn.disabled = true;
        GH.desbloquear(datos.contrasena).then(function () {
          U.cerrarModal();
          U.aviso('Desbloqueado.', 'ok');
          resolver(true);
        }).catch(function (e) {
          btn.disabled = false;
          U.aviso(e.message, 'error');
        });
      });
    });
  };

  global.F = F;
})(window);
