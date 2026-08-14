/* ============================================================
   app.js — arranque, navegación y acciones
   ------------------------------------------------------------
   Router por hash, un único manejador de clics para todos los
   data-accion y el aviso de cambios sin publicar.
   ============================================================ */
(function (global) {
  'use strict';

  var App = {};

  App.vista = 'resumen';
  App.estado = {};    // filtros y búsquedas de la vista actual

  var VISTAS = ['resumen', 'itinerario', 'reservas', 'lugares', 'mapa', 'gastos',
    'equipaje', 'pendientes', 'viajes', 'ajustes'];

  /* ══════════════════════════════════════════════════════════
     Tema
     ══════════════════════════════════════════════════════════ */

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    U.guardarLocal('jt:tema', tema);
    var btn = document.getElementById('btnTema');
    if (btn) btn.textContent = tema === 'oscuro' ? '🌙' : '☀️';
  }

  function alternarTema() {
    var actual = document.documentElement.getAttribute('data-tema');
    aplicarTema(actual === 'oscuro' ? 'claro' : 'oscuro');
  }

  /* ══════════════════════════════════════════════════════════
     Navegación
     ══════════════════════════════════════════════════════════ */

  function leerHash() {
    var trozo = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return VISTAS.indexOf(trozo) !== -1 ? trozo : 'resumen';
  }

  function alCambiarHash() {
    // Los enlaces a un día concreto del itinerario (#dia-2026-10-12) no son
    // cambios de vista: se dejan al navegador para que haga el salto.
    if (/^#dia-/.test(location.hash)) return;
    var nueva = leerHash();
    if (nueva !== App.vista) {
      App.vista = nueva;
      App.estado = {};
      M.destruir();
      App.pintar();
      global.scrollTo(0, 0);
    }
  }

  function marcarNav() {
    U.$$('#nav a').forEach(function (a) {
      a.classList.toggle('activo', a.getAttribute('data-vista') === App.vista);
    });
  }

  /* ══════════════════════════════════════════════════════════
     Pintado
     ══════════════════════════════════════════════════════════ */

  /**
   * Vuelve a pintar la vista actual.
   * @param {boolean} [silencioso] no mover el foco ni el scroll
   */
  App.pintar = function (silencioso) {
    var contenedor = document.getElementById('app');
    var viaje = D.activo();

    pintarSelectorViaje();
    marcarNav();
    avisoDeCambios();

    if (!viaje) {
      contenedor.innerHTML = '<div class="vacio">' +
        '<div class="vacio__icono">🧳</div>' +
        '<h3>Todavía no hay ningún viaje</h3>' +
        '<p>Crea el primero y empieza a meter reservas.</p>' +
        '<button class="btn btn--primario" data-accion="nuevo-viaje">+ Crear un viaje</button>' +
        '</div>';
      return;
    }

    var vista = V[App.vista] || V.resumen;
    contenedor.innerHTML = vista.html(viaje, App.estado);
    if (vista.activar) vista.activar(viaje, App.estado);
    if (!silencioso) document.title = vista.titulo + ' · ' + viaje.nombre;
  };

  function pintarSelectorViaje() {
    var sel = document.getElementById('selectorViaje');
    if (!sel) return;
    var viajes = D.viajes();
    var activo = D.activo();

    if (!viajes.length) { sel.innerHTML = ''; return; }

    sel.innerHTML = viajes.map(function (v) {
      return '<option value="' + U.esc(v.id) + '"' +
        (activo && v.id === activo.id ? ' selected' : '') + '>' +
        U.esc(v.emoji + ' ' + v.nombre) + '</option>';
    }).join('');
  }

  function avisoDeCambios() {
    var aviso = document.getElementById('avisoCambios');
    if (!aviso) return;
    aviso.classList.toggle('oculto', !D.hayCambios());
  }

  /* ══════════════════════════════════════════════════════════
     Publicar
     ══════════════════════════════════════════════════════════ */

  function publicar() {
    if (!D.hayCambios()) { U.aviso('No hay nada que publicar.', 'ok'); return; }
    if (!GH.configurado()) {
      U.aviso('Configura antes el token de GitHub en Ajustes.', 'error');
      location.hash = '#/ajustes';
      return;
    }

    var seguir = GH.bloqueado() ? F.desbloquear() : Promise.resolve(true);
    seguir.then(function (vale) {
      if (!vale) return;
      var viaje = D.activo();
      U.aviso('Publicando…');
      return GH.publicar(D.datos(), 'Actualizar ' + (viaje ? viaje.nombre : 'los viajes'))
        .then(function (url) {
          D.marcarPublicado();
          U.aviso('Publicado. GitHub Pages tarda un minuto en actualizarse.', 'ok');
          if (url) console.log('Commit:', url);
          App.pintar();
        })
        .catch(function (e) { U.aviso(e.message, 'error'); });
    });
  }

  /* ══════════════════════════════════════════════════════════
     Copias de seguridad
     ══════════════════════════════════════════════════════════ */

  function exportar() {
    var nombre = 'viajes-' + U.isoHoy() + '.json';
    U.descargarJSON(nombre, D.datos());
    U.aviso('Copia descargada.', 'ok');
  }

  function importar() {
    var entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = 'application/json,.json';
    entrada.addEventListener('change', function () {
      var fichero = entrada.files[0];
      if (!fichero) return;
      U.leerFichero(fichero).then(function (texto) {
        var doc = JSON.parse(texto);
        if (!doc || !Array.isArray(doc.viajes)) {
          throw new Error('Ese fichero no tiene pinta de ser una copia de los viajes.');
        }
        return U.confirmar('Restaurar la copia',
          'Se sustituyen todos los viajes de este navegador por los del fichero (' +
          U.plural(doc.viajes.length, 'viaje') + '). Los cambios sin publicar se pierden.',
          'Restaurar').then(function (si) {
            if (!si) return;
            D.reemplazar(doc);
            U.aviso('Copia restaurada.', 'ok');
            App.pintar();
          });
      }).catch(function (e) {
        U.aviso(e.message, 'error');
      });
    });
    entrada.click();
  }

  /* ══════════════════════════════════════════════════════════
     Acciones (data-accion)
     ══════════════════════════════════════════════════════════ */

  var ACCIONES = {
    /* Reservas */
    'nueva-reserva': function () { F.reserva(); },
    'pegar-reserva': function () { F.pegar(); },
    'editar-reserva': function (el) { F.reserva(el.getAttribute('data-id')); },
    'ver-original': function (el) { F.verOriginal(el.getAttribute('data-id')); },
    'borrar-reserva': function (el) {
      var id = el.getAttribute('data-id');
      var r = D.reservas.uno(id);
      if (!r) return;
      U.confirmar('Borrar la reserva', '¿Seguro que quieres borrar «' + r.titulo + '»?')
        .then(function (si) {
          if (!si) return;
          D.reservas.borrar(id);
          U.aviso('Reserva borrada.', 'ok');
          App.pintar();
        });
    },
    'filtrar-reservas': function (el) {
      App.estado.filtro = el.getAttribute('data-filtro');
      App.pintar(true);
    },

    /* Itinerario */
    'nueva-actividad': function (el) { F.actividad(null, el.getAttribute('data-dia')); },
    'editar-actividad': function (el) { F.actividad(el.getAttribute('data-id')); },
    'nota-dia': function (el) { F.notaDia(el.getAttribute('data-dia')); },
    'foto-dia': function (el) { F.fotoDia(el.getAttribute('data-dia')); },
    'marcar-actividad': function (el) {
      D.actividades.actualizar(el.getAttribute('data-id'), { hecho: el.checked });
      // Sin repintar: se marca en el sitio y el día no se cierra ni salta.
      var fila = el.closest('.suelto');
      if (fila) fila.classList.toggle('suelto--hecho', el.checked);
    },

    /* Plegar y desplegar días. Se toca la clase directamente en vez de
       repintar: así el día no da un salto ni se pierde el scroll. */
    'plegar-dia': function (el) {
      var dia = el.getAttribute('data-dia');
      var seccion = document.getElementById('dia-' + dia);
      if (!seccion) return;
      App.estado.abiertos = App.estado.abiertos || {};
      var abierto = seccion.classList.toggle('dia--abierto');
      el.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      if (abierto) App.estado.abiertos[dia] = true;
      else delete App.estado.abiertos[dia];
    },
    'desplegar-todo': function () { todosLosDias(true); },
    'plegar-todo': function () { todosLosDias(false); },

    /* Pendientes */
    'nuevo-pendiente': function () { F.pendiente(); },
    'editar-pendiente': function (el) { F.pendiente(el.getAttribute('data-id')); },
    'marcar-pendiente': function (el) {
      D.pendientes.actualizar(el.getAttribute('data-id'), { hecho: el.checked });
      App.pintar(true);
    },
    'borrar-pendiente': function (el) {
      var id = el.getAttribute('data-id');
      var p = D.pendientes.uno(id);
      if (!p) return;
      U.confirmar('Borrar la tarea', '¿Borrar «' + U.recortar(p.titulo, 60) + '»?').then(function (si) {
        if (!si) return;
        D.pendientes.borrar(id);
        App.pintar();
      });
    },

    /* Lugares */
    'nuevo-lugar': function () { F.lugar(); },
    'editar-lugar': function (el) { F.lugar(el.getAttribute('data-id')); },
    'sugerencias': function () { F.sugerencias(); },
    'lugar-al-itinerario': function (el) { F.lugarAlItinerario(el.getAttribute('data-id')); },
    'visitado': function (el) {
      var id = el.getAttribute('data-id');
      var l = D.lugares.uno(id);
      if (!l) return;
      D.lugares.actualizar(id, { visitado: !l.visitado });
      App.pintar(true);
    },
    'localizar-lugar': function (el) {
      var id = el.getAttribute('data-id');
      var l = D.lugares.uno(id);
      if (!l) return;
      localizar(el, [l.nombre, l.direccion, l.ciudad].filter(Boolean).join(', '), function (c) {
        D.lugares.actualizar(id, { lat: c.lat, lon: c.lon });
      });
    },
    'localizar-reserva': function (el) {
      var id = el.getAttribute('data-id');
      var r = D.reservas.uno(id);
      if (!r || !r.desde) return;
      localizar(el, [r.desde.nombre, r.desde.direccion].filter(Boolean).join(', '), function (c) {
        var desde = Object.assign({}, r.desde, { lat: c.lat, lon: c.lon });
        D.reservas.actualizar(id, { desde: desde });
      });
    },

    /* Gastos */
    'nuevo-gasto': function () { F.gasto(); },
    'editar-gasto': function (el) { F.gasto(el.getAttribute('data-id')); },
    'borrar-gasto': function (el) {
      var id = el.getAttribute('data-id');
      var g = D.gastos.uno(id);
      if (!g) return;
      U.confirmar('Borrar el gasto', '¿Borrar «' + g.concepto + '»?').then(function (si) {
        if (!si) return;
        D.gastos.borrar(id);
        App.pintar();
      });
    },

    /* Equipaje */
    'nuevo-equipaje': function () { F.equipaje(); },
    'plantilla-equipaje': function () { F.plantillaEquipaje(); },
    'marcar-equipaje': function (el) {
      D.equipaje.actualizar(el.getAttribute('data-id'), { hecho: el.checked });
      App.pintar(true);
    },
    'borrar-equipaje': function (el) {
      D.equipaje.borrar(el.getAttribute('data-id'));
      App.pintar(true);
    },

    /* Viajes */
    'nuevo-viaje': function () { F.viaje(); },
    'editar-viaje': function (el) { F.viaje(el.getAttribute('data-id') || undefined); },
    'activar-viaje': function (el) {
      D.cambiarViaje(el.getAttribute('data-id'));
      location.hash = '#/resumen';
      App.pintar();
    },
    'duplicar-viaje': function (el) {
      var copia = D.duplicarViaje(el.getAttribute('data-id'));
      if (copia) U.aviso('Copiado como «' + copia.nombre + '».', 'ok');
      App.pintar();
    },
    'borrar-viaje': function (el) {
      var id = el.getAttribute('data-id');
      var v = D.viaje(id);
      if (!v) return;
      U.confirmar('Borrar el viaje',
        'Se borra «' + v.nombre + '» con todas sus reservas, lugares y gastos. No se puede deshacer.')
        .then(function (si) {
          if (!si) return;
          D.borrarViaje(id);
          U.aviso('Viaje borrado.', 'ok');
          App.pintar();
        });
    },

    /* Ajustes */
    'config-github': function () { F.github(); },
    'desbloquear-github': function () { F.desbloquear().then(function () { App.pintar(); }); },
    'probar-github': function () {
      U.aviso('Probando…');
      GH.probar()
        .then(function (nombre) { U.aviso('Conectado con ' + nombre + '.', 'ok'); })
        .catch(function (e) { U.aviso(e.message, 'error'); });
    },
    'olvidar-github': function () {
      U.confirmar('Olvidar el token', 'Habrá que volver a configurarlo para publicar.', 'Olvidar')
        .then(function (si) {
          if (!si) return;
          GH.olvidar();
          U.aviso('Token olvidado.', 'ok');
          App.pintar();
        });
    },
    'exportar': exportar,
    'importar': importar,
    'descartar': function () {
      U.confirmar('Descartar los cambios',
        'Los datos vuelven a como estaban en la última publicación. Lo que no hayas publicado se pierde.',
        'Descartar').then(function (si) {
          if (!si) return;
          D.descartarCambios();
          U.aviso('Cambios descartados.', 'ok');
          App.pintar();
        });
    },
    'publicar': publicar
  };

  /** Abre o cierra todos los días del itinerario de una vez. */
  function todosLosDias(abrir) {
    App.estado.abiertos = {};
    U.$$('.dia').forEach(function (seccion) {
      seccion.classList.toggle('dia--abierto', abrir);
      var cabecera = U.$('.dia__cabecera', seccion);
      if (cabecera) {
        cabecera.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        if (abrir) App.estado.abiertos[cabecera.getAttribute('data-dia')] = true;
      }
    });
  }

  /** Busca unas coordenadas y las guarda con el callback que se le pase. */
  function localizar(boton, consulta, guardar) {
    if (!consulta) { U.aviso('No hay dirección con la que buscar.', 'error'); return; }
    boton.disabled = true;
    var textoOriginal = boton.textContent;
    boton.textContent = 'buscando…';
    M.geocodificar(consulta).then(function (c) {
      guardar(c);
      U.aviso('Situado en el mapa.', 'ok');
      App.pintar();
    }).catch(function (e) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
      U.aviso(e.message, 'error');
    });
  }

  /* ══════════════════════════════════════════════════════════
     Enganches globales
     ══════════════════════════════════════════════════════════ */

  function engancharEventos() {
    // Un único manejador para todos los data-accion de la página.
    document.addEventListener('click', function (e) {
      var cerrar = e.target.closest('[data-cerrar-modal]');
      if (cerrar) { U.cerrarModal(); return; }

      var el = e.target.closest('[data-accion]');
      if (!el || el.type === 'checkbox') return;
      var accion = ACCIONES[el.getAttribute('data-accion')];
      if (!accion) return;
      e.preventDefault();
      accion(el);
    });

    // Las casillas responden al cambio, no al clic.
    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-accion]');
      if (!el || el.type !== 'checkbox') return;
      var accion = ACCIONES[el.getAttribute('data-accion')];
      if (accion) accion(el);
    });

    document.getElementById('btnTema').addEventListener('click', alternarTema);
    document.getElementById('btnPublicar').addEventListener('click', publicar);
    document.getElementById('btnPublicarAviso').addEventListener('click', publicar);
    document.getElementById('btnDescartarAviso').addEventListener('click', ACCIONES.descartar);

    document.getElementById('selectorViaje').addEventListener('change', function (e) {
      D.cambiarViaje(e.target.value);
      App.pintar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && U.modalAbierto()) U.cerrarModal();
    });

    // Al cambiar los datos hay que revisar si aparece el aviso de sin publicar.
    document.addEventListener('datos:cambio', avisoDeCambios);

    global.addEventListener('hashchange', alCambiarHash);
  }

  /* ══════════════════════════════════════════════════════════
     Arranque
     ══════════════════════════════════════════════════════════ */

  function arrancar() {
    aplicarTema(U.leerLocal('jt:tema', 'oscuro'));
    App.vista = leerHash();

    D.cargar().then(function () {
      engancharEventos();
      App.pintar();

      var pie = document.getElementById('pieActualizado');
      if (pie && D.datos().actualizado) {
        pie.textContent = 'Actualizado el ' + U.fechaLarga(D.datos().actualizado);
      }
    }).catch(function (e) {
      document.getElementById('app').innerHTML =
        '<div class="vacio"><div class="vacio__icono">⚠️</div>' +
        '<h3>No se han podido cargar los datos</h3>' +
        '<p>' + U.esc(e.message) + '</p></div>';
    });
  }

  global.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(window);
