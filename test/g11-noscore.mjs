// G11 — Fabrication de score via l API publique impossible (fix H2/M1, PoC L34K).
// État vivant en closure (snapshots lecture seule), plus de handle d état public mutable.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'porte-11.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });

const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const cdp = await connect(process.argv[2] || '127.0.0.1:9321');
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
    // H2a : plus de handle d état public mutable.
    const h = JSON.parse(await evalJs(cdp, "JSON.stringify({ hasState: 'state' in window.G, hasLastSeed: 'lastSeed' in window.G })"));
    check('G.state absent du namespace public', h.hasState === false, JSON.stringify(h));
    check('G.lastSeed absent du namespace public', h.hasLastSeed === false);

    // H2b : le snapshot UI est une copie — le muter ne change pas le jeu vivant.
    const sv = JSON.parse(await evalJs(cdp, "(function () { const b = G.UI.boards(); b.human[0] = [{ r: 14, s: 0 }, { r: 13, s: 0 }, { r: 12, s: 0 }, { r: 11, s: 0 }, { r: 10, s: 0 }]; const b2 = G.UI.boards(); return JSON.stringify({ same: JSON.stringify(b.human[0]) === JSON.stringify(b2.human[0]) }); })()"));
    check('muter le snapshot ne modifie pas le plateau vivant', sv.same === false);

    // M1 : tick(dt négatif / NaN) refusé sur partie démarrée — pas de chrono infini.
    const t = JSON.parse(await evalJs(cdp, "(function () { const st = G.createGame({ time: 20, seed: 7 }); G.start(st); const t0 = st.timeLeft; const r1 = G.tick(st, -1e9); const r2 = G.tick(st, NaN); const after = st.timeLeft; const ok = G.tick(st, 100); return JSON.stringify({ t0: t0, after: after, r1: r1, r2: r2, afterPositive: st.timeLeft, ok: ok }); })()"));
    check('tick(dt négatif) ignoré, timeLeft inchangé', t.after === t.t0 && t.r1.ended === false, JSON.stringify(t.r1));
    check('tick(dt NaN) ignoré, timeLeft inchangé', t.r2.ended === false && t.after === t.t0);
    check('tick(dt positif) fonctionne après refus (consistance)', t.ok.ended === false && t.afterPositive === t.t0 - 100, 'afterPositive=' + t.afterPositive);

    // Intégrité : le score final est celui du barème (aucune fabrication possible).
    const s = JSON.parse(await evalJs(cdp, "(function () { const { st, errors } = G.simulateGame({ time: 10, seed: 4242 }); return JSON.stringify({ errors, over: st.over, human: st.result ? st.result.human : null, ai: st.result ? st.result.ai : null, refHuman: G.boardScore(st.boards.human), refAI: G.boardScore(st.boards.ai) }); })()"));
    check('simulateGame : 0 erreur, partie terminée', s.errors.length === 0 && s.over === true, JSON.stringify(s.errors));
    check('score humain final = barème du plateau final', s.human === s.refHuman, 'human=' + s.human + ' ref=' + s.refHuman);
    check('score IA final = barème du plateau final', s.ai === s.refAI, 'ai=' + s.ai + ' ref=' + s.refAI);
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
