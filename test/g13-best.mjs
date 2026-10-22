// G13 — best-score localStorage : valeur invalide → 0, records possibles (fix M2).
// 3 parties UI réelles de 10 s via #start.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'porte-13.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const cdp = await connect(process.argv[2] || '127.0.0.1:9323');
  try {
    const r = await cdp.send('Page.navigate', { url: 'file:///' + INDEX_HTML.replace(/\\\\/g, '/') });
    if (!r || r.error) throw new Error('Page.navigate a échoué: ' + JSON.stringify(r));
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try {
        ready = (await evalJs(cdp, "(document.readyState === 'complete' && window.G && window.G.version === '2.2.1' && window.G.UI) ? 'ready' : 'loading'")) === 'ready';
      } catch (e) { /* pas prêt */ }
      if (!ready) await new Promise((res) => setTimeout(res, 200));
    }
    if (!ready) throw new Error('ready timeout');
    async function playRealGame(seedValue) {
      await evalJs(cdp, "localStorage.setItem('poker-chrono-best-score', " + JSON.stringify(seedValue) + "); document.querySelector('#time').value = '10'; document.querySelector('#start').click(); 'go'");
      for (let i = 0; i < 60; i++) {
        if (await evalJs(cdp, "!document.querySelector('#final').hidden")) break;
        await sleep(500);
      }
      return JSON.parse(await evalJs(cdp, "JSON.stringify({ best: document.querySelector('#best').textContent, stored: localStorage.getItem('poker-chrono-best-score'), human: window.G.UI.result() ? window.G.UI.result().human : null })"));
    }

    // Scénario 1 : best « abc » → NaN → 0 : un score réel devient un record.
    const v1 = await playRealGame('abc');
    check('partie 1 : final atteint, score humain défini', v1.human !== null, JSON.stringify(v1));
    check('best « abc » ne bloque pas : record écrit', v1.stored === String(v1.human), 'stored=' + v1.stored + ' human=' + v1.human);
    check('affichage « Nouveau meilleur score »', /nouveau meilleur|new best/i.test(v1.best), v1.best);

    // Scénario 2 : best « 999999 » → score réel < 999999 : pas de record, valeur conservée.
    const v2 = await playRealGame('999999');
    check('best « 999999 » conservé (pas de faux record)', v2.stored === '999999', 'stored=' + v2.stored + ' human=' + v2.human);
    check('affichage du meilleur existant (pas « nouveau »)', (/meilleur score|best score/i).test(v2.best) && !/nouveau|new/i.test(v2.best), v2.best);

    // Scénario 3 : best « -5 » (négatif) → traité comme 0 → record possible.
    const v3 = await playRealGame('-5');
    check('best « -5 » → 0 : record écrit', v3.stored === String(v3.human), 'stored=' + v3.stored + ' human=' + v3.human);
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
