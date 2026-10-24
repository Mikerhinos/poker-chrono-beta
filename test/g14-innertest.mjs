// G14 — Scan statique : zéro innerHTML sur données dynamiques (fix L1).
// Post-split v2.2.1 : le scan porte sur index.html + css/ + js/ (mêmes critères).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'porte-14.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });
let src = readFileSync(INDEX_HTML, 'utf-8');
for (const d of ['css', 'js']) {
  for (const f of readdirSync(join(__dirname, '..', d)).sort()) {
    src += '\n' + readFileSync(join(__dirname, '..', d, f), 'utf-8');
  }
}
const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}
lines.push('== G14 — Scan statique du rendu dynamique ==');
check('aucune occurrence innerHTML dans le fichier', src.includes('innerHTML') === false, 'count=' + src.split('innerHTML').length);
check('rendu des lignes via createElement', src.includes('createElement') === true);
check('labels via textContent', src.includes('div.textContent') === true);
check('version 2.2.3', /version: '2\.2\.3'/.test(src));
check('xoshiro128ss présent (fix H1)', src.includes('function xoshiro128ss') === true);
check('seed CSPRNG présent (fix H1)', src.includes('getRandomValues') === true);
check('pas de handle d’état public (fix H2)', /G\.state\s*=|G\.lastSeed\s*=/.test(src) === false);
check('tick dt borné (fix M1)', src.includes('if (!Number.isFinite(dt) || dt <= 0)') === true);
check('best-score validé (fix M2)', src.includes('Number.isFinite(parsedBest)') === true);
check('split : aucune référence externe (src/href locaux js/… css/… seuls autorisés, zéro http/https)', /<script[^>]+src="(?!js\/)|<link[^>]+href="(?!css\/)|["']https?:\/\//i.test(src) === false);
check('pas de CR (LF)', src.includes('\r') === false);
lines.push('FAILURES: ' + failures);
lines.push('RESULT: ' + (failures === 0 ? 'OK' : 'KO'));
writeFileSync(OUT, lines.join('\n') + '\n', 'utf-8');
console.log(lines.join('\n'));
process.exit(failures === 0 ? 0 : 1);
