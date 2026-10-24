// G12 — Entropie du seed (v2.1) : parties réelles uniques (128 bits CSPRNG),
// override 128 bits déterministe, contrat miroir (même seed → mêmes 15 cartes,
// main joueur == main IA).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'porte-12.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });

const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const cdp = await connect(process.argv[2] || '127.0.0.1:9322');
  try {
    const r = await cdp.send('Page.navigate', { url: 'file:///' + INDEX_HTML.replace(/\\\\/g, '/') });
    if (!r || r.error) throw new Error('Page.navigate a échoué: ' + JSON.stringify(r));
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try {
        ready = (await evalJs(cdp, "(document.readyState === 'complete' && window.G && window.G.version === '2.2.3' && window.G.UI) ? 'ready' : 'loading'")) === 'ready';
      } catch (e) { /* pas prêt */ }
      if (!ready) await new Promise((res) => setTimeout(res, 200));
    }
    if (!ready) throw new Error('ready timeout');
    // Deal = { h: main joueur (15), a: main IA (15, miroir), deck: 37 cartes non utilisées }.
    const mkDeal = 'JSON.stringify((function (o) { const s = G.createGame(o); return { h: s.boards.human, a: s.boards.ai, deck: s.deck }; })(' +
      '{ time: 20' + (', seed: $SEED') + '})' + ')';

    // a) 2 parties « réelles » (sans seed) → deals différents (128 bits CSPRNG).
    const A = JSON.parse(await evalJs(cdp, mkDeal.replace(', seed: $SEED', '')));
    const B = JSON.parse(await evalJs(cdp, mkDeal.replace(', seed: $SEED', '')));
    check('deals de 52 cartes (15+15+37)', A.h.flat().length === 15 && A.deck.length === 37 && B.h.flat().length === 15 && B.deck.length === 37);
    check('miroir réel : main joueur == main IA', JSON.stringify(A.h) === JSON.stringify(A.a) && JSON.stringify(B.h) === JSON.stringify(B.a));
    check('2 parties réelles → deals différents (128 bits)', JSON.stringify(A) !== JSON.stringify(B));

    // b) même seed d'override (128 bits) → mêmes 15 cartes, miroir conservé.
    const S1 = JSON.parse(await evalJs(cdp, mkDeal.replace('$SEED', '1234')));
    const S2 = JSON.parse(await evalJs(cdp, mkDeal.replace('$SEED', '1234')));
    check('même seed override → mêmes 15 cartes (joueur)', JSON.stringify(S1.h) === JSON.stringify(S2.h));
    check('même seed override → main IA identique (miroir)', JSON.stringify(S1.a) === JSON.stringify(S2.a));
    check('override : miroir human == ai', JSON.stringify(S1.h) === JSON.stringify(S1.a));

    // c) deux seeds 128 bits différents → deals différents.
    const T = JSON.parse(await evalJs(cdp, mkDeal.replace('$SEED', '9999')));
    check('deux seeds 128 bits différents → deals différents', JSON.stringify(S1.h) !== JSON.stringify(T.h));

    // d) seeds invalides (négatif, non entier) → chemin réel, pas d exception.
    const bad = await evalJs(cdp, 'JSON.stringify({ a: ' + mkDeal.replace('$SEED', '-1') + ', b: ' + mkDeal.replace('$SEED', '3.5') + ' })');
    const bv = JSON.parse(bad);
    check('seed négatif → chemin réel (≠ deal override)', JSON.stringify(bv.a) !== JSON.stringify(S1));
    check('seed non entier → chemin réel (≠ deal override)', JSON.stringify(bv.b) !== JSON.stringify(S1));
    check('seeds invalides : miroir conservé', JSON.stringify(bv.a.h) === JSON.stringify(bv.a.a));
  } finally {
    try { cdp.close(); } catch (e) {}
  }
  lines.push('FAILURES: ' + failures);
  lines.push('RESULT: ' + (failures === 0 ? 'OK' : 'KO'));
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf-8');
  console.log(lines.join('\n'));
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
