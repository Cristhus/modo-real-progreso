// Pruebas del núcleo: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../core.js');

const ses = (date, exId, sets, extra) => Object.assign({ id: date + '_t_' + exId, date, entries: [{ exId, sets: sets.map(([w, r]) => ({ w, r })) }] }, extra || {});
const slot = (range, sets, options) => ({ id: 's', label: 'x', sets: sets || 3, range, rest: 120, options: options || [] });
const ex = id => M.EXERCISES[id];

test('catálogo y rutina son consistentes', () => {
  assert.equal(M.ROUTINE.length, 5);
  for (const day of M.ROUTINE) {
    assert.equal(day.slots.length, 4, day.id + ' tiene 4 posiciones');
    assert.ok(day.slots[3].optional, day.id + ': la 4ta es opcional');
    for (const s of day.slots) {
      assert.ok(s.options.length >= 3, s.id + ' tiene 3+ equivalentes');
      for (const id of s.options) assert.ok(M.EXERCISES[id], 'existe ' + id);
      assert.ok(s.range[0] < s.range[1]);
    }
  }
  const names = M.EXERCISE_LIST.map(e => M.normName(e.name));
  assert.equal(new Set(names).size, names.length, 'nombres únicos');
});

test('todos los ejercicios tienen guía de MuscleWiki en español', () => {
  for (const e of M.EXERCISE_LIST) {
    assert.match(e.mw || '', /^https:\/\/musclewiki\.com\/es-es\/exercise\/[a-z0-9-]+$/, e.id);
  }
});

test('estimación de tiempo dentro de 60–90 min con el opcional', () => {
  for (const day of M.ROUTINE) {
    const full = M.estMinutes(day, true);
    const short = M.estMinutes(day, false);
    assert.ok(full >= 45 && full <= 90, day.id + ' ' + full);
    assert.ok(short < full);
  }
});

test('primera vez: sin peso y con referencia del equivalente', () => {
  const s = slot([6, 10], 4, ['smith_bench', 'db_incline']);
  const hist = [ses('2025-03-03', 'smith_bench', [[40, 9], [40, 8]])];
  const r = M.recommend(hist, ex('db_incline'), s, '2025-03-10');
  assert.equal(r.kind, 'first');
  assert.equal(r.weight, null);
  assert.deepEqual(r.reps, [8, 8, 8, 8]);
  assert.equal(r.ref.exId, 'smith_bench');
});

test('todas en el techo → sube la carga del equipo', () => {
  const s = slot([6, 10], 4);
  const r = M.recommend([ses('2025-03-03', 'smith_bench', [[35, 12], [37.5, 11], [40, 10], [40, 10]])], ex('smith_bench'), s, '2025-03-07');
  assert.equal(r.kind, 'increase');
  assert.equal(r.weight, 42.5);
  assert.deepEqual(r.reps, [6, 6, 6, 6]);
});

test('dentro del rango → mismo peso, +1 rep por serie (tope en el techo)', () => {
  const s = slot([6, 10], 4);
  const r = M.recommend([ses('2025-03-03', 'db_incline', [[14, 5], [14, 8], [14, 9], [14, 6]])], ex('db_incline'), s, '2025-03-05');
  assert.equal(r.kind, 'repeat');
  assert.equal(r.weight, 14);
  assert.deepEqual(r.reps, [6, 9, 10, 7]);
});

test('intento fallido más pesado no define el peso de trabajo', () => {
  // 16 kg × 3 fue un intento; el trabajo real fue 12 kg
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2025-03-03', 'db_curl', [[16, 3], [12, 10], [12, 8]])], ex('db_curl'), s, '2025-03-07');
  assert.equal(r.kind, 'repeat');
  assert.equal(r.weight, 12);
  assert.deepEqual(r.reps, [11, 9, 9]);
});

test('series pesadas fallidas + series livianas buenas → trabaja con la liviana', () => {
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2025-03-03', 'db_ohp', [[14, 5], [14, 6], [11, 11], [11, 11]])], ex('db_ohp'), s, '2025-03-07');
  assert.equal(r.weight, 11);
  assert.equal(r.kind, 'repeat');
  assert.deepEqual(r.reps, [12, 12, 12]);
});

test('2+ series bajo el piso → baja ~10 %', () => {
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2025-03-03', 'lat_pulldown', [[50, 6], [50, 5], [50, 8]])], ex('lat_pulldown'), s, '2025-03-05');
  assert.equal(r.kind, 'decrease');
  assert.equal(r.weight, 45);
});

test('pausa > 14 días → ~90 % redondeado al incremento, nunca más que antes', () => {
  const s = slot([6, 10], 4);
  const r = M.recommend([ses('2025-03-03', 'smith_bench', [[40, 11], [40, 10]])], ex('smith_bench'), s, '2025-05-16');
  assert.equal(r.kind, 'return');
  assert.equal(r.weight, 35);
  assert.equal(r.days, 74);
});

test('pausa larga + carga que era muy liviana → parte del salto estimado, no del peso viejo', () => {
  // 8 kg × 25 reps era demasiado liviano para 8–12: volver con 7 kg no tendría sentido
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2025-03-03', 'db_row', [[8, 25], [8, 25], [8, 25], [8, 25]])], ex('db_row'), s, '2025-05-16');
  assert.equal(r.kind, 'return');
  assert.ok(r.weight > 8, 'sugiere ' + r.weight);
  assert.equal(r.weight, 9);
});

test('reps muy por encima del techo → salto estimado con tope +30 %', () => {
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2025-03-03', 'db_row', [[8, 25], [8, 25], [8, 25], [8, 25]])], ex('db_row'), s, '2025-03-07');
  assert.equal(r.kind, 'jump');
  assert.equal(r.weight, 10);
});

test('dominada asistida: progresar es bajar la asistencia', () => {
  const s = slot([8, 12], 3);
  const up = M.recommend([ses('2026-10-01', 'assisted_pullup', [[30, 12], [30, 12], [30, 12]])], ex('assisted_pullup'), s, '2026-10-03');
  assert.equal(up.kind, 'increase');
  assert.equal(up.weight, 25);
  const down = M.recommend([ses('2026-10-01', 'assisted_pullup', [[30, 5], [30, 6], [30, 9]])], ex('assisted_pullup'), s, '2026-10-03');
  assert.equal(down.kind, 'decrease');
  assert.ok(down.weight > 30);
});

test('sin peso anotado → no inventa peso', () => {
  const s = slot([8, 12], 3);
  const r = M.recommend([ses('2026-10-01', 'db_curl', [[null, 9], [null, 8]])], ex('db_curl'), s, '2026-10-02');
  assert.equal(r.kind, 'noweight');
  assert.equal(r.weight, null);
});

test('formatSets agrupa por peso', () => {
  assert.equal(M.formatSets([{ w: 14, r: 5 }, { w: 14, r: 8 }]), '14 kg × 5/8');
  assert.equal(M.formatSets([{ w: 35, r: 12 }, { w: 40, r: 10 }, { w: 40, r: 9 }]), '35×12 · 40×10/9 kg');
  assert.equal(M.formatSets([{ w: null, r: 9 }]), '? kg × 9');
});

const SAMPLE = [
  'FECHA: 2026-01-05', 'BLOQUE: PUSH', '='.repeat(40),
  'EJERCICIO: Press de Banca en Máquina Smith', 'TAG: Pecho / Tríceps',
  '- Serie 1: 35 kg x 12 reps', '- Serie 2: 37.5 kg x 11 reps',
  '-'.repeat(40),
  'EJERCICIO: Press Militar Sentado con Mancuernas', 'TAG: Hombros · Deltoides',
  '- Serie 1: 8 kg x 09 reps',
].join('\n') + '\n';

test('parseTxt lee el formato exportado (incluye reps con cero adelante)', () => {
  const { sessions } = M.parseTxt(SAMPLE);
  assert.equal(sessions.length, 1);
  const s = sessions[0];
  assert.equal(s.id, '2026-01-05_mie');
  assert.equal(s.dayId, 'mie');
  assert.equal(s.entries[0].exId, 'smith_bench');
  assert.deepEqual(s.entries[0].sets, [{ w: 35, r: 12 }, { w: 37.5, r: 11 }]);
  assert.deepEqual(s.entries[1].sets, [{ w: 8, r: 9 }]);
});

test('buildTxt reproduce exactamente el formato original', () => {
  const { sessions } = M.parseTxt(SAMPLE);
  assert.equal(M.buildTxt(sessions[0]), SAMPLE.replace('x 09 reps', 'x 9 reps'));
});

test('exportación completa se vuelve a importar igual', () => {
  const { sessions } = M.parseTxt(SAMPLE);
  const two = sessions.concat([Object.assign({}, sessions[0], { id: '2026-01-07_jue', date: '2026-01-07', block: 'PULL' })]);
  const back = M.parseTxt(M.buildAllTxt(two));
  assert.equal(back.sessions.length, 2);
  assert.deepEqual(back.sessions.map(s => s.id), ['2026-01-05_mie', '2026-01-07_jue']);
});

test('ejercicio desconocido en TXT → ejercicio personalizado, sin perder datos', () => {
  const txt = SAMPLE.replace('Press Militar Sentado con Mancuernas', 'Máquina Rara <script>');
  const { sessions, custom } = M.parseTxt(txt);
  const id = sessions[0].entries[1].exId;
  assert.ok(id.startsWith('x_'));
  assert.equal(custom[id].name, 'Máquina Rara <script>');
  assert.ok(M.buildTxt(sessions[0], custom).includes('EJERCICIO: Máquina Rara <script>'));
});

test('alias de la versión anterior se reconocen', () => {
  assert.equal(M.exerciseIdByName('Curl Femoral Controlado'), 'lying_leg_curl');
  assert.equal(M.exerciseIdByName('remo en maquina o con mancuerna'), 'db_row');
  assert.equal(M.exerciseIdByName('Jalón al Pecho en Polea Alta'), 'lat_pulldown');
});

test('borrador → sesión: solo series hechas o con reps anotadas; conserva ejercicios cambiados', () => {
  const day = M.DAYS.lun;
  const draft = { date: '2026-10-05', slots: {
    lun1: { active: 'db_incline', byEx: {
      smith_bench: [{ w: '30', r: '8', done: true }, { w: '', r: '', done: false }],
      db_incline: [{ w: '10', r: '9', done: true }, { w: '10', r: '7', done: false }, { w: '10', r: '', done: false }],
    } },
  } };
  const s = M.sessionFromDraft(day, draft, 1);
  assert.equal(s.id, '2026-10-05_lun');
  assert.equal(s.entries.length, 2);
  assert.deepEqual(s.entries[0], { slotId: 'lun1', exId: 'smith_bench', sets: [{ w: 30, r: 8 }] });
  assert.deepEqual(s.entries[1].sets, [{ w: 10, r: 9 }, { w: 10, r: 7 }]);
  const d2 = M.draftFromSession(day, s);
  assert.equal(d2.slots.lun1.active, 'db_incline');
  assert.equal(d2.slots.lun1.byEx.smith_bench.length, 4, 'completa hasta las series planificadas');
});

test('cambio de equipo a mitad: el orden sigue a la primera serie hecha', () => {
  const day = M.DAYS.mie;
  const draft = { date: '2026-10-07', slots: { mie1: { active: 'smith_incline', byEx: {
    db_incline: [{ w: '10', r: '8', done: true, t: 200 }],
    smith_incline: [{ w: '20', r: '8', done: true, t: 100 }],
  } } } };
  const s = M.sessionFromDraft(day, draft, 1);
  assert.deepEqual(s.entries.map(e => e.exId), ['smith_incline', 'db_incline']);
});

test('borrador vacío no genera sesión', () => {
  const day = M.DAYS.mar;
  assert.equal(M.sessionFromDraft(day, { date: '2026-10-06', slots: { mar1: M.newSlotDraft(day.slots[0], 'leg_press') } }), null);
});

test('borradores de días anteriores se guardan solos; los de hoy no', () => {
  const state = { sessions: [], drafts: {
    lun: { date: '2026-10-05', slots: { lun1: { active: 'smith_bench', byEx: { smith_bench: [{ w: '30', r: '8', done: true }] } } } },
    mar: { date: '2026-10-06', slots: {} },
    mie: { date: '2026-10-07', slots: { mie1: { active: 'db_incline', byEx: { db_incline: [{ w: '10', r: '8', done: true }] } } } },
  } };
  const c = M.commitStaleDrafts(state, '2026-10-07');
  assert.equal(c.length, 1);
  assert.equal(state.sessions[0].id, '2026-10-05_lun');
  assert.deepEqual(Object.keys(state.drafts), ['mie']);
});

test('respaldo JSON: ida y vuelta + merge sin duplicar', () => {
  const { sessions } = M.parseTxt(SAMPLE);
  const json = M.buildBackup({ sessions, custom: {}, settings: { primary: { lun1: 'db_bench' } } });
  const b = M.parseBackup(json);
  assert.equal(b.sessions.length, 1);
  assert.equal(b.primary.lun1, 'db_bench');
  const m1 = M.mergeSessions(sessions, b.sessions, 'skip');
  assert.equal(m1.sessions.length, 1);
  assert.equal(m1.skipped, 1);
  const m2 = M.mergeSessions([], b.sessions, 'replace');
  assert.equal(m2.added, 1);
  assert.equal(M.parseBackup('{"x":1}'), null);
  assert.equal(M.parseBackup('no json'), null);
});

test('fechas', () => {
  assert.equal(M.daysBetween('2025-07-26', '2025-10-01'), 67);
  assert.equal(M.dowOf('2025-10-01'), 3); // miércoles
  assert.equal(M.fmtDate('2025-10-01'), '01/10');
  assert.equal(M.parseNum('9,5'), 9.5);
  assert.equal(M.parseNum('?'), null);
  assert.equal(M.parseNum('-3'), null);
});

// ---------- Semana flexible ----------
// Semana de referencia: lunes 2026-10-05 … domingo 2026-10-11
const DS = (date, dayId) => ({ id: date + '_' + dayId, date, dayId, entries: [] });

test('addDays y weekStart: cruce de mes y de año; domingo → lunes anterior', () => {
  assert.equal(M.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(M.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(M.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(M.dowOf('2026-10-05'), 1, '2026-10-05 es lunes');
  assert.equal(M.weekStart('2026-10-11'), '2026-10-05', 'domingo → lunes anterior');
  assert.equal(M.weekStart('2026-10-05'), '2026-10-05');
  assert.equal(M.weekStart('2026-01-01'), '2025-12-29', 'cruce de año');
});

test('semana normal sin sesiones: lun..vie planificados, sáb y dom libres, next = lun', () => {
  const p = M.weekPlan([], '2026-10-05');
  assert.equal(p.start, '2026-10-05');
  assert.equal(p.end, '2026-10-11');
  assert.deepEqual(p.plan, { lun: '2026-10-05', mar: '2026-10-06', mie: '2026-10-07', jue: '2026-10-08', vie: '2026-10-09' });
  assert.deepEqual(p.dropped, []);
  assert.equal(p.next, 'lun');
  assert.equal(p.nextDate, '2026-10-05');
  assert.deepEqual(p.days.map(d => d.status), ['planned', 'planned', 'planned', 'planned', 'planned', 'free', 'free']);
});

test('falta el martes: con torso hecho el lunes y hoy miércoles, la cola corre un día', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun')], '2026-10-07');
  assert.deepEqual(p.plan, { mar: '2026-10-07', mie: '2026-10-08', jue: '2026-10-09', vie: '2026-10-10' });
  assert.equal(p.next, 'mar');
  assert.equal(p.nextDate, '2026-10-07');
  assert.equal(M.moved('mar', p), true);
  assert.equal(p.days[6].status, 'free', 'domingo libre');
});

test('falta el martes + feriado el jueves: la proyección salta el día marcado', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun')], '2026-10-07', ['2026-10-08']);
  assert.deepEqual(p.plan, { mar: '2026-10-07', mie: '2026-10-09', jue: '2026-10-10', vie: '2026-10-11' });
  assert.equal(p.days[3].status, 'off');
});

test('desborde: torso el lunes y hoy viernes → vie no entra', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun')], '2026-10-09');
  assert.deepEqual(p.dropped, ['vie']);
  assert.deepEqual(p.plan, { mar: '2026-10-09', mie: '2026-10-10', jue: '2026-10-11' });
  assert.equal(p.next, 'mar');
});

test('ya entrenó hoy → la próxima arranca mañana', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun'), DS('2026-10-07', 'mar')], '2026-10-07');
  assert.equal(p.trainedToday, true);
  assert.equal(p.next, 'mie');
  assert.equal(p.nextDate, '2026-10-08');
  assert.equal(p.days[2].status, 'done');
});

test('orden estricto: si hizo Pull el lunes, pendientes = lun, mar, mie, vie en ese orden', () => {
  const p = M.weekPlan([DS('2026-10-05', 'jue')], '2026-10-05');
  assert.deepEqual(p.pending, ['lun', 'mar', 'mie', 'vie']);
  assert.deepEqual(p.plan, { lun: '2026-10-06', mar: '2026-10-07', mie: '2026-10-08', vie: '2026-10-09' });
  assert.equal(M.moved('jue', p), true, 'Pull hecho un lunes (dow 1) ≠ jueves (dow 4)');
});

test('sesiones de la semana anterior o sin dayId válido no cuentan', () => {
  const p = M.weekPlan([DS('2026-09-28', 'lun'), { id: 'x', date: '2026-10-06', dayId: null, entries: [] }, DS('2026-10-06', 'zzz')], '2026-10-07');
  assert.deepEqual(p.done, {});
  assert.deepEqual(p.plan, { lun: '2026-10-07', mar: '2026-10-08', mie: '2026-10-09', jue: '2026-10-10', vie: '2026-10-11' });
});

test('hoy marcado como no disponible → arranca mañana', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun')], '2026-10-07', ['2026-10-07']);
  assert.equal(p.days[2].status, 'off');
  assert.equal(p.nextDate, '2026-10-08');
  assert.equal(p.next, 'mar');
});

test('fechas pasadas sin sesión quedan como missed; off pasado no cuenta', () => {
  const p = M.weekPlan([], '2026-10-07', ['2026-10-05']);
  assert.equal(p.days[0].status, 'missed');
  assert.equal(p.days[1].status, 'missed');
});

test('pasado sin sesión después de semana completa → free (sábado de respaldo)', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun'), DS('2026-10-06', 'mar'), DS('2026-10-07', 'mie'), DS('2026-10-08', 'jue'), DS('2026-10-09', 'vie')], '2026-10-11');
  assert.equal(p.days[5].date, '2026-10-10');
  assert.equal(p.days[5].status, 'free');
});

test('pasado sin sesión con semana incompleta → missed', () => {
  const p = M.weekPlan([DS('2026-10-05', 'lun')], '2026-10-07');
  assert.equal(p.days[1].date, '2026-10-06');
  assert.equal(p.days[1].status, 'missed');
});

test('catálogo: cada posición tiene 6 o más opciones y ningún exId se repite en el mismo día', () => {
  for (const day of M.ROUTINE) {
    const seen = new Set();
    for (const s of day.slots) {
      assert.ok(s.options.length >= 6, s.id + ' tiene ' + s.options.length);
      for (const id of s.options) {
        assert.ok(!seen.has(id), day.id + ': ' + id + ' repetido');
        seen.add(id);
      }
    }
  }
});

test('catálogo: los 56 ids originales siguen existiendo', () => {
  const original = ['smith_bench', 'db_bench', 'db_incline', 'machine_chest', 'lat_pulldown', 'lat_pulldown_neutral', 'assisted_pullup', 'lat_pulldown_single', 'db_pullover', 'db_row', 'cable_row', 'machine_row', 'db_chest_row', 'db_lateral', 'cable_lateral', 'machine_lateral', 'leg_press', 'smith_squat', 'hack_squat', 'goblet_squat', 'db_rdl', 'smith_rdl', 'bb_rdl', 'leg_ext', 'leg_ext_single', 'bulgarian', 'smith_calf', 'press_calf', 'seated_calf', 'smith_incline', 'machine_incline', 'db_ohp', 'smith_ohp', 'machine_ohp', 'cable_oh_ext', 'db_french', 'db_oh_ext', 'cable_pushdown', 'cable_fly', 'pec_deck', 'db_fly', 'db_curl', 'incline_curl', 'cable_curl', 'ez_curl', 'face_pull', 'reverse_pec_deck', 'db_rear_fly', 'smith_hip_thrust', 'bb_hip_thrust', 'machine_hip_thrust', 'seated_leg_curl', 'lying_leg_curl', 'standing_leg_curl', 'walking_lunge', 'single_leg_press'];
  assert.equal(original.length, 56);
  for (const id of original) assert.ok(M.EXERCISES[id], 'sigue existiendo: ' + id);
});

test('catálogo: options[0] de cada posición no cambió (snapshot)', () => {
  const first = { lun1: 'smith_bench', lun2: 'lat_pulldown', lun3: 'db_row', lun4: 'db_lateral', mar1: 'leg_press', mar2: 'db_rdl', mar3: 'leg_ext', mar4: 'smith_calf', mie1: 'db_incline', mie2: 'db_ohp', mie3: 'cable_oh_ext', mie4: 'cable_fly', jue1: 'lat_pulldown', jue2: 'db_row', jue3: 'db_curl', jue4: 'face_pull', vie1: 'smith_hip_thrust', vie2: 'seated_leg_curl', vie3: 'bulgarian', vie4: 'db_lateral' };
  const got = {};
  for (const day of M.ROUTINE) for (const s of day.slots) got[s.id] = s.options[0];
  assert.deepEqual(got, first);
});
