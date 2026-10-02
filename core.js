/* MODO REAL PROGRESO — núcleo sin DOM.
   Catálogo de ejercicios, rutina L–V, motor de recomendación (doble progresión)
   y formato TXT/JSON. Se carga en el navegador (window.MRP) y en Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MRP = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  // ---------- Equipamiento: cómo se anota el peso y el incremento mínimo ----------
  const EQUIP = {
    db:     { unit: 'kg por mancuerna', round: 0.5 },
    db1:    { unit: 'kg (una sola mancuerna)', round: 0.5 },
    smith:  { unit: 'kg en discos (sin barra)', step: 2.5 },
    bar:    { unit: 'kg en discos (sin barra)', step: 2.5 },
    plate:  { unit: 'kg en discos', step: 5 },
    stack:  { unit: 'kg del bloque', step: 5 },
    assist: { unit: 'kg de asistencia (menos = más difícil)', step: 5, inverse: true },
  };

  const E = (id, name, tag, equip, cue, extra) => Object.assign({ id, name, tag, equip, cue }, extra || {});

  // ---------- Catálogo ----------
  const EXERCISE_LIST = [
    // Empuje horizontal
    E('smith_bench', 'Press de Banca en Máquina Smith', 'Pecho / Tríceps', 'smith', 'Barra sobre el pecho medio; baja controlado hasta rozar el pecho y empuja sin rebotar.'),
    E('db_bench', 'Press de Banca con Mancuernas', 'Pecho / Tríceps', 'db', 'Escápulas juntas y pies firmes; baja las mancuernas a los costados del pecho con los codos a ~45°.', { hint: 'Orientación: con mancuernas el 1RM total (las dos juntas) es ~14 % menor que en Smith (Saeterbakken 2011). Aquí anotas kg por mancuerna.' }),
    E('db_incline', 'Press Inclinado con Mancuernas', 'Pecho superior / Tríceps', 'db', 'Banco a 30–45°; baja hasta sentir el estiramiento del pecho y empuja arriba y levemente hacia adentro.', { hint: 'Orientación: con mancuernas se mueve menos carga total que con barra o Smith (Saeterbakken 2011). Aquí anotas kg por mancuerna.' }),
    E('machine_chest', 'Press de Pecho en Máquina', 'Pecho / Tríceps', 'stack', 'Asiento a la altura en que las manijas salen del pecho medio; recorrido completo.'),
    // Tracción vertical
    E('lat_pulldown', 'Jalón al Pecho en Polea Alta', 'Espalda · Dorsales', 'stack', 'Agarre algo más ancho que los hombros; lleva los codos hacia los bolsillos traseros con el pecho arriba.'),
    E('lat_pulldown_neutral', 'Jalón con Agarre Neutro', 'Espalda · Dorsales', 'stack', 'Agarre en V o neutro; tira hacia la parte alta del pecho sin balancear el torso.'),
    E('assisted_pullup', 'Dominada Asistida en Máquina', 'Espalda · Dorsales', 'assist', 'Menos asistencia = más difícil. Baja con los brazos estirados y sube llevando el pecho hacia la barra.'),
    E('lat_pulldown_single', 'Jalón Unilateral en Polea', 'Espalda · Dorsales', 'stack', 'Un brazo por vez; codo hacia la cadera y estira completo arriba para sentir el dorsal.', { step: 2.5 }),
    E('db_pullover', 'Pullover con Mancuerna en Banco', 'Dorsal · Amplitud', 'db1', 'Brazos casi estirados; baja la mancuerna detrás de la cabeza hasta estirar el dorsal y vuelve sobre el pecho.'),
    // Tracción horizontal
    E('db_row', 'Remo con Mancuerna a Una Mano', 'Espalda · Dorsales', 'db', 'Mano y rodilla apoyadas en el banco; lleva la mancuerna hacia la cadera con el codo pegado.', { aliases: ['Remo en Máquina o con Mancuerna'] }),
    E('cable_row', 'Remo en Polea Baja Sentado', 'Espalda media', 'stack', 'Pecho alto y espalda neutra; lleva el agarre al abdomen juntando las escápulas, sin balancear.'),
    E('machine_row', 'Remo en Máquina con Apoyo de Pecho', 'Espalda media', 'stack', 'Pecho apoyado; tira con los codos hacia atrás y haz una pausa de 1 s apretando la espalda.'),
    E('db_chest_row', 'Remo con Mancuernas en Banco Inclinado', 'Espalda media', 'db', 'Pecho apoyado en el banco inclinado; rema ambas mancuernas hacia la cadera sin despegar el pecho.'),
    // Deltoide lateral
    E('db_lateral', 'Elevación Lateral con Mancuernas', 'Hombro · Deltoide lateral', 'db', 'Codos levemente flexionados; sube hacia los costados hasta la altura de los hombros, sin impulso.'),
    E('cable_lateral', 'Elevación Lateral en Polea', 'Hombro · Deltoide lateral', 'stack', 'Polea baja del lado contrario; sube el brazo hacia el costado hasta la altura del hombro.', { step: 2.5 }),
    E('machine_lateral', 'Elevación Lateral en Máquina', 'Hombro · Deltoide lateral', 'stack', 'Hombro alineado con el eje de la máquina; sube con los codos sin encoger los hombros.'),
    // Sentadilla / prensa
    E('leg_press', 'Prensa de Piernas Inclinada (45°)', 'Cuádriceps · Glúteos', 'plate', 'Baja hasta ~90° de rodilla o más sin despegar la zona lumbar; empuja con todo el pie.'),
    E('smith_squat', 'Sentadilla en Máquina Smith', 'Cuádriceps · Glúteos', 'smith', 'Pies un poco adelantados; baja con el torso firme hasta muslos paralelos o más y sube empujando el piso.'),
    E('hack_squat', 'Sentadilla Hack en Máquina', 'Cuádriceps · Glúteos', 'plate', 'Espalda pegada al respaldo; baja profundo y controlado, sube sin bloquear de golpe las rodillas.'),
    E('goblet_squat', 'Sentadilla Goblet con Mancuerna', 'Cuádriceps · Glúteos', 'db1', 'Mancuerna pegada al pecho; baja entre las rodillas con el torso erguido.'),
    // Bisagra de cadera
    E('db_rdl', 'Peso Muerto Rumano con Mancuernas', 'Femoral · Glúteo', 'db', 'Rodillas apenas flexionadas; cadera atrás deslizando las mancuernas por los muslos hasta estirar el femoral.'),
    E('smith_rdl', 'Peso Muerto Rumano en Smith', 'Femoral · Glúteo', 'smith', 'Cadera atrás con la espalda neutra y la barra pegada a las piernas; vuelve apretando glúteos.'),
    E('bb_rdl', 'Peso Muerto Rumano con Barra', 'Femoral · Glúteo', 'bar', 'Barra pegada a las piernas; cadera atrás con la espalda neutra hasta sentir el femoral.'),
    // Extensión de rodilla
    E('leg_ext', 'Extensión de Piernas en Máquina', 'Cuádriceps · Aislamiento', 'stack', 'Rodilla alineada con el eje; extiende completo, pausa de 1 s arriba y baja lento.'),
    E('leg_ext_single', 'Extensión de Pierna Unilateral', 'Cuádriceps · Aislamiento', 'stack', 'Una pierna por vez; pausa arriba y bajada lenta.', { step: 2.5 }),
    E('bulgarian', 'Sentadilla Búlgara con Mancuernas', 'Cuádriceps · Glúteo', 'db', 'Pie trasero sobre el banco; baja vertical hasta que la rodilla de atrás casi toque el piso.'),
    // Pantorrilla
    E('smith_calf', 'Elevación de Talones de Pie en Smith', 'Pantorrilla', 'smith', 'Puntas sobre un escalón; baja hasta estirar y sube al máximo con pausa arriba.'),
    E('press_calf', 'Elevación de Talones en Prensa', 'Pantorrilla', 'plate', 'Puntas en el borde de la plataforma; recorrido completo con pausa abajo.'),
    E('seated_calf', 'Elevación de Talones Sentado en Máquina', 'Pantorrilla', 'plate', 'Rodillas bajo el rodillo; baja el talón al máximo y sube con pausa.'),
    // Press inclinado
    E('smith_incline', 'Press Inclinado en Máquina Smith', 'Pecho superior / Tríceps', 'smith', 'Banco a 30–45° bajo la barra; baja al pecho alto y empuja sin rebotar.'),
    E('machine_incline', 'Press Inclinado en Máquina', 'Pecho superior / Tríceps', 'stack', 'Asiento a la altura en que las manijas salen del pecho alto; recorrido completo.'),
    // Press vertical
    E('db_ohp', 'Press Militar Sentado con Mancuernas', 'Hombros · Deltoides', 'db', 'Espalda apoyada; empuja desde la altura de las orejas con los codos un poco adelante.'),
    E('smith_ohp', 'Press Militar en Máquina Smith', 'Hombros · Deltoides', 'smith', 'Sentado con respaldo; barra desde el mentón hacia arriba sin arquear la zona lumbar.'),
    E('machine_ohp', 'Press de Hombro en Máquina', 'Hombros · Deltoides', 'stack', 'Manijas a la altura de los hombros; empuja sin despegar la espalda del respaldo.'),
    // Tríceps
    E('cable_oh_ext', 'Extensión de Tríceps sobre la Cabeza en Polea', 'Tríceps · Cabeza larga', 'stack', 'De espaldas a la polea, brazos sobre la cabeza; extiende los codos sin moverlos de lugar.', { step: 2.5, hint: 'Orientación: sobre la cabeza se usa 34–39 % menos carga que en la extensión en polea alta (Maeo 2023).' }),
    E('db_french', 'Press Francés con Mancuernas', 'Tríceps · Aislamiento', 'db', 'Acostado; baja las mancuernas junto a la cabeza moviendo solo el codo y extiende completo.'),
    E('db_oh_ext', 'Extensión de Tríceps sobre la Cabeza con Mancuerna', 'Tríceps · Cabeza larga', 'db1', 'Mancuerna con ambas manos detrás de la cabeza; codos hacia arriba y extiende completo.'),
    E('cable_pushdown', 'Extensión de Tríceps en Polea Alta', 'Tríceps · Aislamiento', 'stack', 'Codos fijos a los costados; empuja hacia abajo hasta extender por completo.'),
    // Aperturas
    E('cable_fly', 'Cruce de Poleas (Aperturas)', 'Pecho · Aislamiento', 'stack', 'Codos levemente flexionados; abre hasta sentir el estiramiento y junta las manos frente al pecho.', { step: 2.5 }),
    E('pec_deck', 'Aperturas en Pec Deck', 'Pecho · Aislamiento', 'stack', 'Codos a la altura del pecho; junta los brazos sin despegar la espalda y vuelve lento.'),
    E('db_fly', 'Aperturas con Mancuernas', 'Pecho · Aislamiento', 'db', 'En banco plano; abre en arco con los codos flexionados hasta estirar el pecho, sin bajar de más.'),
    // Bíceps
    E('db_curl', 'Curl de Bíceps con Mancuernas', 'Bíceps', 'db', 'Codos pegados al cuerpo; sube girando la muñeca hacia afuera (supinación) y baja lento.'),
    E('incline_curl', 'Curl Inclinado con Mancuernas', 'Bíceps · Cabeza larga', 'db', 'Banco a ~45° con los brazos colgando detrás del torso; curl completo sin adelantar los codos.'),
    E('cable_curl', 'Curl de Bíceps en Polea', 'Bíceps', 'stack', 'Polea baja; codos fijos, sube completo y baja controlando.', { step: 2.5 }),
    E('ez_curl', 'Curl con Barra Z', 'Bíceps', 'bar', 'Agarre en la parte angulada; sin balancear el torso y con bajada lenta.'),
    // Deltoide posterior
    E('face_pull', 'Face Pull en Polea', 'Deltoide posterior', 'stack', 'Polea a la altura de la cara con soga; tira hacia la frente separando las manos.', { step: 2.5 }),
    E('reverse_pec_deck', 'Pec Deck Invertido', 'Deltoide posterior', 'stack', 'De frente al respaldo; abre los brazos hacia atrás con los codos casi estirados, sin encoger los hombros.'),
    E('db_rear_fly', 'Pájaros con Mancuernas', 'Deltoide posterior', 'db', 'Torso inclinado hacia adelante; abre los brazos hacia los costados con los codos levemente flexionados.'),
    // Glúteo
    E('smith_hip_thrust', 'Hip Thrust en Máquina Smith', 'Glúteo', 'smith', 'Espalda alta sobre el banco y barra sobre la cadera (con almohadilla); extiende la cadera y aprieta glúteos.'),
    E('bb_hip_thrust', 'Hip Thrust con Barra', 'Glúteo', 'bar', 'Mentón al pecho y tibias verticales arriba; pausa de 1 s en la extensión.'),
    E('machine_hip_thrust', 'Hip Thrust en Máquina', 'Glúteo', 'plate', 'Almohadilla sobre la cadera; extensión completa con pausa arriba.'),
    // Curl femoral
    E('seated_leg_curl', 'Curl Femoral Sentado', 'Femoral · Isquiotibiales', 'stack', 'Muslo bien sujeto y cadera flexionada (más estiramiento del femoral); flexiona completo y vuelve lento.'),
    E('lying_leg_curl', 'Curl Femoral Tumbado', 'Femoral · Isquiotibiales', 'stack', 'Cadera pegada al banco; lleva los talones hacia el glúteo y baja lento.', { aliases: ['Curl Femoral Controlado'] }),
    E('standing_leg_curl', 'Curl Femoral de Pie (Unilateral)', 'Femoral · Isquiotibiales', 'stack', 'Una pierna por vez con la cadera quieta; flexiona completo y baja controlado.', { step: 2.5 }),
    // Unilateral de pierna
    E('walking_lunge', 'Zancadas Caminando con Mancuernas', 'Cuádriceps · Glúteo', 'db', 'Pasos largos; la rodilla de atrás casi toca el piso y el torso va erguido.'),
    E('single_leg_press', 'Prensa a Una Pierna', 'Cuádriceps · Glúteo', 'plate', 'Un pie en el centro de la plataforma; recorrido completo sin despegar la cadera.'),
  ];
  const EXERCISES = Object.fromEntries(EXERCISE_LIST.map(e => [e.id, e]));

  // ---------- Rutina L–V ----------
  const VPULL = ['lat_pulldown', 'lat_pulldown_neutral', 'assisted_pullup', 'lat_pulldown_single', 'db_pullover'];
  const HROW = ['db_row', 'cable_row', 'machine_row', 'db_chest_row'];
  const LATERAL = ['db_lateral', 'cable_lateral', 'machine_lateral'];
  const S = (id, label, sets, range, rest, options, optional) => ({ id, label, sets, range, rest, options, optional: !!optional });

  const ROUTINE = [
    { id: 'lun', dow: 1, short: 'Lun', name: 'Torso', focus: 'Pecho · Espalda · Hombro', block: 'TORSO', color: 'upper', slots: [
      S('lun1', 'Empuje horizontal', 4, [6, 10], 150, ['smith_bench', 'db_bench', 'db_incline', 'machine_chest']),
      S('lun2', 'Tracción vertical', 3, [8, 12], 120, VPULL),
      S('lun3', 'Tracción horizontal', 3, [8, 12], 120, HROW),
      S('lun4', 'Deltoide lateral', 3, [12, 15], 75, LATERAL, true),
    ] },
    { id: 'mar', dow: 2, short: 'Mar', name: 'Pierna A', focus: 'Cuádriceps · Femoral', block: 'PIERNA A', color: 'legs', slots: [
      S('mar1', 'Sentadilla / prensa', 4, [8, 12], 150, ['leg_press', 'smith_squat', 'hack_squat', 'goblet_squat']),
      S('mar2', 'Bisagra de cadera', 3, [8, 12], 150, ['db_rdl', 'smith_rdl', 'bb_rdl']),
      S('mar3', 'Extensión de rodilla', 3, [10, 15], 90, ['leg_ext', 'leg_ext_single', 'bulgarian']),
      S('mar4', 'Pantorrilla', 3, [10, 15], 75, ['smith_calf', 'press_calf', 'seated_calf'], true),
    ] },
    { id: 'mie', dow: 3, short: 'Mié', name: 'Push', focus: 'Pecho · Hombro · Tríceps', block: 'PUSH', color: 'push', slots: [
      S('mie1', 'Press inclinado', 4, [6, 10], 150, ['db_incline', 'smith_incline', 'machine_incline']),
      S('mie2', 'Press vertical', 3, [8, 12], 120, ['db_ohp', 'smith_ohp', 'machine_ohp']),
      S('mie3', 'Tríceps', 3, [10, 15], 90, ['cable_oh_ext', 'db_french', 'db_oh_ext', 'cable_pushdown']),
      S('mie4', 'Aperturas de pecho', 3, [12, 15], 75, ['cable_fly', 'pec_deck', 'db_fly'], true),
    ] },
    { id: 'jue', dow: 4, short: 'Jue', name: 'Pull', focus: 'Espalda · Bíceps · Deltoide posterior', block: 'PULL', color: 'pull', slots: [
      S('jue1', 'Tracción vertical', 4, [8, 12], 120, VPULL),
      S('jue2', 'Tracción horizontal', 3, [8, 12], 120, HROW),
      S('jue3', 'Bíceps', 3, [8, 12], 90, ['db_curl', 'incline_curl', 'cable_curl', 'ez_curl']),
      S('jue4', 'Deltoide posterior', 3, [12, 15], 75, ['face_pull', 'reverse_pec_deck', 'db_rear_fly'], true),
    ] },
    { id: 'vie', dow: 5, short: 'Vie', name: 'Pierna B', focus: 'Glúteo · Femoral · Hombro lateral', block: 'PIERNA B', color: 'legs', slots: [
      S('vie1', 'Glúteo', 4, [8, 12], 150, ['smith_hip_thrust', 'bb_hip_thrust', 'machine_hip_thrust']),
      S('vie2', 'Curl femoral', 3, [8, 12], 90, ['seated_leg_curl', 'lying_leg_curl', 'standing_leg_curl']),
      S('vie3', 'Unilateral de pierna', 3, [8, 12], 120, ['bulgarian', 'walking_lunge', 'single_leg_press']),
      S('vie4', 'Deltoide lateral', 3, [12, 15], 75, LATERAL, true),
    ] },
  ];
  const DAYS = Object.fromEntries(ROUTINE.map(d => [d.id, d]));

  // Bloques de los TXT (incluida la rutina anterior PPL) → día actual
  const BLOCK_TO_DAY = { 'TORSO': 'lun', 'PIERNA A': 'mar', 'PUSH': 'mie', 'PULL': 'jue', 'PIERNA B': 'vie' };

  const REFERENCES = [
    { t: 'Schoenfeld, Ogborn & Krieger (2016). Frecuencia de entrenamiento e hipertrofia. Sports Med 46(11).', f: 'Entrenar cada músculo 2 o más veces por semana supera a 1 vez.', u: 'https://pubmed.ncbi.nlm.nih.gov/27102172/' },
    { t: 'Schoenfeld, Ogborn & Krieger (2017). Dosis-respuesta del volumen semanal. J Sports Sci 35(11).', f: 'Más series semanales → más hipertrofia; 10+ series por músculo por semana rinde más.', u: 'https://pubmed.ncbi.nlm.nih.gov/27433992/' },
    { t: 'Pelland et al. (2026). Dosis-respuesta de volumen y frecuencia. Sports Med 56(2):481–505.', f: 'Las series indirectas cuentan ~0,5; por encima de ~11 series fraccionales por músculo y sesión no se detecta beneficio extra.', u: 'https://pubmed.ncbi.nlm.nih.gov/41343037/' },
    { t: 'Schoenfeld et al. (2016). Descansos largos entre series. J Strength Cond Res 30(7).', f: '3 min de descanso produjo más fuerza e hipertrofia que 1 min.', u: 'https://pubmed.ncbi.nlm.nih.gov/26605807/' },
    { t: 'Refalo et al. (2023). Proximidad al fallo e hipertrofia. Sports Med.', f: 'Acercarse al fallo ayuda un poco, pero llegar al fallo no es superior: RIR 1–2 es suficiente.', u: 'https://pubmed.ncbi.nlm.nih.gov/36334240/' },
    { t: 'Schoenfeld et al. (2017). Carga baja vs. alta. J Strength Cond Res 31(12).', f: 'Con series cerca del fallo, rangos de repeticiones amplios generan hipertrofia similar.', u: 'https://pubmed.ncbi.nlm.nih.gov/28834797/' },
    { t: 'Kassiano et al. (2022). Variar los ejercicios. J Strength Cond Res 36(6):1753–1762.', f: 'La variación sistemática ayuda; rotar ejercicios al azar o en exceso perjudica. Por eso cada posición tiene un ejercicio principal y equivalentes.', u: 'https://pubmed.ncbi.nlm.nih.gov/35438660/' },
    { t: 'Chaves et al. (2020). Press plano vs. inclinado. Int J Exerc Sci 13(6):859–872.', f: 'Fuerza similar; el inclinado da más crecimiento del pecho superior. Son intercambiables.', u: 'https://pubmed.ncbi.nlm.nih.gov/32922646/' },
    { t: 'Saeterbakken, van den Tillaar & Fimland (2011). Smith, barra y mancuernas. J Sports Sci 29(5):533–538.', f: 'Activación del pectoral y del deltoides sin diferencias; con mancuernas el 1RM fue 14 % menor que en Smith. Como el Smith se anota sin barra y las mancuernas por mano, el peso no se convierte entre equipos.', u: 'https://pubmed.ncbi.nlm.nih.gov/21225489/' },
    { t: 'Maeo et al. (2023). Tríceps sobre la cabeza vs. en polea. Eur J Sport Sci 23(7):1240–1250.', f: 'La extensión sobre la cabeza hizo crecer más el tríceps (cabeza larga +28,5 % vs. +19,6 %) aun usando 34–39 % menos carga.', u: 'https://pubmed.ncbi.nlm.nih.gov/35819335/' },
    { t: 'Maeo et al. (2021). Curl femoral sentado vs. tumbado. Med Sci Sports Exerc 53(4).', f: 'El curl sentado produjo más hipertrofia del femoral (+14 % vs. +9 %).', u: 'https://pubmed.ncbi.nlm.nih.gov/33009197/' },
    { t: 'Ogasawara et al. (2013). Entrenamiento continuo vs. con pausas. Eur J Appl Physiol 113(4):975–985.', f: 'Tras pausas de 3 semanas, lo perdido se recupera rápido al reentrenar. Por eso se vuelve con ~90 % de la carga y se reconstruye.', u: 'https://pubmed.ncbi.nlm.nih.gov/23053130/' },
  ];

  // ---------- Utilidades ----------
  const r2 = x => Math.round(x * 100) / 100;
  const pad = n => String(n).padStart(2, '0');

  function todayISO(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function isoToUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
  function daysBetween(a, b) { return Math.round((isoToUTC(b) - isoToUTC(a)) / 86400000); }
  function dowOf(iso) { return new Date(isoToUTC(iso)).getUTCDay(); }
  function fmtDate(iso, withYear) { const [y, m, d] = iso.split('-'); return d + '/' + m + (withYear ? '/' + y : ''); }

  function parseNum(s) {
    if (s == null) return null;
    if (typeof s === 'number') return Number.isFinite(s) && s >= 0 ? s : null;
    const t = String(s).trim().replace(',', '.');
    if (t === '' || t === '?') return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const parseReps = s => { const n = parseNum(s); return n == null ? null : Math.round(n); };
  const fmtW = w => (w == null ? '?' : String(r2(w)));

  function normName(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function slug(s) { return normName(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  const NAME_INDEX = (() => {
    const idx = {};
    for (const e of EXERCISE_LIST) {
      idx[normName(e.name)] = e.id;
      for (const a of e.aliases || []) idx[normName(a)] = e.id;
    }
    return idx;
  })();
  const exerciseIdByName = name => NAME_INDEX[normName(name)] || null;

  function equipOf(ex) { return EQUIP[ex && ex.equip] || EQUIP.stack; }
  function stepUp(ex, w) {
    if (ex.step) return ex.step;
    const eq = equipOf(ex);
    if (eq.step) return eq.step;
    return w < 10 ? 1 : 2; // mancuernas: siguiente par habitual
  }
  function gran(ex) { const eq = equipOf(ex); return ex.step || eq.step || eq.round || 0.5; }
  function roundDown(x, g) { return r2(Math.floor(x / g + 1e-9) * g); }
  function roundNear(x, g) { return r2(Math.round(x / g) * g); }

  // Agrupa series consecutivas con el mismo peso: "25×13 · 27.5×12 · 30×11/10 kg"
  function formatSets(sets) {
    if (!sets || !sets.length) return '';
    const groups = [];
    for (const s of sets) {
      const g = groups[groups.length - 1];
      if (g && g.w === s.w) g.r.push(s.r == null ? '?' : s.r);
      else groups.push({ w: s.w, r: [s.r == null ? '?' : s.r] });
    }
    if (groups.length === 1) return fmtW(groups[0].w) + ' kg × ' + groups[0].r.join('/');
    return groups.map(g => fmtW(g.w) + '×' + g.r.join('/')).join(' · ') + ' kg';
  }

  // ---------- Historial ----------
  function sortSessions(list) {
    return list.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.finishedAt || 0) - (b.finishedAt || 0)));
  }

  // Todas las veces que se hizo un ejercicio, en orden cronológico
  function performances(sessions, exId) {
    const out = [];
    for (const s of sortSessions(sessions)) {
      for (const en of s.entries || []) {
        if (en.exId !== exId) continue;
        const sets = (en.sets || []).filter(x => x.r != null && x.r > 0);
        if (sets.length) out.push({ date: s.date, sets, sessionId: s.id });
      }
    }
    return out;
  }
  function lastPerformance(sessions, exId) {
    const p = performances(sessions, exId);
    return p.length ? p[p.length - 1] : null;
  }

  // Peso de trabajo: el más exigente con al menos una serie dentro del rango (≥ piso).
  // Así un intento fallido (p. ej. 12 kg × 3) no define la recomendación.
  function workingSet(sets, lo, inverse) {
    const valid = sets.filter(s => s.r != null && s.r > 0);
    const weighted = valid.filter(s => s.w != null);
    if (!weighted.length) return { w: null, reps: valid.map(s => s.r) };
    const groups = new Map();
    for (const s of weighted) {
      if (!groups.has(s.w)) groups.set(s.w, []);
      groups.get(s.w).push(s.r);
    }
    const ws = [...groups.keys()];
    const qualifying = ws.filter(w => groups.get(w).some(r => r >= lo));
    let w;
    if (qualifying.length) w = inverse ? Math.min(...qualifying) : Math.max(...qualifying);
    else w = ws.sort((a, b) => groups.get(b).length - groups.get(a).length || (inverse ? a - b : b - a))[0];
    return { w, reps: groups.get(w) };
  }

  const fill = (n, v) => Array.from({ length: n }, () => v);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function referenceFromEquivalents(sessions, slot, exId) {
    let best = null;
    for (const id of slot.options) {
      if (id === exId) continue;
      const p = lastPerformance(sessions, id);
      if (p && (!best || p.date > best.date)) best = Object.assign({ exId: id }, p);
    }
    return best;
  }

  /* Doble progresión por ejercicio concreto.
     kind: first | noweight | return | increase | jump | decrease | repeat */
  function recommend(sessions, ex, slot, today) {
    const [lo, hi] = slot.range;
    const n = slot.sets;
    const last = lastPerformance(sessions, ex.id);
    if (!last) {
      return {
        kind: 'first', weight: null, reps: fill(n, clamp(lo + 2, lo, hi)), last: null, days: null,
        ref: referenceFromEquivalents(sessions, slot, ex.id),
        msg: 'Elige un peso con el que llegues al objetivo dejando 2 repeticiones en reserva.',
      };
    }
    const inverse = !!equipOf(ex).inverse;
    const days = daysBetween(last.date, today);
    const ws = workingSet(last.sets, lo, inverse);
    const g = gran(ex);
    const base = { last, days, ref: null };

    if (ws.w == null) {
      const reps = ws.reps.length ? ws.reps : [lo];
      return Object.assign(base, { kind: 'noweight', weight: null, reps: fill(n, 0).map((_, i) => clamp((reps[i] != null ? reps[i] : reps[reps.length - 1]) + 1, lo, hi)), msg: 'La última vez no anotaste el peso: usa el mismo y suma 1 repetición.' });
    }
    const prog = progression(ex, ws, lo, hi, n, inverse, g);
    if (days > 14) {
      // Tras una pausa: 90 % del peso de trabajo. Si la carga era claramente liviana
      // (reps muy por encima del techo) se parte del salto estimado o de la bajada.
      const ref = prog.kind === 'jump' || prog.kind === 'decrease' ? prog.weight : ws.w;
      const w = inverse ? r2(Math.max(ref, roundNear(ref / 0.9, g))) : r2(Math.min(ref, roundNear(ref * 0.9, g)));
      return Object.assign(base, { kind: 'return', weight: w, reps: fill(n, clamp(lo + 2, lo, hi)), msg: 'Vuelves tras ' + days + ' días sin este ejercicio: ~90 % de la carga y reconstruye reps.' });
    }
    return Object.assign(base, prog);
  }

  function progression(ex, ws, lo, hi, n, inverse, g) {
    const reps = ws.reps;
    const below = reps.filter(r => r < lo).length;
    if (reps.every(r => r >= hi)) {
      const avg = reps.reduce((a, b) => a + b, 0) / reps.length;
      const up = stepUp(ex, ws.w);
      if (!inverse && avg >= hi + 4) {
        // Muy por encima del techo: salto estimado con Epley, con tope de +30 %
        const e1 = ws.w * (1 + avg / 30);
        const target = Math.round((lo + hi) / 2);
        const est = Math.min(e1 / (1 + target / 30), ws.w * 1.3);
        const w = Math.max(roundDown(est, g), r2(ws.w + up));
        return { kind: 'jump', weight: w, reps: fill(n, lo), msg: 'Hiciste muchas más reps que el techo (' + hi + '): salto de carga estimado. Empieza en ' + lo + ' reps.' };
      }
      const w = inverse ? r2(Math.max(0, ws.w - up)) : r2(ws.w + up);
      const extra = equipOf(ex).step || ex.step ? '' : ' (o el par más cercano disponible)';
      return { kind: 'increase', weight: w, reps: fill(n, lo), msg: 'Llegaste al techo (' + hi + ') en todas las series: sube la carga' + extra + ' y empieza en ' + lo + ' reps.' };
    }
    if (below >= 2) {
      const w = inverse ? r2(Math.max(ws.w + g, roundNear(ws.w * 1.1, g))) : r2(Math.max(g, Math.min(ws.w - g, roundNear(ws.w * 0.9, g))));
      return { kind: 'decrease', weight: w, reps: fill(n, lo), msg: 'Quedaste por debajo de ' + lo + ' reps en 2 o más series: baja ~10 % y construye reps.' };
    }
    const targets = fill(n, 0).map((_, i) => clamp((reps[i] != null ? reps[i] : reps[reps.length - 1]) + 1, lo, hi));
    return { kind: 'repeat', weight: ws.w, reps: targets, msg: 'Mismo peso: suma 1 repetición por serie hasta llegar a ' + hi + '.' };
  }

  // ---------- Borradores y sesiones ----------
  const emptyRows = n => fill(n, 0).map(() => ({ w: '', r: '', done: false }));
  function newSlotDraft(slot, exId) { return { active: exId, byEx: { [exId]: emptyRows(slot.sets) } }; }
  const rowCounts = row => !!row.done || parseReps(row.r) > 0;

  function sessionFromDraft(day, draft, finishedAt) {
    const entries = [];
    for (const slot of day.slots) {
      const sd = draft.slots && draft.slots[slot.id];
      if (!sd) continue;
      // Si se cambió de equipo a mitad del ejercicio, se ordena por la primera serie hecha (row.t)
      const list = [];
      Object.keys(sd.byEx).forEach((exId, order) => {
        const rows = sd.byEx[exId].filter(rowCounts);
        if (!rows.length) return;
        const t0 = Math.min(...rows.map(r => r.t || Infinity));
        list.push({ order, t0, entry: { slotId: slot.id, exId, sets: rows.map(row => ({ w: parseNum(row.w), r: parseReps(row.r) })) } });
      });
      list.sort((a, b) => (a.t0 - b.t0) || (a.order - b.order));
      for (const x of list) entries.push(x.entry);
    }
    if (!entries.length) return null;
    return { id: draft.date + '_' + day.id, date: draft.date, dayId: day.id, block: day.block, entries, finishedAt: finishedAt || Date.now(), source: 'app' };
  }

  function slotFor(day, exId) { return day.slots.find(s => s.options.includes(exId)) || null; }

  function draftFromSession(day, session) {
    const draft = { date: session.date, startedAt: session.finishedAt || Date.now(), slots: {} };
    for (const en of session.entries) {
      const slot = (en.slotId && day.slots.find(s => s.id === en.slotId)) || slotFor(day, en.exId);
      if (!slot) continue;
      const sd = draft.slots[slot.id] || (draft.slots[slot.id] = { active: en.exId, byEx: {} });
      const rows = en.sets.map(s => ({ w: s.w == null ? '' : String(s.w), r: s.r == null ? '' : String(s.r), done: true }));
      while (rows.length < slot.sets) rows.push({ w: '', r: '', done: false });
      sd.byEx[en.exId] = rows;
      sd.active = en.exId;
    }
    return draft;
  }

  function upsertSession(sessions, s) {
    const out = sessions.filter(x => x.id !== s.id);
    out.push(s);
    return sortSessions(out);
  }

  // Borradores de días anteriores: si tienen series hechas se guardan solos en el historial
  function commitStaleDrafts(state, today) {
    const committed = [];
    for (const dayId of Object.keys(state.drafts || {})) {
      const d = state.drafts[dayId];
      if (!d || d.date >= today) continue;
      const day = DAYS[dayId];
      const s = day ? sessionFromDraft(day, d, d.startedAt || Date.now()) : null;
      if (s) { state.sessions = upsertSession(state.sessions, s); committed.push(s); }
      delete state.drafts[dayId];
    }
    return committed;
  }

  function estMinutes(day, withOptional) {
    let m = 8; // calentamiento general + series de aproximación
    for (const s of day.slots) {
      if (s.optional && !withOptional) continue;
      m += s.sets * (0.75 + s.rest / 60) + 3;
    }
    return Math.round(m / 5) * 5;
  }

  // ---------- TXT (mismo formato que la versión anterior) ----------
  function exName(exId, custom) {
    const e = EXERCISES[exId] || (custom && custom[exId]);
    return e ? e.name : exId;
  }
  function exTag(exId, custom) {
    const e = EXERCISES[exId] || (custom && custom[exId]);
    return e && e.tag ? e.tag : '';
  }

  function buildTxt(session, custom) {
    const lines = ['FECHA: ' + session.date, 'BLOQUE: ' + (session.block || ''), '='.repeat(40)];
    const blocks = [];
    for (const en of session.entries) {
      if (!en.sets || !en.sets.length) continue;
      const l = ['EJERCICIO: ' + exName(en.exId, custom), 'TAG: ' + exTag(en.exId, custom)];
      if (en.note) l.push('NOTA: ' + en.note);
      en.sets.forEach((s, i) => l.push('- Serie ' + (i + 1) + ': ' + fmtW(s.w) + ' kg x ' + (s.r == null ? '?' : s.r) + ' reps'));
      blocks.push(l.join('\n'));
    }
    lines.push(blocks.join('\n' + '-'.repeat(40) + '\n'));
    return lines.join('\n') + '\n';
  }
  const buildAllTxt = (sessions, custom) => sortSessions(sessions).map(s => buildTxt(s, custom)).join('\n');

  function sessionIdFor(date, block) {
    const day = BLOCK_TO_DAY[String(block || '').toUpperCase().trim()];
    return date + '_' + (day || slug(block) || 'sesion');
  }

  // Acepta uno o varios entrenamientos concatenados (exportación completa)
  function parseTxt(text) {
    const sessions = [];
    const custom = {};
    let cur = null, en = null;
    const finishEntry = () => { if (cur && en && en.sets.length) cur.entries.push(en); en = null; };
    const finishSession = () => { finishEntry(); if (cur && cur.date && cur.entries.length) sessions.push(cur); cur = null; };
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^FECHA:\s*(\d{4}-\d{2}-\d{2})/i))) {
        finishSession();
        cur = { date: m[1], block: '', entries: [], source: 'txt' };
      } else if (!cur) {
        continue;
      } else if ((m = line.match(/^BLOQUE:\s*(.*)$/i))) {
        cur.block = m[1].trim();
      } else if ((m = line.match(/^EJERCICIO:\s*(.+)$/i))) {
        finishEntry();
        const name = m[1].trim();
        let exId = exerciseIdByName(name);
        if (!exId) { exId = 'x_' + slug(name); custom[exId] = custom[exId] || { id: exId, name, tag: '' }; }
        en = { exId, sets: [] };
      } else if (en && (m = line.match(/^TAG:\s*(.*)$/i))) {
        if (custom[en.exId] && !custom[en.exId].tag) custom[en.exId].tag = m[1].trim();
      } else if (en && (m = line.match(/^NOTA:\s*(.*)$/i))) {
        en.note = m[1].trim();
      } else if (en && (m = line.match(/^-\s*Serie\s*\d+\s*:\s*([\d.,?]+)\s*kg\s*x\s*([\d?]+)\s*reps?/i))) {
        en.sets.push({ w: parseNum(m[1]), r: parseReps(m[2]) });
      }
    }
    finishSession();
    const seen = {};
    for (const s of sessions) {
      const key = s.block.toUpperCase().trim();
      s.dayId = BLOCK_TO_DAY[key] || null;
      let id = sessionIdFor(s.date, s.block);
      if (seen[id]) id += '_' + (++seen[id]); else seen[id] = 1;
      s.id = id;
    }
    return { sessions, custom };
  }

  // ---------- Respaldo JSON ----------
  function buildBackup(state) {
    return JSON.stringify({
      app: 'modo-real-progreso', format: 2, exportedAt: new Date().toISOString(),
      sessions: sortSessions(state.sessions), custom: state.custom || {},
      primary: (state.settings && state.settings.primary) || {},
    }, null, 1);
  }
  function parseBackup(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || o.app !== 'modo-real-progreso' || !Array.isArray(o.sessions)) return null;
    const sessions = o.sessions.filter(s => s && typeof s.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Array.isArray(s.entries));
    return { sessions, custom: o.custom || {}, primary: o.primary || {} };
  }

  // mode: 'skip' (TXT: no pisa lo existente) | 'replace' (respaldo JSON)
  function mergeSessions(existing, incoming, mode) {
    const map = new Map(existing.map(s => [s.id, s]));
    let added = 0, replaced = 0, skipped = 0;
    for (const s of incoming) {
      if (map.has(s.id)) {
        if (mode === 'replace') { map.set(s.id, s); replaced++; } else skipped++;
      } else { map.set(s.id, s); added++; }
    }
    return { sessions: sortSessions([...map.values()]), added, replaced, skipped };
  }

  return {
    EQUIP, EXERCISES, EXERCISE_LIST, ROUTINE, DAYS, BLOCK_TO_DAY, REFERENCES,
    todayISO, daysBetween, dowOf, fmtDate, parseNum, parseReps, fmtW, normName, slug,
    exerciseIdByName, equipOf, stepUp, formatSets, sortSessions, performances, lastPerformance,
    workingSet, recommend, referenceFromEquivalents, emptyRows, newSlotDraft, rowCounts,
    sessionFromDraft, draftFromSession, slotFor, upsertSession, commitStaleDrafts, estMinutes,
    exName, exTag, buildTxt, buildAllTxt, parseTxt, sessionIdFor, buildBackup, parseBackup, mergeSessions,
  };
});
