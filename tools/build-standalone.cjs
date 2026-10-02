// Genera una versión de un solo archivo (sin service worker) para abrir directo desde el teléfono.
// Uso: node tools/build-standalone.cjs <salida.html>
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, '..', 'modo_real_progreso_v2.html');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'icons', 'icon-192.png')).toString('base64');

const tag = '<script src="core.js"></script>';
if (!html.includes(tag)) throw new Error('No se encontró ' + tag);
html = html
  .replace(tag, () => '<script>\n' + core.replace(/<\/script/gi, '<\\/script') + '\n</script>')
  .replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
  .replace('href="icons/icon-192.png"', () => 'href="' + icon + '"')
  .replace('href="icons/apple-touch-icon.png"', () => 'href="' + icon + '"');
fs.writeFileSync(out, html);
console.log('OK', out, Math.round(html.length / 1024) + ' KB');
