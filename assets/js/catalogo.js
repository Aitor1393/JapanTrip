/* ============================================================
   catalogo.js — aeropuertos, estaciones, aerolíneas y sugerencias
   ------------------------------------------------------------
   Le da al parser con qué reconocer códigos y nombres propios, y al
   mapa unas coordenadas con las que colocar el punto sin tener que
   geocodificar nada por internet.

   Las coordenadas son aproximadas (centro de la terminal o de la
   estación): sirven para situar el punto en el mapa, no para navegar.
   ============================================================ */
(function (global) {
  'use strict';

  var CAT = {};

  /* ---------- Aeropuertos ---------- */
  /* codigo: [nombre, ciudad, pais, lat, lon] */
  var AEROPUERTOS = {
    // España
    MAD: ['Adolfo Suárez Madrid-Barajas', 'Madrid', 'España', 40.4936, -3.5668],
    BCN: ['Josep Tarradellas Barcelona-El Prat', 'Barcelona', 'España', 41.2971, 2.0785],
    AGP: ['Málaga-Costa del Sol', 'Málaga', 'España', 36.6749, -4.4991],
    VLC: ['Valencia', 'Valencia', 'España', 39.4893, -0.4816],
    SVQ: ['Sevilla', 'Sevilla', 'España', 37.4180, -5.8931],
    BIO: ['Bilbao', 'Bilbao', 'España', 43.3011, -2.9106],
    PMI: ['Palma de Mallorca', 'Palma', 'España', 39.5517, 2.7388],
    ALC: ['Alicante-Elche', 'Alicante', 'España', 38.2822, -0.5582],
    SCQ: ['Santiago-Rosalía de Castro', 'Santiago', 'España', 42.8963, -8.4151],
    LPA: ['Gran Canaria', 'Las Palmas', 'España', 27.9319, -15.3866],
    TFN: ['Tenerife Norte', 'Tenerife', 'España', 28.4827, -16.3415],
    TFS: ['Tenerife Sur', 'Tenerife', 'España', 28.0445, -16.5725],
    OVD: ['Asturias', 'Oviedo', 'España', 43.5636, -6.0346],
    ZAZ: ['Zaragoza', 'Zaragoza', 'España', 41.6662, -1.0416],

    // Japón
    HND: ['Haneda', 'Tokio', 'Japón', 35.5494, 139.7798],
    NRT: ['Narita', 'Tokio', 'Japón', 35.7647, 140.3864],
    KIX: ['Kansai', 'Osaka', 'Japón', 34.4347, 135.2441],
    ITM: ['Itami', 'Osaka', 'Japón', 34.7855, 135.4382],
    NGO: ['Chubu Centrair', 'Nagoya', 'Japón', 34.8584, 136.8054],
    CTS: ['New Chitose', 'Sapporo', 'Japón', 42.7752, 141.6923],
    FUK: ['Fukuoka', 'Fukuoka', 'Japón', 33.5859, 130.4500],
    OKA: ['Naha', 'Okinawa', 'Japón', 26.1958, 127.6459],
    HIJ: ['Hiroshima', 'Hiroshima', 'Japón', 34.4361, 132.9195],
    SDJ: ['Sendai', 'Sendai', 'Japón', 38.1397, 140.9169],
    KMJ: ['Kumamoto', 'Kumamoto', 'Japón', 32.8373, 130.8551],
    KOJ: ['Kagoshima', 'Kagoshima', 'Japón', 31.8034, 130.7194],
    HKD: ['Hakodate', 'Hakodate', 'Japón', 41.7700, 140.8219],
    KMQ: ['Komatsu', 'Kanazawa', 'Japón', 36.3946, 136.4076],
    TAK: ['Takamatsu', 'Takamatsu', 'Japón', 34.2142, 134.0156],
    MYJ: ['Matsuyama', 'Matsuyama', 'Japón', 33.8272, 132.6997],
    ISG: ['Nueva Ishigaki', 'Ishigaki', 'Japón', 24.3964, 124.2450],

    // Escalas habituales
    DXB: ['Dubái', 'Dubái', 'EAU', 25.2532, 55.3657],
    DOH: ['Hamad', 'Doha', 'Catar', 25.2731, 51.6081],
    AUH: ['Zayed', 'Abu Dabi', 'EAU', 24.4330, 54.6511],
    IST: ['Estambul', 'Estambul', 'Turquía', 41.2753, 28.7519],
    HEL: ['Helsinki-Vantaa', 'Helsinki', 'Finlandia', 60.3172, 24.9633],
    CDG: ['Charles de Gaulle', 'París', 'Francia', 49.0097, 2.5479],
    ORY: ['Orly', 'París', 'Francia', 48.7233, 2.3794],
    AMS: ['Schiphol', 'Ámsterdam', 'Países Bajos', 52.3105, 4.7683],
    FRA: ['Fráncfort', 'Fráncfort', 'Alemania', 50.0379, 8.5622],
    MUC: ['Múnich', 'Múnich', 'Alemania', 48.3537, 11.7750],
    LHR: ['Heathrow', 'Londres', 'Reino Unido', 51.4700, -0.4543],
    LGW: ['Gatwick', 'Londres', 'Reino Unido', 51.1537, -0.1821],
    ZRH: ['Zúrich', 'Zúrich', 'Suiza', 47.4647, 8.5492],
    VIE: ['Viena', 'Viena', 'Austria', 48.1103, 16.5697],
    FCO: ['Fiumicino', 'Roma', 'Italia', 41.8003, 12.2389],
    MXP: ['Malpensa', 'Milán', 'Italia', 45.6306, 8.7281],
    LIS: ['Humberto Delgado', 'Lisboa', 'Portugal', 38.7756, -9.1354],
    BRU: ['Bruselas', 'Bruselas', 'Bélgica', 50.9014, 4.4844],
    CPH: ['Copenhague', 'Copenhague', 'Dinamarca', 55.6180, 12.6560],
    WAW: ['Chopin', 'Varsovia', 'Polonia', 52.1657, 20.9671],

    // Asia
    ICN: ['Incheon', 'Seúl', 'Corea del Sur', 37.4602, 126.4407],
    GMP: ['Gimpo', 'Seúl', 'Corea del Sur', 37.5583, 126.7906],
    PVG: ['Pudong', 'Shanghái', 'China', 31.1443, 121.8083],
    PEK: ['Capital', 'Pekín', 'China', 40.0799, 116.6031],
    HKG: ['Hong Kong', 'Hong Kong', 'China', 22.3080, 113.9185],
    TPE: ['Taoyuan', 'Taipéi', 'Taiwán', 25.0777, 121.2328],
    SIN: ['Changi', 'Singapur', 'Singapur', 1.3644, 103.9915],
    BKK: ['Suvarnabhumi', 'Bangkok', 'Tailandia', 13.6900, 100.7501],
    KUL: ['Kuala Lumpur', 'Kuala Lumpur', 'Malasia', 2.7456, 101.7099],
    MNL: ['Ninoy Aquino', 'Manila', 'Filipinas', 14.5086, 121.0194]
  };

  CAT.aeropuerto = function (codigo) {
    var a = AEROPUERTOS[String(codigo || '').toUpperCase()];
    if (!a) return null;
    return {
      codigo: String(codigo).toUpperCase(),
      nombre: a[0], ciudad: a[1], pais: a[2], lat: a[3], lon: a[4]
    };
  };

  CAT.esAeropuerto = function (codigo) { return !!AEROPUERTOS[String(codigo || '').toUpperCase()]; };

  CAT.codigosAeropuerto = function () { return Object.keys(AEROPUERTOS); };

  /* ---------- Estaciones de tren de Japón ---------- */
  /* nombre normalizado: [nombre bonito, ciudad, lat, lon] */
  var ESTACIONES = {
    'tokyo': ['Estación de Tokio', 'Tokio', 35.6812, 139.7671],
    'tokio': ['Estación de Tokio', 'Tokio', 35.6812, 139.7671],
    'shinagawa': ['Shinagawa', 'Tokio', 35.6285, 139.7387],
    'shinjuku': ['Shinjuku', 'Tokio', 35.6896, 139.7006],
    'shibuya': ['Shibuya', 'Tokio', 35.6580, 139.7016],
    'ueno': ['Ueno', 'Tokio', 35.7141, 139.7774],
    'ikebukuro': ['Ikebukuro', 'Tokio', 35.7295, 139.7109],
    'shin-yokohama': ['Shin-Yokohama', 'Yokohama', 35.5077, 139.6172],
    'yokohama': ['Yokohama', 'Yokohama', 35.4657, 139.6223],
    'odawara': ['Odawara', 'Odawara', 35.2561, 139.1553],
    'atami': ['Atami', 'Atami', 35.1029, 139.0779],
    'mishima': ['Mishima', 'Mishima', 35.1264, 138.9110],
    'shizuoka': ['Shizuoka', 'Shizuoka', 34.9718, 138.3888],
    'hamamatsu': ['Hamamatsu', 'Hamamatsu', 34.7036, 137.7348],
    'nagoya': ['Nagoya', 'Nagoya', 35.1709, 136.8815],
    'kyoto': ['Estación de Kioto', 'Kioto', 34.9858, 135.7588],
    'kioto': ['Estación de Kioto', 'Kioto', 34.9858, 135.7588],
    'shin-osaka': ['Shin-Osaka', 'Osaka', 34.7332, 135.5003],
    'osaka': ['Osaka (Umeda)', 'Osaka', 34.7025, 135.4959],
    'namba': ['Namba', 'Osaka', 34.6659, 135.5010],
    'tennoji': ['Tennoji', 'Osaka', 34.6465, 135.5136],
    'shin-kobe': ['Shin-Kobe', 'Kobe', 34.7060, 135.1959],
    'kobe': ['Sannomiya (Kobe)', 'Kobe', 34.6947, 135.1955],
    'himeji': ['Himeji', 'Himeji', 34.8283, 134.6905],
    'okayama': ['Okayama', 'Okayama', 34.6668, 133.9180],
    'hiroshima': ['Hiroshima', 'Hiroshima', 34.3975, 132.4756],
    'hakata': ['Hakata', 'Fukuoka', 33.5897, 130.4207],
    'fukuoka': ['Hakata', 'Fukuoka', 33.5897, 130.4207],
    'kumamoto': ['Kumamoto', 'Kumamoto', 32.7898, 130.6884],
    'kagoshima-chuo': ['Kagoshima-Chuo', 'Kagoshima', 31.5830, 130.5416],
    'nagasaki': ['Nagasaki', 'Nagasaki', 32.7522, 129.8710],
    'beppu': ['Beppu', 'Beppu', 33.2795, 131.5010],
    'nara': ['Nara', 'Nara', 34.6800, 135.8185],
    'kanazawa': ['Kanazawa', 'Kanazawa', 36.5780, 136.6480],
    'toyama': ['Toyama', 'Toyama', 36.7013, 137.2137],
    'nagano': ['Nagano', 'Nagano', 36.6432, 138.1887],
    'karuizawa': ['Karuizawa', 'Karuizawa', 36.3428, 138.6350],
    'takayama': ['Takayama', 'Takayama', 36.1440, 137.2560],
    'niigata': ['Niigata', 'Niigata', 37.9124, 139.0614],
    'sendai': ['Sendai', 'Sendai', 38.2601, 140.8825],
    'shin-aomori': ['Shin-Aomori', 'Aomori', 40.8272, 140.6900],
    'aomori': ['Aomori', 'Aomori', 40.8281, 140.7347],
    'shin-hakodate-hokuto': ['Shin-Hakodate-Hokuto', 'Hakodate', 41.9046, 140.6486],
    'hakodate': ['Hakodate', 'Hakodate', 41.7736, 140.7266],
    'sapporo': ['Sapporo', 'Sapporo', 43.0686, 141.3508],
    'matsuyama': ['Matsuyama', 'Matsuyama', 33.8391, 132.7514],
    'takamatsu': ['Takamatsu', 'Takamatsu', 34.3497, 134.0470],
    'kanazawa-eki': ['Kanazawa', 'Kanazawa', 36.5780, 136.6480],
    'nikko': ['Nikko', 'Nikko', 36.7469, 139.6186],
    'hakone-yumoto': ['Hakone-Yumoto', 'Hakone', 35.2325, 139.1063],
    'kawaguchiko': ['Kawaguchiko', 'Fujikawaguchiko', 35.5008, 138.7573],
    'kanazawa station': ['Kanazawa', 'Kanazawa', 36.5780, 136.6480]
  };

  CAT.estacion = function (nombre) {
    var clave = U.normalizar(nombre).replace(/\s*(estacion|station|eki|jr)\s*/g, '').trim();
    var e = ESTACIONES[clave];
    if (!e) return null;
    return { nombre: e[0], ciudad: e[1], lat: e[2], lon: e[3] };
  };

  CAT.nombresEstacion = function () { return Object.keys(ESTACIONES); };

  /* ---------- Aerolíneas ---------- */
  var AEROLINEAS = {
    IB: 'Iberia', I2: 'Iberia Express', UX: 'Air Europa', VY: 'Vueling', FR: 'Ryanair',
    JL: 'Japan Airlines', NH: 'ANA', MM: 'Peach', GK: 'Jetstar Japan', ZG: 'Zipair',
    BC: 'Skymark', HD: 'AirDo', NU: 'Japan Transocean Air', '7G': 'StarFlyer',
    KE: 'Korean Air', OZ: 'Asiana', QR: 'Qatar Airways', EK: 'Emirates', EY: 'Etihad',
    TK: 'Turkish Airlines', AY: 'Finnair', LH: 'Lufthansa', AF: 'Air France',
    KL: 'KLM', BA: 'British Airways', LX: 'Swiss', AZ: 'ITA Airways', OS: 'Austrian',
    SN: 'Brussels Airlines', TP: 'TAP Portugal', SK: 'SAS', LO: 'LOT',
    CX: 'Cathay Pacific', SQ: 'Singapore Airlines', TG: 'Thai Airways',
    CI: 'China Airlines', BR: 'EVA Air', MU: 'China Eastern', CA: 'Air China',
    CZ: 'China Southern', PR: 'Philippine Airlines', VN: 'Vietnam Airlines',
    AC: 'Air Canada', UA: 'United', AA: 'American Airlines', DL: 'Delta'
  };

  CAT.aerolinea = function (codigo) { return AEROLINEAS[String(codigo || '').toUpperCase()] || ''; };
  CAT.codigosAerolinea = function () { return Object.keys(AEROLINEAS); };

  /* ---------- Trenes de Japón ---------- */
  CAT.TRENES = {
    nozomi: 'Nozomi', hikari: 'Hikari', kodama: 'Kodama', mizuho: 'Mizuho',
    sakura: 'Sakura', tsubame: 'Tsubame', hayabusa: 'Hayabusa', hayate: 'Hayate',
    komachi: 'Komachi', yamabiko: 'Yamabiko', nasuno: 'Nasuno', toki: 'Toki',
    tanigawa: 'Tanigawa', kagayaki: 'Kagayaki', hakutaka: 'Hakutaka',
    tsurugi: 'Tsurugi', asama: 'Asama', thunderbird: 'Thunderbird',
    haruka: 'Haruka', hida: 'Hida', azusa: 'Azusa', odoriko: 'Odoriko',
    'narita express': 'Narita Express', nex: 'Narita Express'
  };

  /* ---------- Zonas ----------
     Para colocar un sitio en el día que toca hace falta saber en qué barrio
     cae. Cada zona es un centro y un radio en kilómetros: no son los límites
     administrativos, sino el trozo de ciudad que uno recorre andando de una
     vez. Los alias son como se escriben en el itinerario.                   */
  /* nombre: [lat, lon, radio km, alias…] */
  var ZONAS = {
    'Shinjuku':        [35.6896, 139.7006, 1.6, 'shinjuku', 'kabukicho', 'omoide yokocho', 'golden gai', 'busta'],
    'Harajuku':        [35.6702, 139.7027, 1.1, 'harajuku', 'omotesando', 'takeshita', 'meiji', 'yoyogi', 'cat street'],
    'Shibuya':         [35.6595, 139.7005, 1.3, 'shibuya', 'miyashita', 'dogenzaka'],
    'Daikanyama':      [35.6486, 139.7030, 0.9, 'daikanyama'],
    'Nakameguro':      [35.6440, 139.6990, 0.9, 'nakameguro', 'naka-meguro'],
    'Ebisu':           [35.6467, 139.7100, 0.9, 'ebisu'],
    'Ginza':           [35.6717, 139.7650, 1.1, 'ginza', 'itoya', 'ginza six'],
    'Tsukiji':         [35.6654, 139.7707, 0.9, 'tsukiji', 'hamarikyu'],
    'Nihonbashi':      [35.6833, 139.7745, 0.9, 'nihonbashi'],
    'Estación de Tokio': [35.6812, 139.7671, 1.0, 'estacion de tokio', 'marunouchi', 'character street'],
    'Asakusa':         [35.7148, 139.7967, 1.3, 'asakusa', 'sensoji', 'senso-ji', 'nakamise'],
    'Skytree':         [35.7101, 139.8107, 1.1, 'skytree', 'solamachi', 'oshiage', 'sumida'],
    'Akihabara':       [35.6984, 139.7731, 1.0, 'akihabara', 'akiba'],
    'Ueno':            [35.7138, 139.7770, 1.3, 'ueno', 'ameyoko'],
    'Yanaka':          [35.7276, 139.7657, 1.1, 'yanaka', 'nezu'],
    'Ikebukuro':       [35.7295, 139.7109, 1.4, 'ikebukuro', 'sunshine', 'otome road', 'animate', 'nishiguchi'],
    // Roppongi va justo: pasándose de radio se traga Omotesando, que es
    // Harajuku y otro día distinto.
    'Roppongi':        [35.6627, 139.7314, 1.2, 'roppongi', 'keyakizaka', 'midtown', 'azabu', 'azabudai'],
    'Torre de Tokio':  [35.6586, 139.7454, 0.9, 'torre de tokio', 'tokyo tower', 'shiba koen'],
    'Akasaka':         [35.6745, 139.7370, 1.0, 'akasaka'],
    'Odaiba':          [35.6297, 139.7756, 2.2, 'odaiba', 'divercity', 'gundam', 'rainbow bridge'],
    'Toyosu':          [35.6548, 139.7967, 1.6, 'toyosu', 'teamlab', 'senkyaku'],
    'Nakano':          [35.7057, 139.6659, 1.1, 'nakano', 'broadway'],
    'Koenji':          [35.7053, 139.6497, 1.1, 'koenji', 'pal shotengai', 'barikote'],
    'Shimokitazawa':   [35.6613, 139.6680, 1.0, 'shimokitazawa', 'shimokita'],
    'Setagaya':        [35.6462, 139.6486, 1.2, 'gotokuji', 'gotoku-ji', 'miyanosaka', 'sangenjaya'],
    'Shinagawa':       [35.6285, 139.7387, 1.3, 'shinagawa'],
    'Kichijoji':       [35.7030, 139.5797, 1.4, 'kichijoji', 'inokashira'],
    'Mitaka':          [35.6962, 139.5704, 1.6, 'mitaka', 'ghibli'],
    'Meguro':          [35.6339, 139.7156, 1.1, 'meguro'],
    'Jimbocho':        [35.6960, 139.7570, 0.9, 'jimbocho', 'ochanomizu'],
    'Ryogoku':         [35.6960, 139.7930, 1.0, 'ryogoku'],
    'Kagurazaka':      [35.7018, 139.7400, 0.9, 'kagurazaka'],
    'Yokohama':        [35.4658, 139.6223, 4.5, 'yokohama', 'minato mirai', 'chinatown'],
    'Kawagoe':         [35.9251, 139.4858, 5.5, 'kawagoe', 'kurazukuri', 'toki no kane', 'kitain', 'kashiya'],
    'Nikko':           [36.7500, 139.6000, 12.0, 'nikko', 'toshogu', 'rinnoji', 'futarasan', 'shinkyo'],
    'Chuzenji':        [36.7333, 139.4833, 5.0, 'chuzenji', 'kegon', 'irohazaka'],
    'Gotemba':         [35.3086, 138.9350, 5.0, 'gotemba', 'toki no sumika'],
    // Los cinco lagos están muy desperdigados: un solo círculo que los cubra
    // a todos se acaba comiendo Gotemba, que es otro día.
    'Lagos del Fuji':  [35.5100, 138.7600, 13.0, 'kawaguchiko', 'chureito', 'oshino', 'aokigahara', 'sengen'],
    'Lago Yamanaka':   [35.4187, 138.8768, 4.5, 'yamanaka'],
    'Lago Motosu':     [35.4643, 138.5855, 4.5, 'motosu'],
    'Shiraito':        [35.3130, 138.5872, 3.5, 'shiraito'],
    'Mishima':         [35.1264, 138.9110, 3.0, 'mishima'],
    'Shin-Fuji':       [35.1421, 138.6635, 3.5, 'shin-fuji', 'shin fuji'],
    'Hakone':          [35.2320, 139.1070, 8.0, 'hakone', 'ashi'],
    'Kamakura':        [35.3190, 139.5500, 4.5, 'kamakura', 'enoshima'],
    'Yamagata':        [38.2404, 140.3300, 3.0, 'yamagata'],
    'Yamadera':        [38.3130, 140.4370, 2.0, 'yamadera', 'risshakuji', 'risshaku-ji', 'godaido'],
    'Ginzan Onsen':    [38.5720, 140.5360, 2.5, 'ginzan', 'takimikan', 'shirogane', 'nobesawa'],
    'Ōishida':         [38.6000, 140.3700, 2.5, 'oishida'],
    'Narita':          [35.7647, 140.3864, 5.0, 'narita'],
    'Haneda':          [35.5494, 139.7798, 4.0, 'haneda']
  };

  CAT.ZONAS = ZONAS;

  function distanciaKm(latA, lonA, latB, lonB) {
    var R = 6371;
    var dLat = (latB - latA) * Math.PI / 180;
    var dLon = (lonB - lonA) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latA * Math.PI / 180) * Math.cos(latB * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  CAT.distanciaKm = distanciaKm;

  /** Zona en la que cae un punto, o null si no cae en ninguna conocida. */
  CAT.zonaDe = function (lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    var mejor = null, mejorSobra = Infinity;
    Object.keys(ZONAS).forEach(function (nombre) {
      var z = ZONAS[nombre];
      var d = distanciaKm(lat, lon, z[0], z[1]);
      // Se elige la zona cuyo borde queda más lejos: entre dos que solapan,
      // gana aquella en cuyo centro estás más metido.
      var sobra = d - z[2];
      if (d <= z[2] && sobra < mejorSobra) { mejor = nombre; mejorSobra = sobra; }
    });
    return mejor;
  };

  /** Zonas que menciona un texto del itinerario. */
  CAT.zonasEnTexto = function (texto) {
    var t = U.normalizar(texto);
    var encontradas = [];
    Object.keys(ZONAS).forEach(function (nombre) {
      var alias = ZONAS[nombre].slice(3).concat([U.normalizar(nombre)]);
      var hay = alias.some(function (a) {
        var pos = t.indexOf(a);
        if (pos === -1) return false;
        var antes = t.charAt(pos - 1), despues = t.charAt(pos + a.length);
        return !/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(despues);
      });
      if (hay) encontradas.push(nombre);
    });
    return encontradas;
  };

  /* ---------- Sugerencias de lugares (catálogo de arranque) ---------- */
  /* Sitios muy conocidos, para poder llenar la lista de un par de clics
     en vez de teclear cada uno con sus coordenadas.                      */
  CAT.SUGERENCIAS = [
    // Tokio
    { nombre: 'Templo Senso-ji', ciudad: 'Tokio', categoria: 'templo', lat: 35.7148, lon: 139.7967 },
    { nombre: 'Cruce de Shibuya', ciudad: 'Tokio', categoria: 'imprescindible', lat: 35.6595, lon: 139.7005 },
    { nombre: 'Santuario Meiji', ciudad: 'Tokio', categoria: 'templo', lat: 35.6764, lon: 139.6993 },
    { nombre: 'TeamLab Planets', ciudad: 'Tokio', categoria: 'museo', lat: 35.6497, lon: 139.7906 },
    { nombre: 'Torre de Tokio', ciudad: 'Tokio', categoria: 'mirador', lat: 35.6586, lon: 139.7454 },
    { nombre: 'Tokyo Skytree', ciudad: 'Tokio', categoria: 'mirador', lat: 35.7101, lon: 139.8107 },
    { nombre: 'Mercado exterior de Tsukiji', ciudad: 'Tokio', categoria: 'comida', lat: 35.6654, lon: 139.7707 },
    { nombre: 'Akihabara', ciudad: 'Tokio', categoria: 'compras', lat: 35.6984, lon: 139.7731 },
    { nombre: 'Shinjuku Gyoen', ciudad: 'Tokio', categoria: 'naturaleza', lat: 35.6852, lon: 139.7100 },
    { nombre: 'Barrio de Yanaka', ciudad: 'Tokio', categoria: 'barrio', lat: 35.7276, lon: 139.7657 },
    { nombre: 'Museo Ghibli (Mitaka)', ciudad: 'Tokio', categoria: 'museo', lat: 35.6962, lon: 139.5704 },
    { nombre: 'Parque de Ueno', ciudad: 'Tokio', categoria: 'naturaleza', lat: 35.7148, lon: 139.7738 },
    // Kioto
    { nombre: 'Fushimi Inari Taisha', ciudad: 'Kioto', categoria: 'imprescindible', lat: 34.9671, lon: 135.7727 },
    { nombre: 'Kinkaku-ji (Pabellón Dorado)', ciudad: 'Kioto', categoria: 'templo', lat: 35.0394, lon: 135.7292 },
    { nombre: 'Bosque de bambú de Arashiyama', ciudad: 'Kioto', categoria: 'naturaleza', lat: 35.0170, lon: 135.6716 },
    { nombre: 'Kiyomizu-dera', ciudad: 'Kioto', categoria: 'templo', lat: 34.9949, lon: 135.7850 },
    { nombre: 'Gion', ciudad: 'Kioto', categoria: 'barrio', lat: 35.0037, lon: 135.7752 },
    { nombre: 'Nishiki Market', ciudad: 'Kioto', categoria: 'comida', lat: 35.0050, lon: 135.7649 },
    { nombre: 'Ginkaku-ji y Paseo del Filósofo', ciudad: 'Kioto', categoria: 'templo', lat: 35.0270, lon: 135.7982 },
    // Osaka y alrededores
    { nombre: 'Castillo de Osaka', ciudad: 'Osaka', categoria: 'imprescindible', lat: 34.6873, lon: 135.5259 },
    { nombre: 'Dotonbori', ciudad: 'Osaka', categoria: 'comida', lat: 34.6687, lon: 135.5013 },
    { nombre: 'Universal Studios Japan', ciudad: 'Osaka', categoria: 'otro', lat: 34.6654, lon: 135.4323 },
    { nombre: 'Templo Todai-ji y ciervos', ciudad: 'Nara', categoria: 'imprescindible', lat: 34.6889, lon: 135.8398 },
    { nombre: 'Castillo de Himeji', ciudad: 'Himeji', categoria: 'imprescindible', lat: 34.8394, lon: 134.6939 },
    // Otros
    { nombre: 'Parque Memorial de la Paz', ciudad: 'Hiroshima', categoria: 'museo', lat: 34.3955, lon: 132.4536 },
    { nombre: 'Torii flotante de Miyajima', ciudad: 'Miyajima', categoria: 'imprescindible', lat: 34.2960, lon: 132.3197 },
    { nombre: 'Monte Fuji desde Chureito', ciudad: 'Fujiyoshida', categoria: 'mirador', lat: 35.4995, lon: 138.8004 },
    { nombre: 'Lago Kawaguchiko', ciudad: 'Hakone/Fuji', categoria: 'naturaleza', lat: 35.5171, lon: 138.7520 },
    { nombre: 'Hakone y el lago Ashi', ciudad: 'Hakone', categoria: 'naturaleza', lat: 35.2050, lon: 139.0250 },
    { nombre: 'Shirakawa-go', ciudad: 'Shirakawa', categoria: 'imprescindible', lat: 36.2578, lon: 136.9063 },
    { nombre: 'Jardín Kenroku-en', ciudad: 'Kanazawa', categoria: 'naturaleza', lat: 36.5620, lon: 136.6626 },
    { nombre: 'Casco antiguo de Takayama', ciudad: 'Takayama', categoria: 'barrio', lat: 36.1420, lon: 137.2600 }
  ];

  global.CAT = CAT;
})(window);
