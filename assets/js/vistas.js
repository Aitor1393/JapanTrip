/* ============================================================
   vistas.js — cada pantalla de la aplicación
   ------------------------------------------------------------
   Cada vista devuelve HTML como texto y, si necesita algo más que
   pintar (el mapa, un buscador), lo hace en su función activar().
   Los clics se resuelven en app.js con data-accion.
   ============================================================ */
(function (global) {
  'use strict';

  var V = {};

  /* ══════════════════════════════════════════════════════════
     Piezas que se repiten
     ══════════════════════════════════════════════════════════ */

  function vacio(icono, titulo, texto, boton) {
    return '<div class="vacio">' +
      '<div class="vacio__icono">' + icono + '</div>' +
      '<h3>' + U.esc(titulo) + '</h3>' +
      '<p>' + U.esc(texto) + '</p>' +
      (boton || '') +
      '</div>';
  }

  function barra(porcentaje, color) {
    var p = Math.max(0, Math.min(100, porcentaje));
    return '<div class="barra"><div class="barra__relleno" style="width:' + p + '%' +
      (color ? ';background:' + color : '') + '"></div></div>';
  }

  function chipTipo(tipo) {
    var meta = D.tipo(tipo);
    return '<span class="chip chip--' + meta.color + '">' + meta.icono + ' ' + U.esc(meta.etiqueta) + '</span>';
  }

  function dato(etiqueta, valor) {
    if (!valor) return '';
    return '<div class="dato"><dt>' + U.esc(etiqueta) + '</dt><dd>' + valor + '</dd></div>';
  }

  function boton(accion, texto, clases, extra) {
    return '<button class="btn ' + (clases || '') + '" data-accion="' + accion + '"' +
      (extra || '') + '>' + texto + '</button>';
  }

  /** Precio de una reserva, ya formateado y con el equivalente en la moneda base. */
  function precioTexto(precio, viaje) {
    if (!precio || !precio.cantidad) return '';
    var texto = U.dinero(precio.cantidad, precio.moneda);
    if (viaje && precio.moneda === viaje.moneda && viaje.moneda !== viaje.monedaBase) {
      texto += ' <span class="apagado">≈ ' +
        U.dinero(D.aBase(precio.cantidad, precio.moneda), viaje.monedaBase) + '</span>';
    }
    return texto;
  }

  /* ══════════════════════════════════════════════════════════
     Resumen
     ══════════════════════════════════════════════════════════ */

  function cuentaAtras(viaje) {
    if (!viaje.inicio) return '';
    var dias = U.diasHasta(viaje.inicio);
    var finalizado = viaje.fin && U.diasHasta(viaje.fin) < 0;
    var enCurso = dias <= 0 && !finalizado;

    var titular, pie;
    if (finalizado) {
      titular = '¡Viaje terminado!';
      pie = 'Volviste ' + U.cuando(viaje.fin) + '.';
    } else if (enCurso) {
      var diaActual = U.diasEntre(viaje.inicio, U.isoHoy()) + 1;
      titular = 'Día ' + diaActual + ' del viaje';
      pie = 'Estás de viaje ahora mismo.';
    } else {
      titular = dias + (dias === 1 ? ' día' : ' días');
      pie = 'para salir hacia ' + (viaje.destino || viaje.nombre) + '.';
    }

    return '<div class="cuenta">' +
      '<div class="cuenta__numero">' + U.esc(titular) + '</div>' +
      '<div class="cuenta__pie">' + U.esc(pie) + '</div>' +
      '<div class="cuenta__fechas">' + U.esc(U.rangoTexto(viaje.inicio, viaje.fin)) + '</div>' +
      '</div>';
  }

  function tarjetaDato(icono, numero, etiqueta, extra) {
    return '<div class="ficha">' +
      '<div class="ficha__icono">' + icono + '</div>' +
      '<div class="ficha__numero">' + U.esc(String(numero)) + '</div>' +
      '<div class="ficha__etiqueta">' + U.esc(etiqueta) + '</div>' +
      (extra ? '<div class="ficha__extra">' + extra + '</div>' : '') +
      '</div>';
  }

  V.resumen = {
    titulo: 'Resumen',
    html: function (viaje) {
      var r = D.resumen(viaje.id);
      var proxima = D.proximaReserva(viaje.id);
      var g = r.gastos;

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>' + U.esc(viaje.emoji + ' ' + viaje.nombre) + '</h1>' +
        '<p>' + U.esc(viaje.destino || 'Sin destino') + ' · ' +
        U.esc(U.rangoTexto(viaje.inicio, viaje.fin)) + '</p></div>' +
        boton('nueva-reserva', '+ Añadir reserva', 'btn--primario') +
        boton('pegar-reserva', '📋 Pegar confirmación', '') +
        '</div>';

      html += '<div class="rejilla-resumen">' + cuentaAtras(viaje);

      if (proxima) {
        var meta = D.tipo(proxima.tipo);
        html += '<div class="tarjeta tarjeta--destacada">' +
          '<div class="tarjeta__rotulo">Lo siguiente</div>' +
          '<div class="proxima">' +
          '<span class="proxima__icono">' + meta.icono + '</span>' +
          '<div><strong>' + U.esc(proxima.titulo) + '</strong>' +
          '<div class="apagado">' + U.esc(U.fechaDia(U.soloDia(proxima.inicio))) +
          (U.soloHora(proxima.inicio) ? ' · ' + U.soloHora(proxima.inicio) : '') +
          ' · ' + U.esc(U.cuando(U.soloDia(proxima.inicio))) + '</div></div></div>' +
          '<a class="btn btn--pequeno btn--fantasma" href="#/itinerario">Ver en el itinerario</a>' +
          '</div>';
      } else {
        html += '<div class="tarjeta">' +
          '<div class="tarjeta__rotulo">Lo siguiente</div>' +
          '<p class="apagado">No hay ninguna reserva por delante. Pega una confirmación y se coloca sola en el itinerario.</p>' +
          boton('pegar-reserva', '📋 Pegar una confirmación', 'btn--pequeno') +
          '</div>';
      }

      html += '</div>';

      html += '<div class="fichas">' +
        tarjetaDato('📅', r.dias, r.dias === 1 ? 'día de viaje' : 'días de viaje',
          r.dias ? U.porcentaje(r.diasPlanificados, r.dias) + '% con algo planeado' : '') +
        tarjetaDato('🎫', r.reservas, r.reservas === 1 ? 'reserva' : 'reservas',
          r.vuelos ? U.plural(r.vuelos, 'vuelo') : '') +
        tarjetaDato('🏨', r.noches, r.noches === 1 ? 'noche reservada' : 'noches reservadas',
          r.dias > 1 ? 'de ' + (r.dias - 1) + ' necesarias' : '') +
        tarjetaDato('📍', r.lugares, 'lugares guardados',
          r.lugaresVistos ? r.lugaresVistos + ' ya visitados' : '') +
        '</div>';

      // Gastos, equipaje y pendientes, uno al lado del otro.
      html += '<div class="tres-columnas">';

      html += '<div class="tarjeta"><div class="tarjeta__rotulo">Gastos</div>' +
        '<div class="cifra-grande">' + U.dinero(g.total, viaje.monedaBase) + '</div>';
      if (g.presupuesto) {
        var pct = U.porcentaje(g.total, g.presupuesto);
        html += '<p class="apagado">de ' + U.dinero(g.presupuesto, viaje.monedaBase) +
          ' de presupuesto (' + pct + '%)</p>' +
          barra(pct, pct > 100 ? 'var(--rojo)' : pct > 85 ? 'var(--ambar)' : 'var(--verde)');
      } else {
        html += '<p class="apagado">Sin presupuesto fijado.</p>';
      }
      if (g.pendiente) {
        html += '<p class="apagado">Queda por pagar ' + U.dinero(g.pendiente, viaje.monedaBase) + '.</p>';
      }
      html += '<a class="btn btn--pequeno btn--fantasma" href="#/gastos">Ver los gastos</a></div>';

      html += '<div class="tarjeta"><div class="tarjeta__rotulo">Equipaje</div>' +
        '<div class="cifra-grande">' + r.equipajeListo + ' / ' + r.equipajeTotal + '</div>' +
        '<p class="apagado">' + (r.equipajeTotal
          ? 'cosas metidas en la maleta'
          : 'Aún no has hecho la lista.') + '</p>' +
        (r.equipajeTotal ? barra(U.porcentaje(r.equipajeListo, r.equipajeTotal), 'var(--verde)') : '') +
        '<a class="btn btn--pequeno btn--fantasma" href="#/equipaje">Ver la lista</a></div>';

      html += '<div class="tarjeta"><div class="tarjeta__rotulo">Pendientes</div>' +
        '<div class="cifra-grande">' + r.pendientesHechos + ' / ' + r.pendientesTotal + '</div>' +
        '<p class="apagado">' + (r.pendientesTotal
          ? (r.pendientesVencidos
            ? U.plural(r.pendientesVencidos, 'tarea') + ' con la fecha pasada'
            : 'tareas resueltas')
          : 'No hay nada apuntado.') + '</p>' +
        (r.pendientesTotal
          ? barra(U.porcentaje(r.pendientesHechos, r.pendientesTotal),
              r.pendientesVencidos ? 'var(--rojo)' : 'var(--verde)')
          : '') +
        '<a class="btn btn--pequeno btn--fantasma" href="#/pendientes">Ver las tareas</a></div>';

      html += '</div>';

      if (viaje.notasGenerales) {
        html += '<div class="tarjeta"><div class="tarjeta__rotulo">Notas del viaje</div>' +
          '<div class="texto-largo">' + U.esc(viaje.notasGenerales) + '</div></div>';
      }

      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Itinerario
     ══════════════════════════════════════════════════════════ */

  function eventoHtml(evento, viaje) {
    var meta = D.tipo(evento.tipo);
    var esReserva = evento.clase === 'reserva';
    var fuente = esReserva ? evento.reserva : evento.actividad;
    var id = fuente.id;

    var lineas = [];
    if (esReserva) {
      var r = evento.reserva;
      if (evento.momento === 'inicio' && r.desde && r.hasta) {
        lineas.push(U.esc(r.desde.nombre) + ' → ' + U.esc(r.hasta.nombre));
      } else if (r.desde && r.desde.direccion) {
        lineas.push(U.esc(r.desde.direccion));
      }
      if (r.localizador) lineas.push('Localizador <code>' + U.esc(r.localizador) + '</code>');
      if (r.detalles && r.detalles.asiento) lineas.push('Asiento ' + U.esc(r.detalles.asiento));
      if (r.detalles && r.detalles.coche) lineas.push('Coche ' + U.esc(r.detalles.coche));
      if (r.detalles && r.detalles.terminal) lineas.push('Terminal ' + U.esc(r.detalles.terminal));
      if (evento.momento === 'inicio' && r.inicio && r.fin && !D.tipo(r.tipo).estancia) {
        var dur = U.duracion(r.inicio, r.fin);
        if (dur) lineas.push('Duración ' + dur);
      }
    } else {
      var a = evento.actividad;
      if (a.lugar) lineas.push(U.esc(a.lugar));
      if (a.duracion) lineas.push(U.esc(a.duracion));
      // Sin recortar: aquí es donde acaban los avisos que hay que leer
      // enteros ("no aceptan tarjeta", "el último tren sale a las…").
      if (a.notas) lineas.push(U.esc(a.notas));
    }

    return '<li class="evento evento--' + meta.color + '">' +
      '<div class="evento__hora">' + (evento.hora ? U.esc(evento.hora) : '<span class="apagado">—</span>') + '</div>' +
      '<div class="evento__punto">' + meta.icono + '</div>' +
      '<div class="evento__cuerpo">' +
      '<div class="evento__titulo">' + U.esc(evento.titulo) +
      (esReserva && evento.reserva.estado === 'pendiente'
        ? ' <span class="etiqueta etiqueta--ambar">Sin confirmar</span>' : '') +
      '</div>' +
      (lineas.length ? '<div class="evento__detalle">' + lineas.join(' · ') + '</div>' : '') +
      '</div>' +
      '<div class="evento__acciones">' +
      '<button class="btn btn--icono btn--pequeno" data-accion="' +
      (esReserva ? 'editar-reserva' : 'editar-actividad') + '" data-id="' + id +
      '" title="Editar">✏️</button>' +
      '</div>' +
      '</li>';
  }

  V.itinerario = {
    titulo: 'Itinerario',
    html: function (viaje) {
      var dias = D.diasViaje(viaje.id);

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Itinerario</h1>' +
        '<p>' + (dias.length
          ? U.plural(dias.length, 'día') + ' · ' + U.esc(U.rangoTexto(dias[0], dias[dias.length - 1]))
          : 'Sin fechas todavía') + '</p></div>' +
        boton('nueva-actividad', '+ Añadir plan', 'btn--primario') +
        boton('pegar-reserva', '📋 Pegar confirmación', '') +
        '</div>';

      if (!dias.length) {
        return html + vacio('🗓️', 'El viaje no tiene fechas',
          'Ponle fecha de ida y de vuelta al viaje, o añade una reserva, y aquí saldrá el día a día.',
          boton('editar-viaje', 'Poner las fechas', 'btn--primario'));
      }

      // Cinta para saltar de un día a otro.
      html += '<div class="cinta-dias">';
      dias.forEach(function (dia, i) {
        var eventos = D.eventosDelDia(dia, viaje.id);
        var esHoy = dia === U.isoHoy();
        html += '<a class="cinta-dias__dia' + (esHoy ? ' cinta-dias__dia--hoy' : '') +
          (eventos.length ? ' cinta-dias__dia--lleno' : '') + '" href="#dia-' + dia + '">' +
          '<span class="cinta-dias__num">' + (i + 1) + '</span>' +
          '<span class="cinta-dias__fecha">' + U.diaCorto(dia) + ' ' + U.aFecha(dia).getDate() + '</span>' +
          '<span class="cinta-dias__puntos">' + (eventos.length ? '•'.repeat(Math.min(eventos.length, 4)) : '') + '</span>' +
          '</a>';
      });
      html += '</div>';

      dias.forEach(function (dia, i) {
        var eventos = D.eventosDelDia(dia, viaje.id);
        var alojamiento = D.alojamientoDe(dia, viaje.id);
        var esHoy = dia === U.isoHoy();

        html += '<section class="dia' + (esHoy ? ' dia--hoy' : '') + '" id="dia-' + dia + '">' +
          '<header class="dia__cabecera">' +
          '<div><span class="dia__numero">Día ' + (i + 1) + '</span>' +
          '<h2>' + U.esc(U.mayus1(U.fechaDia(dia))) + '</h2></div>' +
          (esHoy ? '<span class="etiqueta etiqueta--acento">Hoy</span>' : '') +
          '<div class="crece"></div>' +
          '<button class="btn btn--pequeno btn--fantasma" data-accion="nota-dia" data-dia="' + dia + '">📝</button>' +
          '<button class="btn btn--pequeno" data-accion="nueva-actividad" data-dia="' + dia + '">+ Añadir</button>' +
          '</header>';

        var nota = D.notaDia(dia, viaje.id);
        if (nota) {
          html += '<div class="dia__nota">' + U.esc(nota) + '</div>';
        }

        if (alojamiento) {
          html += '<div class="dia__cama">🛏️ Duermes en <strong>' +
            U.esc(alojamiento.titulo) + '</strong></div>';
        }

        if (!eventos.length) {
          html += '<p class="dia__vacio">Día libre. Nada planificado todavía.</p>';
        } else {
          html += '<ul class="linea-tiempo">';
          // Lo que no tiene hora va detrás de lo que sí la tiene. Sin avisar
          // parece que el orden está mal, así que se separa con un rótulo.
          var huboConHora = false, cortePuesto = false;
          eventos.forEach(function (e) {
            if (e.hora) {
              huboConHora = true;
            } else if (huboConHora && !cortePuesto) {
              html += '<li class="corte">Sin hora fija</li>';
              cortePuesto = true;
            }
            html += eventoHtml(e, viaje);
          });
          html += '</ul>';
        }
        html += '</section>';
      });

      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Reservas
     ══════════════════════════════════════════════════════════ */

  function tarjetaReserva(r, viaje) {
    var meta = D.tipo(r.tipo);
    var cancelada = r.estado === 'cancelada';

    var filas = '';
    if (r.desde && r.hasta) {
      filas += '<div class="ruta">' +
        '<div class="ruta__lado"><strong>' + (U.soloHora(r.inicio) || '—') + '</strong>' +
        '<span>' + U.esc(r.desde.nombre) + '</span>' +
        '<small>' + U.esc(U.fechaCorta(U.soloDia(r.inicio))) + '</small></div>' +
        '<div class="ruta__flecha">' + (U.duracion(r.inicio, r.fin) || '→') + '</div>' +
        '<div class="ruta__lado"><strong>' + (U.soloHora(r.fin) || '—') + '</strong>' +
        '<span>' + U.esc(r.hasta.nombre) + '</span>' +
        '<small>' + U.esc(U.fechaCorta(U.soloDia(r.fin))) + '</small></div>' +
        '</div>';
    } else if (meta.estancia) {
      filas += '<div class="ruta">' +
        '<div class="ruta__lado"><strong>Entrada</strong>' +
        '<span>' + U.esc(U.fechaCorta(U.soloDia(r.inicio))) + '</span>' +
        '<small>' + U.esc(U.soloHora(r.inicio) || '') + '</small></div>' +
        '<div class="ruta__flecha">' + U.plural(U.diasEntre(r.inicio, r.fin) || 0, 'noche') + '</div>' +
        '<div class="ruta__lado"><strong>Salida</strong>' +
        '<span>' + U.esc(U.fechaCorta(U.soloDia(r.fin))) + '</span>' +
        '<small>' + U.esc(U.soloHora(r.fin) || '') + '</small></div>' +
        '</div>';
    } else if (r.inicio) {
      filas += '<div class="apagado">' + U.esc(U.mayus1(U.fechaDia(U.soloDia(r.inicio)))) +
        (U.soloHora(r.inicio) ? ' a las ' + U.soloHora(r.inicio) : '') + '</div>';
    }

    var detalles = '';
    if (r.localizador) detalles += dato('Localizador', '<code>' + U.esc(r.localizador) + '</code>');
    if (r.proveedor) detalles += dato('Proveedor', U.esc(r.proveedor));
    if (r.detalles) {
      if (r.detalles.asiento) detalles += dato('Asiento', U.esc(r.detalles.asiento));
      if (r.detalles.coche) detalles += dato('Coche', U.esc(r.detalles.coche));
      if (r.detalles.terminal) detalles += dato('Terminal', U.esc(r.detalles.terminal));
      if (r.detalles.habitacion) detalles += dato('Habitación', U.esc(r.detalles.habitacion));
      if (r.detalles.personas) detalles += dato('Personas', r.detalles.personas);
      if (r.detalles.direccion) detalles += dato('Dirección', U.esc(r.detalles.direccion));
    }
    if (r.precio && r.precio.cantidad) detalles += dato('Precio', precioTexto(r.precio, viaje));

    return '<article class="tarjeta reserva' + (cancelada ? ' reserva--cancelada' : '') + '">' +
      '<header class="reserva__cabecera">' +
      chipTipo(r.tipo) +
      '<h3 class="crece">' + U.esc(r.titulo) + '</h3>' +
      (cancelada ? '<span class="etiqueta etiqueta--rojo">Cancelada</span>' : '') +
      (r.estado === 'pendiente' ? '<span class="etiqueta etiqueta--ambar">Sin confirmar</span>' : '') +
      '</header>' +
      filas +
      (detalles ? '<dl class="datos">' + detalles + '</dl>' : '') +
      (r.notas ? '<p class="reserva__notas">' + U.esc(r.notas) + '</p>' : '') +
      '<footer class="reserva__pie">' +
      (r.textoOriginal
        ? '<button class="btn btn--pequeno btn--fantasma" data-accion="ver-original" data-id="' + r.id + '">Ver el correo</button>'
        : '') +
      '<div class="crece"></div>' +
      '<button class="btn btn--pequeno" data-accion="editar-reserva" data-id="' + r.id + '">Editar</button>' +
      '<button class="btn btn--pequeno btn--peligro" data-accion="borrar-reserva" data-id="' + r.id + '">Borrar</button>' +
      '</footer>' +
      '</article>';
  }

  V.reservas = {
    titulo: 'Reservas',
    html: function (viaje, estado) {
      var filtro = (estado && estado.filtro) || 'todas';
      var lista = viaje.reservas.slice();
      if (filtro !== 'todas') {
        lista = lista.filter(function (r) { return r.tipo === filtro; });
      }
      lista = U.ordenarPor(lista, function (r) { return r.inicio || '9999'; });

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Reservas</h1>' +
        '<p>' + U.plural(viaje.reservas.length, 'reserva') + ' guardada' +
        (viaje.reservas.length === 1 ? '' : 's') + '</p></div>' +
        boton('pegar-reserva', '📋 Pegar confirmación', 'btn--primario') +
        boton('nueva-reserva', '+ A mano', '') +
        '</div>';

      // Filtros por tipo, solo con los tipos que existan.
      var usados = {};
      viaje.reservas.forEach(function (r) { usados[r.tipo] = (usados[r.tipo] || 0) + 1; });
      var claves = Object.keys(usados);
      if (claves.length > 1) {
        html += '<div class="filtros">' +
          '<button class="filtro' + (filtro === 'todas' ? ' filtro--activo' : '') +
          '" data-accion="filtrar-reservas" data-filtro="todas">Todas (' + viaje.reservas.length + ')</button>';
        claves.forEach(function (tipo) {
          var meta = D.tipo(tipo);
          html += '<button class="filtro' + (filtro === tipo ? ' filtro--activo' : '') +
            '" data-accion="filtrar-reservas" data-filtro="' + tipo + '">' +
            meta.icono + ' ' + U.esc(meta.etiqueta) + ' (' + usados[tipo] + ')</button>';
        });
        html += '</div>';
      }

      if (!lista.length) {
        return html + vacio('🎫',
          viaje.reservas.length ? 'Nada de este tipo' : 'Todavía no hay reservas',
          viaje.reservas.length
            ? 'Prueba con otro filtro.'
            : 'Copia el correo de confirmación del vuelo o del hotel, pégalo aquí y se rellena solo.',
          boton('pegar-reserva', '📋 Pegar una confirmación', 'btn--primario'));
      }

      html += '<div class="lista-reservas">';
      lista.forEach(function (r) { html += tarjetaReserva(r, viaje); });
      html += '</div>';
      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Lugares
     ══════════════════════════════════════════════════════════ */

  V.lugares = {
    titulo: 'Lugares',
    html: function (viaje, estado) {
      var busqueda = U.normalizar((estado && estado.busqueda) || '');
      var lista = viaje.lugares.filter(function (l) {
        if (!busqueda) return true;
        return U.normalizar(l.nombre + ' ' + (l.ciudad || '') + ' ' + (l.notas || '')).indexOf(busqueda) !== -1;
      });

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Lugares</h1>' +
        '<p>Lo que quieres ver, con o sin fecha todavía</p></div>' +
        boton('nuevo-lugar', '+ Añadir lugar', 'btn--primario') +
        boton('sugerencias', '✨ Sugerencias', '') +
        '</div>';

      if (!viaje.lugares.length) {
        return html + vacio('📍', 'Aún no has guardado ningún sitio',
          'Ve apuntando lo que te apetezca ver y luego lo repartes por días en el itinerario.',
          boton('sugerencias', '✨ Ver sugerencias de Japón', 'btn--primario'));
      }

      html += '<div class="barra-busqueda">' +
        '<input type="search" id="buscarLugar" placeholder="Buscar entre tus lugares…" value="' +
        U.esc((estado && estado.busqueda) || '') + '">' +
        '</div>';

      var porCiudad = U.agrupar(
        U.ordenarPor(lista, function (l) { return U.normalizar(l.ciudad || 'zzz'); }),
        function (l) { return l.ciudad || 'Sin ciudad'; }
      );

      Object.keys(porCiudad).forEach(function (ciudad) {
        html += '<section class="seccion">' +
          '<div class="seccion__titulo"><h2>' + U.esc(ciudad) + '</h2>' +
          '<span class="contador">' + porCiudad[ciudad].length + '</span></div>' +
          '<div class="rejilla-lugares">';

        porCiudad[ciudad].forEach(function (l) {
          var cat = D.CATEGORIAS_LUGAR[l.categoria] || D.CATEGORIAS_LUGAR.otro;
          html += '<article class="lugar' + (l.visitado ? ' lugar--visitado' : '') + '">' +
            '<div class="lugar__cabecera">' +
            '<span class="lugar__icono">' + cat.icono + '</span>' +
            '<h3 class="crece">' + U.esc(l.nombre) + '</h3>' +
            '<button class="btn btn--icono btn--pequeno" data-accion="visitado" data-id="' + l.id +
            '" title="' + (l.visitado ? 'Marcar como pendiente' : 'Marcar como visitado') + '">' +
            (l.visitado ? '✅' : '⬜') + '</button>' +
            '</div>' +
            '<div class="lugar__meta">' + U.esc(cat.etiqueta) +
            (l.lat && l.lon ? ' · <span class="apagado">en el mapa</span>' : '') + '</div>' +
            (l.notas ? '<p class="lugar__notas">' + U.esc(U.recortar(l.notas, 140)) + '</p>' : '') +
            '<div class="lugar__acciones">' +
            '<button class="btn btn--pequeno" data-accion="lugar-al-itinerario" data-id="' + l.id + '">Al itinerario</button>' +
            '<button class="btn btn--pequeno btn--fantasma" data-accion="editar-lugar" data-id="' + l.id + '">Editar</button>' +
            (U.enlaceMapa(l) ? '<a class="btn btn--pequeno btn--fantasma" href="' + U.enlaceMapa(l) +
              '" target="_blank" rel="noopener">Mapa</a>' : '') +
            '</div>' +
            '</article>';
        });
        html += '</div></section>';
      });

      return html;
    },
    activar: function () {
      var campo = document.getElementById('buscarLugar');
      if (!campo) return;
      campo.addEventListener('input', U.debounce(function () {
        App.estado.busqueda = campo.value;
        App.pintar(true);
        var nuevo = document.getElementById('buscarLugar');
        if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length); }
      }, 250));
    }
  };

  /* ══════════════════════════════════════════════════════════
     Mapa
     ══════════════════════════════════════════════════════════ */

  /** Reúne todo lo que tenga coordenadas: reservas y lugares. */
  function puntosDelViaje(viaje) {
    var puntos = [];
    viaje.reservas.forEach(function (r) {
      if (r.estado === 'cancelada') return;
      var meta = D.tipo(r.tipo);
      [r.desde, r.hasta].forEach(function (lugar, i) {
        if (!lugar || typeof lugar.lat !== 'number') return;
        puntos.push({
          lat: lugar.lat, lon: lugar.lon, tipo: r.tipo, icono: meta.icono,
          titulo: lugar.nombre,
          subtitulo: r.titulo + (i === 0 ? '' : ' (llegada)')
        });
      });
    });
    viaje.lugares.forEach(function (l) {
      if (typeof l.lat !== 'number') return;
      var cat = D.CATEGORIAS_LUGAR[l.categoria] || D.CATEGORIAS_LUGAR.otro;
      puntos.push({
        lat: l.lat, lon: l.lon, tipo: 'lugar', icono: cat.icono,
        titulo: l.nombre, subtitulo: l.ciudad || cat.etiqueta
      });
    });
    return puntos;
  }

  V.mapa = {
    titulo: 'Mapa',
    html: function (viaje) {
      var puntos = puntosDelViaje(viaje);
      var sinUbicar = viaje.lugares.filter(function (l) { return typeof l.lat !== 'number'; });
      var reservasSinUbicar = viaje.reservas.filter(function (r) {
        return r.estado !== 'cancelada' && r.desde && typeof r.desde.lat !== 'number';
      });

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Mapa</h1>' +
        '<p>' + U.plural(puntos.length, 'punto') + ' en el mapa</p></div>' +
        boton('nuevo-lugar', '+ Añadir lugar', '') +
        '</div>';

      html += '<div id="mapa" class="mapa"></div>';

      if (sinUbicar.length || reservasSinUbicar.length) {
        html += '<section class="seccion"><div class="seccion__titulo">' +
          '<h2>Sin situar en el mapa</h2>' +
          '<span class="contador">' + (sinUbicar.length + reservasSinUbicar.length) + '</span></div>' +
          '<p class="apagado">Estos sitios no tienen coordenadas. Pulsa «Localizar» y se buscan en OpenStreetMap, ' +
          'o edítalos y pega un enlace de Google Maps.</p>' +
          '<div class="lista-simple">';

        sinUbicar.forEach(function (l) {
          html += '<div class="fila">' +
            '<span class="crece">📍 ' + U.esc(l.nombre) +
            (l.ciudad ? ' <span class="apagado">· ' + U.esc(l.ciudad) + '</span>' : '') + '</span>' +
            '<button class="btn btn--pequeno" data-accion="localizar-lugar" data-id="' + l.id + '">Localizar</button>' +
            '</div>';
        });
        reservasSinUbicar.forEach(function (r) {
          html += '<div class="fila">' +
            '<span class="crece">' + D.tipo(r.tipo).icono + ' ' + U.esc(r.titulo) +
            (r.desde.direccion ? ' <span class="apagado">· ' + U.esc(U.recortar(r.desde.direccion, 50)) + '</span>' : '') +
            '</span>' +
            '<button class="btn btn--pequeno" data-accion="localizar-reserva" data-id="' + r.id + '">Localizar</button>' +
            '</div>';
        });
        html += '</div></section>';
      }

      return html;
    },
    activar: function (viaje) {
      var contenedor = document.getElementById('mapa');
      if (!contenedor) return;
      M.pintar(contenedor, puntosDelViaje(viaje)).catch(function (e) {
        contenedor.innerHTML = '<div class="mapa__error">' + U.esc(e.message) + '</div>';
        contenedor.classList.add('mapa--error');
      });
    }
  };

  /* ══════════════════════════════════════════════════════════
     Gastos
     ══════════════════════════════════════════════════════════ */

  V.gastos = {
    titulo: 'Gastos',
    html: function (viaje) {
      var g = D.resumenGastos(viaje.id);

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Gastos</h1>' +
        '<p>Las reservas con precio ya cuentan aquí</p></div>' +
        boton('nuevo-gasto', '+ Añadir gasto', 'btn--primario') +
        boton('editar-viaje', '⚙️ Presupuesto y cambio', '') +
        '</div>';

      html += '<div class="dos-columnas">';

      html += '<div class="tarjeta">' +
        '<div class="tarjeta__rotulo">Total del viaje</div>' +
        '<div class="cifra-grande">' + U.dinero(g.total, viaje.monedaBase) + '</div>';
      if (g.presupuesto) {
        var pct = U.porcentaje(g.total, g.presupuesto);
        html += '<p class="apagado">de ' + U.dinero(g.presupuesto, viaje.monedaBase) + ' (' + pct + '%)</p>' +
          barra(pct, pct > 100 ? 'var(--rojo)' : pct > 85 ? 'var(--ambar)' : 'var(--verde)') +
          '<p class="apagado">' + (g.total > g.presupuesto
            ? 'Te has pasado ' + U.dinero(g.total - g.presupuesto, viaje.monedaBase) + '.'
            : 'Te quedan ' + U.dinero(g.presupuesto - g.total, viaje.monedaBase) + '.') + '</p>';
      } else {
        html += '<p class="apagado">Sin presupuesto fijado.</p>';
      }
      if (viaje.moneda !== viaje.monedaBase) {
        html += '<p class="apagado">Cambio: 1 ' + U.esc(viaje.moneda) + ' = ' +
          viaje.cambio + ' ' + U.esc(viaje.monedaBase) + '</p>';
      }
      html += '</div>';

      html += '<div class="tarjeta"><div class="tarjeta__rotulo">Por categoría</div>';
      var categorias = Object.keys(g.porCategoria).sort(function (a, b) {
        return g.porCategoria[b] - g.porCategoria[a];
      });
      if (!categorias.length) {
        html += '<p class="apagado">Todavía no hay ningún importe apuntado.</p>';
      } else {
        categorias.forEach(function (c) {
          var meta = D.CATEGORIAS_GASTO[c] || D.CATEGORIAS_GASTO.otro;
          var importe = g.porCategoria[c];
          html += '<div class="categoria">' +
            '<div class="categoria__fila"><span>' + meta.icono + ' ' + U.esc(meta.etiqueta) + '</span>' +
            '<strong>' + U.dinero(importe, viaje.monedaBase) + '</strong></div>' +
            barra(U.porcentaje(importe, g.total)) +
            '</div>';
        });
      }
      html += '</div></div>';

      // Reservas con precio: se ven aquí pero se editan en Reservas.
      var conPrecio = viaje.reservas.filter(function (r) {
        return r.estado !== 'cancelada' && r.precio && Number(r.precio.cantidad) && !r.excluirGasto;
      });
      if (conPrecio.length) {
        html += '<section class="seccion"><div class="seccion__titulo">' +
          '<h2>Reservas</h2><span class="contador">' + conPrecio.length + '</span></div>' +
          '<div class="lista-simple">';
        U.ordenarPor(conPrecio, function (r) { return r.inicio || '9999'; }).forEach(function (r) {
          html += '<div class="fila">' +
            '<span class="fila__icono">' + D.tipo(r.tipo).icono + '</span>' +
            '<span class="crece">' + U.esc(r.titulo) +
            '<small class="apagado"> · ' + U.esc(U.fechaCorta(U.soloDia(r.inicio))) + '</small></span>' +
            '<span>' + precioTexto(r.precio, viaje) + '</span>' +
            '<button class="btn btn--pequeno btn--fantasma" data-accion="editar-reserva" data-id="' + r.id + '">Editar</button>' +
            '</div>';
        });
        html += '</div></section>';
      }

      html += '<section class="seccion"><div class="seccion__titulo">' +
        '<h2>Otros gastos</h2><span class="contador">' + viaje.gastos.length + '</span></div>';
      if (!viaje.gastos.length) {
        html += '<p class="apagado">Aquí van las comidas, los caprichos y todo lo que no sea una reserva.</p>';
      } else {
        html += '<div class="lista-simple">';
        U.ordenarPor(viaje.gastos, function (x) { return x.fecha || '9999'; }).forEach(function (x) {
          var meta = D.CATEGORIAS_GASTO[x.categoria] || D.CATEGORIAS_GASTO.otro;
          html += '<div class="fila">' +
            '<span class="fila__icono">' + meta.icono + '</span>' +
            '<span class="crece">' + U.esc(x.concepto) +
            (x.fecha ? '<small class="apagado"> · ' + U.esc(U.fechaCorta(x.fecha)) + '</small>' : '') +
            (x.pagado === false ? ' <span class="etiqueta etiqueta--ambar">Sin pagar</span>' : '') +
            '</span>' +
            '<span>' + precioTexto({ cantidad: x.cantidad, moneda: x.moneda }, viaje) + '</span>' +
            '<button class="btn btn--pequeno btn--fantasma" data-accion="editar-gasto" data-id="' + x.id + '">Editar</button>' +
            '<button class="btn btn--pequeno btn--peligro" data-accion="borrar-gasto" data-id="' + x.id + '">✕</button>' +
            '</div>';
        });
        html += '</div>';
      }
      html += '</section>';

      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Equipaje
     ══════════════════════════════════════════════════════════ */

  V.equipaje = {
    titulo: 'Equipaje',
    html: function (viaje) {
      var total = viaje.equipaje.length;
      var listos = viaje.equipaje.filter(function (e) { return e.hecho; }).length;

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Equipaje</h1>' +
        '<p>' + (total ? listos + ' de ' + total + ' metidos en la maleta' : 'Lista vacía') + '</p></div>' +
        boton('nuevo-equipaje', '+ Añadir cosa', 'btn--primario') +
        boton('plantilla-equipaje', '📋 Lista para Japón', '') +
        '</div>';

      if (!total) {
        return html + vacio('🧳', 'La maleta está por hacer',
          'Añade lo que no se te puede olvidar. Hay una lista básica para Japón por si te sirve de arranque.',
          boton('plantilla-equipaje', '📋 Usar la lista para Japón', 'btn--primario'));
      }

      html += '<div class="tarjeta">' + barra(U.porcentaje(listos, total), 'var(--verde)') + '</div>';

      var grupos = U.agrupar(viaje.equipaje, function (e) { return e.grupo || 'General'; });
      Object.keys(grupos).forEach(function (grupo) {
        var items = grupos[grupo];
        var hechos = items.filter(function (e) { return e.hecho; }).length;
        html += '<section class="seccion">' +
          '<div class="seccion__titulo"><h2>' + U.esc(grupo) + '</h2>' +
          '<span class="contador">' + hechos + '/' + items.length + '</span></div>' +
          '<div class="lista-simple">';
        items.forEach(function (e) {
          html += '<label class="fila fila--pulsable' + (e.hecho ? ' fila--hecha' : '') + '">' +
            '<input type="checkbox" data-accion="marcar-equipaje" data-id="' + e.id + '"' +
            (e.hecho ? ' checked' : '') + '>' +
            '<span class="crece">' + U.esc(e.nombre) +
            (e.cantidad > 1 ? ' <span class="apagado">×' + e.cantidad + '</span>' : '') + '</span>' +
            '<button class="btn btn--pequeno btn--peligro" data-accion="borrar-equipaje" data-id="' + e.id + '">✕</button>' +
            '</label>';
        });
        html += '</div></section>';
      });

      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Pendientes
     ══════════════════════════════════════════════════════════ */

  V.pendientes = {
    titulo: 'Pendientes',
    html: function (viaje) {
      var total = viaje.pendientes.length;
      var hechos = viaje.pendientes.filter(function (p) { return p.hecho; }).length;
      var hoy = U.isoHoy();

      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Pendientes</h1>' +
        '<p>' + (total ? hechos + ' de ' + total + ' resueltos' : 'Sin tareas') + '</p></div>' +
        boton('nuevo-pendiente', '+ Añadir tarea', 'btn--primario') +
        '</div>';

      if (!total) {
        return html + vacio('✅', 'No hay nada pendiente',
          'Aquí van las cosas con fecha límite: reservar el shinkansen, comprar entradas, escribir al ryokan.',
          boton('nuevo-pendiente', '+ Añadir la primera', 'btn--primario'));
      }

      var vencidos = viaje.pendientes.filter(function (p) {
        return !p.hecho && p.fecha && p.fecha < hoy;
      });
      if (vencidos.length) {
        html += '<div class="avisos avisos--rojo">' +
          '<strong>' + U.plural(vencidos.length, 'tarea') + ' con la fecha pasada</strong> ' +
          'y sin marcar: ' + U.esc(vencidos.map(function (p) { return p.titulo; })
            .map(function (t) { return U.recortar(t, 40); }).join('; ')) + '.' +
          '</div>';
      }

      html += '<div class="tarjeta">' + barra(U.porcentaje(hechos, total), 'var(--verde)') + '</div>';

      // Se conserva el orden en que están guardadas: los grupos vienen de
      // menos a más lejano en el tiempo y reordenarlos lo empeoraría.
      var grupos = U.agrupar(viaje.pendientes, function (p) { return p.grupo || 'General'; });

      Object.keys(grupos).forEach(function (grupo) {
        var items = grupos[grupo];
        var listos = items.filter(function (p) { return p.hecho; }).length;
        html += '<section class="seccion">' +
          '<div class="seccion__titulo"><h2>' + U.esc(grupo) + '</h2>' +
          '<span class="contador">' + listos + '/' + items.length + '</span></div>' +
          '<div class="lista-simple">';

        U.ordenarPor(items, function (p) { return p.fecha || '9999'; }).forEach(function (p) {
          var vencido = !p.hecho && p.fecha && p.fecha < hoy;
          html += '<div class="pendiente' + (p.hecho ? ' pendiente--hecho' : '') +
            (vencido ? ' pendiente--vencido' : '') + '">' +
            '<input type="checkbox" data-accion="marcar-pendiente" data-id="' + p.id + '"' +
            (p.hecho ? ' checked' : '') + ' aria-label="Marcar como hecho">' +
            '<div class="crece">' +
            '<div class="pendiente__titulo">' + U.esc(p.titulo) + '</div>' +
            (p.notas ? '<div class="pendiente__notas">' + U.esc(p.notas) + '</div>' : '') +
            '</div>' +
            (p.fecha
              ? '<span class="etiqueta' + (vencido ? ' etiqueta--rojo' : p.hecho ? '' : ' etiqueta--ambar') + '">' +
                U.esc(U.fechaCorta(p.fecha)) + ' · ' + U.esc(U.cuando(p.fecha)) + '</span>'
              : '') +
            '<button class="btn btn--pequeno btn--fantasma" data-accion="editar-pendiente" data-id="' + p.id + '">Editar</button>' +
            '<button class="btn btn--pequeno btn--peligro" data-accion="borrar-pendiente" data-id="' + p.id + '">✕</button>' +
            '</div>';
        });
        html += '</div></section>';
      });

      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Viajes
     ══════════════════════════════════════════════════════════ */

  V.viajes = {
    titulo: 'Viajes',
    html: function (viaje) {
      var todos = D.viajes();
      var html = '<div class="vista__cabecera">' +
        '<div class="crece"><h1>Mis viajes</h1>' +
        '<p>' + U.plural(todos.length, 'viaje') + ' guardado' + (todos.length === 1 ? '' : 's') + '</p></div>' +
        boton('nuevo-viaje', '+ Nuevo viaje', 'btn--primario') +
        '</div>';

      html += '<div class="rejilla-viajes">';
      todos.forEach(function (v) {
        var r = D.resumen(v.id);
        var activo = v.id === viaje.id;
        var pasado = v.fin && U.diasHasta(v.fin) < 0;
        html += '<article class="viaje' + (activo ? ' viaje--activo' : '') + '">' +
          '<div class="viaje__emoji">' + U.esc(v.emoji) + '</div>' +
          '<h3>' + U.esc(v.nombre) + '</h3>' +
          '<div class="viaje__fechas">' + U.esc(U.rangoTexto(v.inicio, v.fin)) + '</div>' +
          '<div class="viaje__estado">' +
          (activo ? '<span class="etiqueta etiqueta--acento">Viaje activo</span>' :
            pasado ? '<span class="etiqueta">Terminado</span>' :
            v.inicio ? '<span class="etiqueta">' + U.esc(U.cuando(v.inicio)) + '</span>' : '') +
          '</div>' +
          '<div class="viaje__cifras">' +
          U.plural(r.reservas, 'reserva') + ' · ' + U.plural(r.lugares, 'lugar', 'lugares') +
          ' · ' + U.dinero(r.gastos.total, v.monedaBase) +
          '</div>' +
          '<div class="viaje__acciones">' +
          (activo ? '' : '<button class="btn btn--pequeno btn--primario" data-accion="activar-viaje" data-id="' + v.id + '">Abrir</button>') +
          '<button class="btn btn--pequeno" data-accion="editar-viaje" data-id="' + v.id + '">Editar</button>' +
          '<button class="btn btn--pequeno btn--fantasma" data-accion="duplicar-viaje" data-id="' + v.id + '">Duplicar</button>' +
          '<button class="btn btn--pequeno btn--peligro" data-accion="borrar-viaje" data-id="' + v.id + '">Borrar</button>' +
          '</div>' +
          '</article>';
      });
      html += '</div>';
      return html;
    }
  };

  /* ══════════════════════════════════════════════════════════
     Ajustes
     ══════════════════════════════════════════════════════════ */

  V.ajustes = {
    titulo: 'Ajustes',
    html: function () {
      var cfg = GH.config();
      var estado = !GH.configurado() ? 'Sin configurar'
        : GH.bloqueado() ? 'Configurado, bloqueado en esta sesión'
        : 'Listo para publicar';

      var html = '<div class="vista__cabecera"><div class="crece"><h1>Ajustes</h1>' +
        '<p>Publicación, copias de seguridad y datos</p></div></div>';

      html += '<section class="seccion"><h2>Publicar en GitHub</h2>' +
        '<div class="tarjeta">' +
        '<p class="apagado">Los cambios se guardan en este navegador. Para que queden en el repositorio ' +
        'y los veas desde el móvil, hay que publicarlos.</p>' +
        '<dl class="datos">' +
        dato('Repositorio', U.esc(cfg.owner + '/' + cfg.repo)) +
        dato('Rama', U.esc(cfg.rama)) +
        dato('Fichero', '<code>' + U.esc(cfg.ruta) + '</code>') +
        dato('Estado', U.esc(estado)) +
        '</dl>' +
        '<div class="formulario__botones">' +
        boton('config-github', GH.configurado() ? 'Cambiar la configuración' : 'Configurar el token', 'btn--primario') +
        (GH.bloqueado() ? boton('desbloquear-github', 'Desbloquear', '') : '') +
        (GH.configurado() && !GH.bloqueado() ? boton('probar-github', 'Probar la conexión', '') : '') +
        (GH.configurado() ? boton('olvidar-github', 'Olvidar el token', 'btn--peligro') : '') +
        '</div></div></section>';

      html += '<section class="seccion"><h2>Copias de seguridad</h2>' +
        '<div class="tarjeta">' +
        '<p class="apagado">El fichero incluye todos los viajes, con sus reservas y sus gastos.</p>' +
        '<div class="formulario__botones">' +
        boton('exportar', '⬇️ Descargar copia', '') +
        boton('importar', '⬆️ Restaurar copia', '') +
        '</div></div></section>';

      html += '<section class="seccion"><h2>Zona de peligro</h2>' +
        '<div class="tarjeta">' +
        '<p class="apagado">Descartar deja los datos como estaban en la última publicación. ' +
        'Lo que no hayas publicado se pierde.</p>' +
        '<div class="formulario__botones">' +
        boton('descartar', 'Descartar los cambios locales', 'btn--peligro') +
        '</div></div></section>';

      return html;
    }
  };

  global.V = V;
})(window);
