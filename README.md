# Modo Real Progreso

Registro de entrenamiento para el celular (PWA): rutina lunes a viernes de 4 ejercicios por día, con **ejercicios equivalentes intercambiables** (por si la máquina está ocupada) y **sugerencia de peso y repeticiones** basada en la última vez que hiciste cada ejercicio.

- Funciona sin conexión y se instala como app.
- Los datos quedan **solo en el dispositivo** (IndexedDB + localStorage). Para no perderlos: Menú → Respaldo (JSON).
- Exporta el mismo formato TXT que la versión anterior.

## Rutina

| Día | Bloque | Posiciones (cada una con 3–5 equivalentes) |
|---|---|---|
| Lun | Torso | Empuje horizontal · Tracción vertical · Tracción horizontal · Deltoide lateral* |
| Mar | Pierna A | Sentadilla/prensa · Bisagra de cadera · Extensión de rodilla · Pantorrilla* |
| Mié | Push | Press inclinado · Press vertical · Tríceps · Aperturas* |
| Jue | Pull | Tracción vertical · Tracción horizontal · Bíceps · Deltoide posterior* |
| Vie | Pierna B | Glúteo · Curl femoral · Unilateral · Deltoide lateral* |

\* opcional si falta tiempo. Las referencias científicas están dentro de la app (Menú → Referencias).

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
