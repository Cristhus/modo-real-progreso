# Modo Real Progreso

Registro de entrenamiento para el celular (PWA): 5 sesiones en 7 días, de 4 ejercicios cada una, con **ejercicios equivalentes intercambiables** (por si la máquina está ocupada) y **sugerencia de peso y repeticiones** basada en la última vez que hiciste cada ejercicio.

- Funciona sin conexión y se instala como app.
- Los datos quedan **solo en el dispositivo** (IndexedDB + localStorage). Para no perderlos: Menú → Respaldo (JSON).
- Exporta el mismo formato TXT que la versión anterior.

## Rutina

| Día | Bloque | Posiciones (cada una con 6–9 equivalentes) |
|---|---|---|
| Lun | Torso | Empuje horizontal · Tracción vertical · Tracción horizontal · Deltoide lateral* |
| Mar | Pierna A | Sentadilla/prensa · Bisagra de cadera · Extensión de rodilla · Pantorrilla* |
| Mié | Push | Press inclinado · Press vertical · Tríceps · Aperturas* |
| Jue | Pull | Tracción vertical · Tracción horizontal · Bíceps · Deltoide posterior* |
| Vie | Pierna B | Glúteo · Curl femoral · Unilateral · Deltoide lateral* |

\* opcional si falta tiempo. Las referencias científicas están dentro de la app (Menú → Referencias).

## Semana flexible

La app no ata cada sesión a un día fijo: la **cola** se calcula con el historial de la semana actual (lunes a domingo).

- **Orden**: Torso → Pierna A → Push → Pull → Pierna B. La próxima sesión es la primera de esa lista que todavía no hiciste esta semana.
- **Si faltas**: la cola corre sola. Si faltaste el martes, el miércoles toca Pierna A (no Push), y así con el resto.
- **Hoy ya entrenaste**: la próxima sesión arranca mañana.
- **Días no disponibles**: en la franja semanal toca un día (feriado, viaje) para marcarlo; la cola lo saltea. Toca de nuevo para desmarcarlo. Solo se pueden marcar hoy o días futuros.
- **Desborde**: si quedan más sesiones que días disponibles, las últimas en el orden **no entran** esta semana y la app lo avisa. El lunes siguiente se arranca de nuevo con Torso.
- Una sesión hecha en otro día aparece con borde punteado en la pestaña; el historial guarda la fecha real.

## Progresión sugerida (doble progresión, por ejercicio)

- Todas las series en el techo del rango → subir la carga mínima del equipo.
- Dentro del rango → mismo peso, +1 repetición por serie.
- 2 o más series bajo el piso → bajar ~10 %.
- Más de 14 días sin ese ejercicio → ~90 %.
- Nunca se convierte peso entre equipos distintos.

## Estructura

- `index.html` — interfaz (CSS y JS en línea).
- `core.js` — catálogo, rutina, recomendación y formato TXT/JSON (sin DOM, testeable).
- `sw.js` — service worker (offline). Al publicar cambios, subir `CACHE`.
- `tests/core.test.cjs` — `node --test tests/core.test.cjs`
