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
    // Empuje horizontal (ampliación)
    E('bb_bench', 'Press de Banca con Barra', 'Pecho / Tríceps', 'bar', 'Escápulas juntas y pies firmes; baja la barra al pecho medio con los codos a ~45° y empuja sin rebotar.'),
    E('cable_chest_press', 'Press de Pecho en Polea', 'Pecho / Tríceps', 'stack', 'Poleas a la altura del pecho y un pie adelantado; empuja al frente hasta juntar las manos sin arquear la espalda.', { step: 2.5 }),
    E('db_decline', 'Press Declinado con Mancuernas', 'Pecho / Tríceps', 'db', 'Banco declinado suave (15–30°) con los pies trabados; baja las mancuernas al pecho bajo y empuja.'),
    E('assisted_dip', 'Fondos Asistidos en Máquina', 'Pecho / Tríceps', 'assist', 'Menos asistencia = más difícil. Torso algo inclinado adelante; baja hasta sentir el estiramiento del pecho y empuja.'),
    // Tracción vertical (ampliación)
    E('lat_pulldown_underhand', 'Jalón con Agarre Supino', 'Espalda · Dorsales', 'stack', 'Palmas hacia ti a la anchura de los hombros; tira hacia la parte alta del pecho llevando los codos abajo y atrás.'),
    E('assisted_chinup', 'Dominada Supina Asistida en Máquina', 'Espalda · Dorsales', 'assist', 'Menos asistencia = más difícil. Palmas hacia ti; baja con los brazos estirados y sube llevando el pecho hacia la barra.'),
    E('cable_pullover', 'Pullover en Polea Alta con Barra', 'Dorsal · Amplitud', 'stack', 'Torso algo inclinado y brazos casi estirados; lleva la barra desde arriba hasta los muslos usando los dorsales.', { step: 2.5 }),
    // Tracción horizontal (ampliación)
    E('bb_row', 'Remo con Barra Inclinado', 'Espalda media', 'bar', 'Torso a ~45° con la espalda neutra; lleva la barra al ombligo juntando las escápulas, sin impulso.'),
    E('tbar_row', 'Remo en T con Barra (Landmine)', 'Espalda media', 'bar', 'Agarre en V bajo la barra y espalda neutra; tira hacia el pecho bajo juntando las escápulas.'),
    E('smith_row', 'Remo en Máquina Smith', 'Espalda media', 'smith', 'Torso inclinado con la espalda neutra; lleva la barra hacia el abdomen con los codos hacia atrás.'),
    E('machine_row_underhand', 'Remo en Máquina con Agarre Supino', 'Espalda · Dorsales', 'stack', 'Palmas hacia arriba y codos pegados; tira hacia la cadera y estira completo al volver.'),
    // Deltoide lateral (ampliación)
    E('db_lateral_incline', 'Elevación Lateral Acostado de Lado en Banco Inclinado', 'Hombro · Deltoide lateral', 'db', 'De costado sobre el banco inclinado, un brazo por vez; sube la mancuerna hacia el costado sin impulso.'),
    E('cable_lateral_behind', 'Elevación Lateral en Polea por Detrás', 'Hombro · Deltoide lateral', 'stack', 'El cable pasa por detrás del cuerpo; sube el brazo hacia el costado hasta la altura del hombro.', { step: 2.5 }),
    E('db_upright_row', 'Remo al Mentón con Mancuernas', 'Hombro · Deltoide lateral', 'db', 'Lleva los codos hacia los costados y arriba hasta la altura de los hombros, no más; mancuernas cerca del cuerpo.'),
    E('cable_upright_row', 'Remo al Mentón en Polea', 'Hombro · Deltoide lateral', 'stack', 'Polea baja con barra; sube los codos hacia los costados hasta la altura de los hombros, sin encoger el cuello.'),
    E('smith_upright_row', 'Remo al Mentón en Máquina Smith', 'Hombro · Deltoide lateral', 'smith', 'Agarre a la anchura de los hombros o más; sube los codos hasta la altura de los hombros y baja controlado.'),
    // Sentadilla / prensa (ampliación)
    E('bb_squat', 'Sentadilla con Barra', 'Cuádriceps · Glúteos', 'bar', 'Barra sobre los trapecios y pecho firme; baja hasta muslos paralelos o más y sube empujando el piso.'),
    E('bb_front_squat', 'Sentadilla Frontal con Barra', 'Cuádriceps · Glúteos', 'bar', 'Barra sobre los hombros delanteros con los codos altos; baja con el torso erguido.'),
    E('belt_squat', 'Sentadilla con Cinturón en Máquina', 'Cuádriceps · Glúteos', 'plate', 'Cinturón en la cadera y torso erguido; baja profundo sin carga en la espalda y sube empujando el piso.'),
    E('horizontal_leg_press', 'Prensa de Piernas Horizontal', 'Cuádriceps · Glúteos', 'stack', 'Espalda pegada al respaldo; baja hasta ~90° de rodilla o más y empuja con todo el pie.'),
    // Bisagra de cadera (ampliación)
    E('bb_sldl', 'Peso Muerto con Piernas Rígidas', 'Femoral · Glúteo', 'bar', 'Rodillas casi extendidas; baja la barra con la espalda neutra hasta estirar el femoral y vuelve apretando glúteos.'),
    E('db_sl_rdl', 'Peso Muerto Rumano a Una Pierna con Mancuernas', 'Femoral · Glúteo', 'db', 'Apoyo en una pierna con la rodilla apenas flexionada; cadera atrás y torso al frente en bloque, sin girar la pelvis.'),
    E('cable_rdl', 'Peso Muerto Rumano en Polea', 'Femoral · Glúteo', 'stack', 'Barra en polea baja; cadera atrás con la espalda neutra hasta estirar el femoral y vuelve apretando glúteos.'),
    E('landmine_rdl', 'Peso Muerto Rumano en Landmine', 'Femoral · Glúteo', 'bar', 'Extremo de la barra con ambas manos; cadera atrás con la espalda neutra y vuelve apretando glúteos.'),
    E('cable_pull_through', 'Pull Through en Polea', 'Glúteo · Femoral', 'stack', 'De espaldas a la polea baja con la soga entre las piernas; cadera atrás y extiende apretando glúteos.'),
    // Extensión de rodilla (ampliación)
    E('cable_leg_ext', 'Extensión de Rodilla en Polea', 'Cuádriceps · Aislamiento', 'stack', 'Tobillera en polea baja, sentado; extiende la rodilla completa con pausa arriba y baja lento.', { step: 2.5 }),
    E('smith_sissy', 'Sentadilla Sissy en Máquina Smith', 'Cuádriceps · Aislamiento', 'smith', 'Rodillas hacia adelante y cadera extendida; baja controlado hasta donde la rodilla tolere y sube.'),
    E('goblet_split_squat', 'Sentadilla Dividida Goblet con Mancuerna', 'Cuádriceps · Glúteo', 'db1', 'Mancuerna pegada al pecho y pies en zancada fija; baja vertical hasta casi tocar el piso con la rodilla de atrás.'),
    // Pantorrilla (ampliación)
    E('standing_calf', 'Elevación de Talones de Pie en Máquina', 'Pantorrilla', 'stack', 'Hombros bajo las almohadillas y puntas en el borde; baja hasta estirar y sube con pausa arriba.'),
    E('db_calf', 'Elevación de Talones de Pie con Mancuernas', 'Pantorrilla', 'db', 'Puntas sobre un escalón; baja hasta estirar y sube al máximo con pausa arriba.'),
    E('db_seated_calf', 'Elevación de Talones Sentado con Mancuerna', 'Pantorrilla', 'db1', 'Mancuerna sobre las rodillas y puntas en un escalón; recorrido completo con pausa.'),
    E('smith_seated_calf', 'Elevación de Talones Sentado en Máquina Smith', 'Pantorrilla', 'smith', 'Barra sobre los muslos con almohadilla; baja el talón al máximo y sube con pausa.'),
    // Press inclinado (ampliación)
    E('bb_incline', 'Press Inclinado con Barra', 'Pecho superior / Tríceps', 'bar', 'Banco a 30–45°; baja la barra al pecho alto con control y empuja sin rebotar.'),
    E('db_incline_single', 'Press Inclinado a Una Mano con Mancuerna', 'Pecho superior / Tríceps', 'db', 'Banco a 30–45°; un brazo por vez con el torso firme, baja hasta estirar el pecho y empuja.'),
    E('db_incline_neutral', 'Press Inclinado Alto con Mancuernas Agarre Neutro', 'Pecho superior / Tríceps', 'db', 'Banco a ~45° y palmas enfrentadas con los codos cerca del cuerpo; baja hasta estirar el pecho alto y empuja.'),
    // Press vertical (ampliación)
    E('bb_ohp', 'Press Militar de Pie con Barra', 'Hombros · Deltoides', 'bar', 'Glúteos y abdomen firmes; empuja la barra desde la clavícula hasta arriba de la cabeza sin arquear la espalda.'),
    E('db_ohp_standing', 'Press Militar de Pie con Mancuernas', 'Hombros · Deltoides', 'db', 'De pie con el abdomen firme; empuja desde la altura de las orejas sin arquear la espalda.'),
    E('db_arnold', 'Press Arnold con Mancuernas', 'Hombros · Deltoides', 'db', 'Empieza con las palmas hacia ti y gíralas hacia afuera mientras empujas hacia arriba.'),
    E('machine_ohp_neutral', 'Press de Hombro en Máquina Agarre Neutro', 'Hombros · Deltoides', 'stack', 'Palmas enfrentadas a la altura de los hombros; empuja sin despegar la espalda del respaldo.'),
    E('landmine_press', 'Press Landmine a Una Mano', 'Hombros · Deltoides', 'bar', 'Extremo de la barra a la altura del hombro; empuja hacia arriba y adelante con el torso firme.'),
    // Tríceps (ampliación)
    E('cable_rope_pushdown', 'Extensión de Tríceps en Polea con Soga', 'Tríceps · Aislamiento', 'stack', 'Codos fijos a los costados; empuja hacia abajo y separa la soga al final.', { step: 2.5 }),
    E('cable_single_oh_ext', 'Extensión de Tríceps sobre la Cabeza a Una Mano en Polea', 'Tríceps · Cabeza larga', 'stack', 'De espaldas a la polea, un brazo por vez; extiende el codo sobre la cabeza sin moverlo de lugar.', { step: 2.5 }),
    E('bb_skullcrusher', 'Press Francés con Barra', 'Tríceps · Aislamiento', 'bar', 'Acostado; baja la barra hacia la frente moviendo solo el codo y extiende completo.'),
    E('smith_close_grip', 'Press de Banca Agarre Cerrado en Máquina Smith', 'Tríceps · Compuesto', 'smith', 'Manos a la anchura de los hombros y codos pegados; baja al pecho bajo y empuja.'),
    E('machine_dip', 'Fondos de Tríceps en Máquina', 'Tríceps · Compuesto', 'stack', 'Sentado con la espalda apoyada; empuja las manijas hacia abajo hasta extender los codos.'),
    // Aperturas (ampliación)
    E('db_incline_fly', 'Aperturas Inclinadas con Mancuernas', 'Pecho · Aislamiento', 'db', 'Banco a ~30°; abre en arco con los codos flexionados hasta estirar el pecho alto.'),
    E('cable_fly_single', 'Cruce de Polea a Una Mano', 'Pecho · Aislamiento', 'stack', 'Un brazo por vez con el torso firme; lleva la mano hacia la línea media del pecho y vuelve lento.', { step: 2.5 }),
    E('cable_decline_fly', 'Aperturas en Polea en Banco Declinado', 'Pecho · Aislamiento', 'stack', 'En banco declinado entre dos poleas; abre en arco hasta estirar el pecho y junta las manos sobre el pecho.', { step: 2.5 }),
    // Bíceps (ampliación)
    E('db_hammer', 'Curl Martillo con Mancuernas', 'Bíceps · Braquial', 'db', 'Palmas enfrentadas y codos pegados; sube sin balancear y baja lento.'),
    E('bb_curl', 'Curl con Barra Recta', 'Bíceps', 'bar', 'Agarre a la anchura de los hombros; sube sin balancear el torso y baja lento.'),
    E('ez_preacher', 'Curl Predicador con Barra Z', 'Bíceps', 'bar', 'Brazos apoyados en el banco Scott; baja hasta casi extender y sube sin despegar los codos.'),
    E('machine_curl', 'Curl de Bíceps en Máquina', 'Bíceps', 'stack', 'Codos alineados con el eje de la máquina; recorrido completo y bajada lenta.'),
    E('cable_bayesian', 'Curl Bayesiano en Polea', 'Bíceps · Cabeza larga', 'stack', 'De espaldas a la polea baja con el brazo por detrás del torso; curl completo sin adelantar el codo.', { step: 2.5 }),
    // Deltoide posterior (ampliación)
    E('cable_rear_fly', 'Pájaros en Polea Alta', 'Deltoide posterior', 'stack', 'Cables cruzados a la altura de los hombros; abre los brazos hacia atrás con los codos casi estirados.', { step: 2.5 }),
    E('db_prone_rear_fly', 'Pájaros Boca Abajo en Banco con Mancuernas', 'Deltoide posterior', 'db', 'Pecho apoyado en el banco; abre los brazos hacia los costados con los codos levemente flexionados.'),
    E('db_rear_row', 'Remo para Deltoide Posterior con Mancuerna', 'Deltoide posterior', 'db', 'Torso inclinado y codo abierto a ~90°; lleva el codo hacia atrás y afuera, sin encoger el hombro.'),
    E('machine_rear_row', 'Remo para Deltoide Posterior en Máquina', 'Deltoide posterior', 'stack', 'Pecho apoyado y codos altos y abiertos; tira hacia atrás separando los codos del cuerpo.'),
    // Glúteo (ampliación)
    E('db_hip_thrust', 'Hip Thrust con Mancuerna', 'Glúteo', 'db1', 'Espalda alta sobre el banco y mancuerna sobre la cadera; extiende la cadera y aprieta glúteos.'),
    E('db_glute_bridge', 'Puente de Glúteo con Mancuerna', 'Glúteo', 'db1', 'Acostado en el piso con la mancuerna sobre la cadera; sube apretando glúteos con pausa arriba.'),
    E('db_single_hip_thrust', 'Hip Thrust a Una Pierna con Mancuerna', 'Glúteo', 'db1', 'Una pierna apoyada y la otra elevada; extiende la cadera sin rotar la pelvis.'),
    E('cable_kickback', 'Patada de Glúteo en Polea', 'Glúteo', 'stack', 'Tobillera en polea baja; lleva la pierna atrás extendiendo la cadera sin arquear la zona lumbar.', { step: 2.5 }),
    E('machine_kickback', 'Patada de Glúteo en Máquina', 'Glúteo', 'stack', 'Torso apoyado; empuja la plataforma hacia atrás extendiendo la cadera, pausa y vuelve lento.'),
    // Curl femoral (ampliación)
    E('seated_leg_curl_single', 'Curl Femoral Sentado Unilateral', 'Femoral · Isquiotibiales', 'stack', 'Una pierna por vez con el muslo sujeto; flexiona completo y vuelve lento.', { step: 2.5 }),
    E('lying_leg_curl_single', 'Curl Femoral Tumbado Unilateral', 'Femoral · Isquiotibiales', 'stack', 'Una pierna por vez con la cadera pegada al banco; lleva el talón al glúteo y baja lento.', { step: 2.5 }),
    E('cable_leg_curl', 'Curl Femoral Tumbado en Polea', 'Femoral · Isquiotibiales', 'stack', 'Tobillera en polea baja, boca abajo; lleva el talón hacia el glúteo sin despegar la cadera.', { step: 2.5 }),
    E('db_leg_curl', 'Curl Femoral con Mancuerna', 'Femoral · Isquiotibiales', 'db1', 'Boca abajo con la mancuerna entre los pies; flexiona las rodillas controlando y baja lento.'),
    // Unilateral de pierna (ampliación)
    E('db_reverse_lunge', 'Zancada hacia Atrás con Mancuernas', 'Cuádriceps · Glúteo', 'db', 'Da un paso largo hacia atrás y baja vertical; empuja con el talón de la pierna de adelante.'),
    E('bb_split_squat', 'Sentadilla Dividida con Barra', 'Cuádriceps · Glúteo', 'bar', 'Pies en zancada fija; baja vertical hasta que la rodilla de atrás casi toque el piso.'),
    E('db_deficit_lunge', 'Zancada hacia Atrás en Déficit con Mancuernas', 'Cuádriceps · Glúteo', 'db', 'Pie de adelante sobre un disco o escalón; paso atrás y baja más profundo, controlado.'),
  ];
  // Guías de MuscleWiki (con video). Slugs tomados de su sitemap y verificados con Chrome
  // (HTTP 200 + video) el 2026-10-02. Se enlaza la versión en español.
  const MUSCLEWIKI = {
    smith_bench: 'smith-machine-bench-press', db_bench: 'dumbbell-bench-press', db_incline: 'dumbbell-incline-bench-press',
    machine_chest: 'machine-chest-press', lat_pulldown: 'machine-pulldown', lat_pulldown_neutral: 'neutral-pulldown',
    assisted_pullup: 'machine-assisted-pull-up', lat_pulldown_single: 'band-seated-single-arm-pulldown', db_pullover: 'dumbbell-pullover',
    db_row: 'dumbbell-single-arm-row', cable_row: 'machine-seated-cable-row', machine_row: 'machine-neutral-row',
    db_chest_row: 'dumbbell-laying-incline-row', db_lateral: 'dumbbell-lateral-raise', cable_lateral: 'cable-low-single-arm-lateral-raise',
    machine_lateral: 'machine-standing-lateral-raise', leg_press: 'machine-leg-press', smith_squat: 'smith-machine-squat',
    hack_squat: 'machine-hack-squat', goblet_squat: 'dumbbell-goblet-squat', db_rdl: 'dumbbell-romanian-deadlift',
    smith_rdl: 'smith-machine-romanian-deadlift', bb_rdl: 'barbell-romanian-deadlift', leg_ext: 'machine-leg-extension',
    leg_ext_single: 'machine-leg-extension', bulgarian: 'dumbbell-bulgarian-split-squat', smith_calf: 'smith-machine-calf-raise',
    press_calf: 'machine-horizontal-leg-press-calf-raise', seated_calf: 'machine-seated-calf-raises', smith_incline: 'smith-machine-incline-bench-press',
    machine_incline: 'machine-plate-loaded-incline-chest-press', db_ohp: 'dumbbell-seated-overhead-press', smith_ohp: 'smith-machine-seated-overhead-press',
    machine_ohp: 'machine-overhand-overhead-press', cable_oh_ext: 'cable-rope-overhead-tricep-extension', db_french: 'dumbbell-skullcrusher',
    db_oh_ext: 'dumbbell-overhead-tricep-extension', cable_pushdown: 'cable-bar-pushdown', cable_fly: 'cable-pec-fly',
    pec_deck: 'machine-pec-fly', db_fly: 'dumbbell-chest-fly', db_curl: 'dumbbell-curl', incline_curl: 'dumbbell-incline-curl',
    cable_curl: 'cable-bar-curl', ez_curl: 'ez-bar-curl', face_pull: 'machine-face-pulls', reverse_pec_deck: 'machine-reverse-fly',
    db_rear_fly: 'dumbbell-rear-delt-fly', smith_hip_thrust: 'smith-machine-hip-thrust', bb_hip_thrust: 'barbell-hip-thrust',
    machine_hip_thrust: 'machine-hip-thrust', seated_leg_curl: 'machine-seated-leg-curl', lying_leg_curl: 'machine-hamstring-curl',
    standing_leg_curl: 'machine-standing-hamstring-curl', walking_lunge: 'lunge-walking', single_leg_press: 'machine-single-leg-leg-press',
    bb_bench: 'barbell-bench-press', cable_chest_press: 'cable-chest-press', db_decline: 'dumbbell-decline-bench-press',
    assisted_dip: 'machine-assisted-parallel-bar-dips', lat_pulldown_underhand: 'underhand-pulldown', assisted_chinup: 'machine-assisted-chin-up',
    cable_pullover: 'cable-bent-over-bar-pullover', bb_row: 'barbell-bent-over-row', tbar_row: 'landmine-t-bar-rows',
    smith_row: 'smith-machine-overhand-row', machine_row_underhand: 'machine-underhand-row', db_lateral_incline: 'dumbbell-laying-incline-lateral-raise',
    cable_lateral_behind: 'cable-behind-the-back-lateral-raise', db_upright_row: 'dumbbell-upright-row', cable_upright_row: 'cable-upright-row',
    smith_upright_row: 'smith-machine-upright-row', bb_squat: 'barbell-squat', bb_front_squat: 'barbell-front-squat-bodybuilding',
    belt_squat: 'machine-belt-squat', horizontal_leg_press: 'machine-horizontal-leg-press', bb_sldl: 'barbell-stiff-leg-deadlifts',
    db_sl_rdl: 'dumbbell-single-leg-stiff-leg-deadlift', cable_rdl: 'cable-bar-romanian-deadlift', landmine_rdl: 'landmine-romanian-deadlift',
    cable_pull_through: 'cable-pull-through', cable_leg_ext: 'cable-seated-leg-extension', smith_sissy: 'smith-machine-sissy-squat',
    goblet_split_squat: 'dumbbell-goblet-split-squat', standing_calf: 'machine-standing-calf-raises', db_calf: 'dumbbell-calf-raise',
    db_seated_calf: 'dumbbell-seated-calf-raise', smith_seated_calf: 'smith-machine-seated-calf-raise', bb_incline: 'barbell-incline-bench-press',
    db_incline_single: 'dumbbell-single-arm-incline-chest-press', db_incline_neutral: 'dumbbell-neutral-high-incline-bench-press', bb_ohp: 'barbell-overhead-press',
    db_ohp_standing: 'dumbbell-overhead-press', db_arnold: 'arnold-press', machine_ohp_neutral: 'machine-neutral-overhead-press',
    landmine_press: 'landmine-single-arm-overhead-press', cable_rope_pushdown: 'cable-rope-pushdown', cable_single_oh_ext: 'cable-single-arm-overhead-tricep-extension',
    bb_skullcrusher: 'barbell-skullcrusher', smith_close_grip: 'smith-machine-close-grip-bench-press', machine_dip: 'machine-dips',
    db_incline_fly: 'dumbbell-incline-chest-fly', cable_fly_single: 'cable-braced-single-arm-chest-fly', cable_decline_fly: 'cable-decline-bench-chest-fly',
    db_hammer: 'dumbbell-hammer-curl', bb_curl: 'barbell-curl', ez_preacher: 'ez-bar-preacher-curl', machine_curl: 'machine-bicep-curl',
    cable_bayesian: 'cable-single-arm-bayesian-curl', cable_rear_fly: 'cable-high-reverse-fly', db_prone_rear_fly: 'dumbbell-laying-reverse-fly',
    db_rear_row: 'dumbbell-rear-delt-row', machine_rear_row: 'machine-rear-deltoid-row', db_hip_thrust: 'dumbbell-hip-thrust',
    db_glute_bridge: 'dumbbell-glute-bridge', db_single_hip_thrust: 'dumbbell-single-leg-hip-thrust', cable_kickback: 'cable-standing-glute-kickback',
    machine_kickback: 'machine-glute-kickback', seated_leg_curl_single: 'machine-seated-leg-curl', lying_leg_curl_single: 'machine-hamstring-curl',
    cable_leg_curl: 'cable-single-leg-laying-leg-curl', db_leg_curl: 'dumbbell-leg-curl', db_reverse_lunge: 'dumbbell-alternating-reverse-lunge',
    bb_split_squat: 'barbell-split-squat', db_deficit_lunge: 'dumbbell-deficit-reverse-lunge',
  };
  for (const e of EXERCISE_LIST) if (MUSCLEWIKI[e.id]) e.mw = 'https://musclewiki.com/es-es/exercise/' + MUSCLEWIKI[e.id];
  const EXERCISES = Object.fromEntries(EXERCISE_LIST.map(e => [e.id, e]));

  // ---------- Rutina L–V ----------
  const VPULL = ['lat_pulldown', 'lat_pulldown_neutral', 'assisted_pullup', 'lat_pulldown_single', 'db_pullover', 'lat_pulldown_underhand', 'assisted_chinup', 'cable_pullover'];
  const HROW = ['db_row', 'cable_row', 'machine_row', 'db_chest_row', 'bb_row', 'tbar_row', 'smith_row', 'machine_row_underhand'];
  const LATERAL = ['db_lateral', 'cable_lateral', 'machine_lateral', 'db_lateral_incline', 'cable_lateral_behind', 'db_upright_row', 'cable_upright_row', 'smith_upright_row'];
  const S = (id, label, sets, range, rest, options, optional) => ({ id, label, sets, range, rest, options, optional: !!optional });

  const ROUTINE = [
    { id: 'lun', dow: 1, short: 'Lun', name: 'Torso', focus: 'Pecho · Espalda · Hombro', block: 'TORSO', color: 'upper', slots: [
      S('lun1', 'Empuje horizontal', 4, [6, 10], 150, ['smith_bench', 'db_bench', 'db_incline', 'machine_chest', 'bb_bench', 'cable_chest_press', 'db_decline', 'assisted_dip']),
      S('lun2', 'Tracción vertical', 3, [8, 12], 120, VPULL),
      S('lun3', 'Tracción horizontal', 3, [8, 12], 120, HROW),
      S('lun4', 'Deltoide lateral', 3, [12, 15], 75, LATERAL, true),
    ] },
    { id: 'mar', dow: 2, short: 'Mar', name: 'Pierna A', focus: 'Cuádriceps · Femoral', block: 'PIERNA A', color: 'legs', slots: [
      S('mar1', 'Sentadilla / prensa', 4, [8, 12], 150, ['leg_press', 'smith_squat', 'hack_squat', 'goblet_squat', 'bb_squat', 'bb_front_squat', 'belt_squat', 'horizontal_leg_press']),
      S('mar2', 'Bisagra de cadera', 3, [8, 12], 150, ['db_rdl', 'smith_rdl', 'bb_rdl', 'bb_sldl', 'db_sl_rdl', 'cable_rdl', 'landmine_rdl', 'cable_pull_through']),
      S('mar3', 'Extensión de rodilla', 3, [10, 15], 90, ['leg_ext', 'leg_ext_single', 'bulgarian', 'cable_leg_ext', 'smith_sissy', 'goblet_split_squat', 'single_leg_press']),
      S('mar4', 'Pantorrilla', 3, [10, 15], 75, ['smith_calf', 'press_calf', 'seated_calf', 'standing_calf', 'db_calf', 'db_seated_calf', 'smith_seated_calf'], true),
    ] },
    { id: 'mie', dow: 3, short: 'Mié', name: 'Push', focus: 'Pecho · Hombro · Tríceps', block: 'PUSH', color: 'push', slots: [
      S('mie1', 'Press inclinado', 4, [6, 10], 150, ['db_incline', 'smith_incline', 'machine_incline', 'bb_incline', 'db_incline_single', 'db_incline_neutral']),
      S('mie2', 'Press vertical', 3, [8, 12], 120, ['db_ohp', 'smith_ohp', 'machine_ohp', 'bb_ohp', 'db_ohp_standing', 'db_arnold', 'machine_ohp_neutral', 'landmine_press']),
      S('mie3', 'Tríceps', 3, [10, 15], 90, ['cable_oh_ext', 'db_french', 'db_oh_ext', 'cable_pushdown', 'cable_rope_pushdown', 'cable_single_oh_ext', 'bb_skullcrusher', 'smith_close_grip', 'machine_dip']),
      S('mie4', 'Aperturas de pecho', 3, [12, 15], 75, ['cable_fly', 'pec_deck', 'db_fly', 'db_incline_fly', 'cable_fly_single', 'cable_decline_fly'], true),
    ] },
    { id: 'jue', dow: 4, short: 'Jue', name: 'Pull', focus: 'Espalda · Bíceps · Deltoide posterior', block: 'PULL', color: 'pull', slots: [
      S('jue1', 'Tracción vertical', 4, [8, 12], 120, VPULL),
      S('jue2', 'Tracción horizontal', 3, [8, 12], 120, HROW),
      S('jue3', 'Bíceps', 3, [8, 12], 90, ['db_curl', 'incline_curl', 'cable_curl', 'ez_curl', 'db_hammer', 'bb_curl', 'ez_preacher', 'machine_curl', 'cable_bayesian']),
      S('jue4', 'Deltoide posterior', 3, [12, 15], 75, ['face_pull', 'reverse_pec_deck', 'db_rear_fly', 'cable_rear_fly', 'db_prone_rear_fly', 'db_rear_row', 'machine_rear_row'], true),
    ] },
    { id: 'vie', dow: 5, short: 'Vie', name: 'Pierna B', focus: 'Glúteo · Femoral · Hombro lateral', block: 'PIERNA B', color: 'legs', slots: [
      S('vie1', 'Glúteo', 4, [8, 12], 150, ['smith_hip_thrust', 'bb_hip_thrust', 'machine_hip_thrust', 'db_hip_thrust', 'db_glute_bridge', 'db_single_hip_thrust', 'cable_kickback', 'machine_kickback']),
      S('vie2', 'Curl femoral', 3, [8, 12], 90, ['seated_leg_curl', 'lying_leg_curl', 'standing_leg_curl', 'seated_leg_curl_single', 'lying_leg_curl_single', 'cable_leg_curl', 'db_leg_curl']),
      S('vie3', 'Unilateral de pierna', 3, [8, 12], 120, ['bulgarian', 'walking_lunge', 'single_leg_press', 'db_reverse_lunge', 'goblet_split_squat', 'bb_split_squat', 'db_deficit_lunge']),
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
  // Suma n días a una fecha ISO (UTC: sin efectos de horario de verano)
  function addDays(iso, n) {
    const d = new Date(isoToUTC(iso) + n * 86400000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  // Lunes de la semana de iso (domingo → lunes anterior)
  const weekStart = iso => addDays(iso, -((dowOf(iso) + 6) % 7));

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

  // ---------- Semana flexible: cola de sesiones L–D ----------
  // Función pura. Pendientes = días de ROUTINE (en orden) sin sesión esta semana;
  // se asignan en orden a las fechas disponibles. Lo que no entra queda en `dropped`.
  function weekPlan(sessions, today, off) {
    const has = id => Object.prototype.hasOwnProperty.call(DAYS, id);
    const start = weekStart(today);
    const end = addDays(start, 6);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const weekSessions = sortSessions(sessions.filter(s => s && has(s.dayId) && s.date >= start && s.date <= end));
    const done = {};       // dayId → fecha de la primera sesión de esa semana
    const doneDates = {};  // fecha → dayIds hechos ese día
    for (const s of weekSessions) {
      if (!Object.prototype.hasOwnProperty.call(done, s.dayId)) done[s.dayId] = s.date;
      (doneDates[s.date] = doneDates[s.date] || []).push(s.dayId);
    }
    const pending = ROUTINE.map(d => d.id).filter(id => !Object.prototype.hasOwnProperty.call(done, id));
    const trainedToday = sessions.some(s => s && s.date === today && has(s.dayId));
    const offSet = new Set(off || []);
    const available = dates.filter(d => d >= today && !(d === today && trainedToday) && !doneDates[d] && !offSet.has(d));
    const plan = {};
    const dropped = [];
    pending.forEach((id, i) => { if (i < available.length) plan[id] = available[i]; else dropped.push(id); });
    const planDates = {};
    for (const id of Object.keys(plan)) (planDates[plan[id]] = planDates[plan[id]] || []).push(id);
    const days = dates.map(date => {
      const isDone = !!doneDates[date];
      const dayIds = isDone ? doneDates[date] : (planDates[date] || []);
      let status;
      if (isDone) status = 'done';
      else if (date >= today && offSet.has(date)) status = 'off';
      else if (planDates[date]) status = 'planned';
      // Pasado sin sesión: 'missed' solo si todavía quedaban sesiones por hacer ese día
      // (sábado y domingo son de respaldo, no se marcan como faltados)
      else if (date < today && Object.keys(done).filter(id => done[id] < date).length < ROUTINE.length) status = 'missed';
      else status = 'free';
      return { date, dow: dowOf(date), status, dayIds };
    });
    const next = pending.find(id => plan[id]) || null;
    return {
      start, end, days, plan, done, pending, dropped,
      next, nextDate: next ? plan[next] : null, trainedToday,
    };
  }
  // true si la sesión (hecha o planificada) de dayId cae en otro día de la semana que su dow original
  function moved(dayId, p) {
    const date = (p.done && p.done[dayId]) || (p.plan && p.plan[dayId]);
    return !!date && DAYS[dayId] !== undefined && dowOf(date) !== DAYS[dayId].dow;
  }

  return {
    EQUIP, EXERCISES, EXERCISE_LIST, ROUTINE, DAYS, BLOCK_TO_DAY, REFERENCES,
    todayISO, daysBetween, dowOf, fmtDate, parseNum, parseReps, fmtW, normName, slug,
    exerciseIdByName, equipOf, stepUp, formatSets, sortSessions, performances, lastPerformance,
    workingSet, recommend, referenceFromEquivalents, emptyRows, newSlotDraft, rowCounts,
    sessionFromDraft, draftFromSession, slotFor, upsertSession, commitStaleDrafts, estMinutes,
    exName, exTag, buildTxt, buildAllTxt, parseTxt, sessionIdFor, buildBackup, parseBackup, mergeSessions,
    addDays, weekStart, weekPlan, moved,
  };
});
