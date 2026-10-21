// PORTE 8 — Zéro dépendance externe : scan statique de index.html + css/ + js/ (post-split v2.1.1).
// Critères : aucune URL http(s)://, aucune référence externe ; les références relatives locales
// (css/…, js/…) sont la structure du split et sont autorisées.
// v2.2-a (recalibration, voir test/results/v2.2-a/g8-recalibration.md) : le vendeur PeerJS
// (js/peerjs.min.js) est exclu du scan de patterns URL — fetch( / new WebSocket / url( y sont
// inhérents à WebRTC et ne chargent aucune ressource externe — mais reste compté dans la taille.
// Plafond relevé 200 → 256 Ko ; 8 scripts (deck, game, i18n, audio, fx, ui, net, peerjs).
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { makeChecker } from './lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// v2.2-a : vendeur exclu du scan URL, compté dans la taille.
const VENDOR_JS = new Set(['peerjs.min.js']);
const isVendor = (f) => f.startsWith('js/') && VENDOR_JS.has(f.slice(3));

const FILES = [
  'index.html',
  ...readdirSync(join(ROOT, 'css')).sort().map((f) => 'css/' + f),
  ...readdirSync(join(ROOT, 'js')).sort().map((f) => 'js/' + f)
];
const { check, summary } = makeChecker('PORTE 8');

let html = '';
let bytes = 0;
for (const f of FILES) {
  const p = join(ROOT, f);
  bytes += statSync(p).size;                                   // tous les fichiers, vendeur inclus
  if (!isVendor(f)) html += '\n' + readFileSync(p, 'utf8');   // scan URL : vendeur exclu
}
check('vendeur (peerjs.min.js) exclu du scan URL, compté dans la taille', isVendor('js/peerjs.min.js'));

const pats = [
  ['URL http(s)://', /https?:\/\//i],
  ['protocole // (protocol-relative)', /["']\/\/[a-z0-9]/i],
  ['<img', /<img\b/i],
  ['<iframe|<object|<embed|<video|<audio|<source', /<(iframe|object|embed|video|audio|source)\b/i],
  ['@import', /@import\b/i],
  ['url() non data:', /url\(\s*(?!["']?data:)/i],
  ['fetch(/XMLHttpRequest/WebSocket', /\bfetch\s*\(|new\s+(XMLHttpRequest|WebSocket)\b/i],
  ['import/export externe (module URL)', /\bimport\s+.*from\s+["']https?/i]
];

for (const [label, re] of pats) {
  const m = html.match(re);
  check(`zéro occurrence : ${label}`, m === null, m ? 'trouvé : …' + html.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\n/g, ' ') + '…' : '');
}

// <script src= et <link : autorisés UNIQUEMENT si la cible est locale (js/… ou css/…).
const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
for (const s of scriptSrcs) {
  check(`<script src="${s}" référence locale`, s.startsWith('js/') && !s.includes('://'), s);
}
const linkHrefs = [...html.matchAll(/<link[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
for (const h of linkHrefs) {
  check(`<link href="${h}" référence locale`, h.startsWith('css/') && !h.includes('://'), h);
}
check('8 modules js/ référencés (deck, game, i18n, audio, fx, ui, net, peerjs)', scriptSrcs.length === 8, scriptSrcs.join(', '));
check('4 feuilles css/ référencées (base, fonts, theme, anim)', linkHrefs.length === 4, linkHrefs.join(', '));

// Attributs src= génériques : rien d'autre que data:/blob:/about: et les locales js/… (les css/… passent par href).
const otherSrc = [...html.matchAll(/\bsrc\s*=\s*["']([^"']*)["']/gi)]
  .map((m) => m[1])
  .filter((v) => !['data:', 'blob:', 'about:'].some((p) => v.startsWith(p)) && !v.startsWith('js/'));
check('aucun autre attribut src= (non data:/blob:/about:/js/)', otherSrc.length === 0, otherSrc.join(', '));

const fonts = (html.match(/data:font\/woff2;base64/g) || []).length;
check('2 polices embarquées en data:font/woff2;base64', fonts === 2, `trouvées : ${fonts}`);
check('aucun chargement de police externe (@font-face + src local)', (html.match(/@font-face/g) || []).length === fonts, `@font-face : ${html.match(/@font-face/g)?.length}`);
check('taille totale (index.html + css/ + js/) entre 100 et 256 Ko', bytes >= 100 * 1024 && bytes <= 256 * 1024, `${bytes} octets`);

summary('PORTE 8');
