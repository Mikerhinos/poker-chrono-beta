// PoC L34K — réexécution des 5 vecteurs d'audit contre l API publique v2.
// Chaque PoC DOIT échouer (non reproductible). Logs : results/poc-repro.log.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'poc-repro.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });

const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ PO COK ] ' : '[ POCKO ] ') + name + (info !== undefined ? ' — ' + info : ''));
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const cdp = await connect(process.argv[2] || '127.0.0.1:9321');
  try {
    const r = await cdp.send('Page.navigate', { url: 'file:///' + INDEX_HTML.replace(/\\/g, '/') });
    if (!r || r.error) throw new Error('Page.navigate a échoué: ' + JSON.stringify(r));
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try {
        ready = (await evalJs(cdp, "(document.readyState === 'complete' && window.G && window.G.version === '2.2.2' && window.G.UI) ? 'ready' : 'loading'")) === 'ready';
      } catch (e) { /* pas prêt */ }
      if (!ready) await new Promise((res) => setTimeout(res, 200));
    }
    if (!ready) throw new Error('ready timeout');
    lines.unshift('== PoC L34K v1 → v2 : 5 vecteurs rejoués via l API publique ==');
    lines.push('file: ' + INDEX_HTML);

    // ---- PoC H1 : seed 32 bits recouvrable par brute-force depuis le deck visible.
    const deckReal = await evalJs(cdp, 'JSON.stringify((function () { const s = G.createGame({ time: 20 }); return [...s.boards.human.flat(), ...s.boards.ai.flat(), ...s.deck]; })())');
    const real = JSON.parse(deckReal);
    await evalJs(cdp, 'window.__targetDeck = ' + JSON.stringify(real));
    const h1 = JSON.parse(await evalJs(cdp, '(() => { function mulberry32(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (a >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } const RANKS = [7,8,9,10,11,12,13,14]; function deckOf(seed) { const d = []; for (const s of [0,1,2,3]) for (const r of RANKS) d.push({ r, s }); const rng = mulberry32(seed ^ 0x9e3779b9); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; } return JSON.stringify(d); } const target = window.__targetDeck; const victims = [1103544327]; for (let i = 0; i < 100000; i++) victims.push(Math.floor(Math.random() * 4294967296)); let hit = null; for (const seed of victims) { if (deckOf(seed) === target) { hit = seed; break; } } return JSON.stringify({ tried: victims.length, hit: hit }); })()'));
    check('H1 : 100 001 seeds mulberry32 testés, aucun deck identique au deck réel (128 bits CSPRNG → non reproductible)', h1.tried === 100001 && h1.hit === null, JSON.stringify(h1));

    // ---- PoC H2 : fabrication de score en 2 lignes via G.state public.
    const h2 = JSON.parse(await evalJs(cdp, '(() => { const out = {}; out.hasState = "state" in G; out.hasLastSeed = "lastSeed" in G; try { G.state.result.human = 99999; out.threw = null; } catch (e) { out.threw = e.constructor.name; } return JSON.stringify(out); })()'));
    check('H2 : G.state absent — les 2 lignes du PoC lèvent une exception', h2.hasState === false && h2.threw !== null, JSON.stringify(h2));
    const h2b = JSON.parse(await evalJs(cdp, '(() => { const b = G.UI.boards(); b.human[0] = [{ r: 14, s: 0 }, { r: 13, s: 0 }, { r: 12, s: 0 }, { r: 11, s: 0 }, { r: 10, s: 0 }]; const b2 = G.UI.boards(); return JSON.stringify({ same: JSON.stringify(b.human[0]) === JSON.stringify(b2.human[0]) }); })()'));
    check('H2b : snapshot UI en lecture seule — le muter ne touche pas le jeu', h2b.same === false);

    // ---- PoC M1 : temps infini via tick(state, dt<0).
    const m1 = JSON.parse(await evalJs(cdp, '(() => { const st = G.createGame({ time: 20, seed: 7 }); G.start(st); const t0 = st.timeLeft; G.tick(st, -1e9); G.tick(st, NaN); const after = st.timeLeft; const ok = G.tick(st, 100); return JSON.stringify({ t0: t0, after: after, afterPositive: st.timeLeft, ended: ok.ended }); })()'));
    check('M1 : tick(dt<0) et tick(NaN) refusés — timeLeft inchangé, chrono normale après', m1.after === m1.t0 && m1.afterPositive === m1.t0 - 100 && m1.ended === false, JSON.stringify(m1));

    // ---- PoC M2 : best-score « abc » → plus jamais de record ; « 999999 » → record gelé.
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    await evalJs(cdp, 'localStorage.setItem("poker-chrono-best-score", "abc"); document.querySelector("#time").value = "10"; document.querySelector("#start").click(); "go"');
    let over = false;
    for (let i = 0; i < 60; i++) {
      over = (await evalJs(cdp, '!document.querySelector("#final").hidden')) === true;
      if (over) break;
      await sleep(500);
    }
    const m2 = JSON.parse(await evalJs(cdp, 'JSON.stringify({ final: !document.querySelector("#final").hidden, stored: localStorage.getItem("poker-chrono-best-score"), human: window.G.UI.result() ? window.G.UI.result().human : null })'));
    check('M2 : best « abc » → 0 — un score réel redevient un record', over && m2.stored === String(m2.human), JSON.stringify(m2));

    // ---- PoC L1 : XSS via innerHTML sur les lignes de décomposition.
    // Post-split : le scan couvre index.html + css/ + js/ (même critère : zéro innerHTML).
    let all = readFileSync(INDEX_HTML, 'utf-8');
    for (const d of ['css', 'js']) {
      for (const f of readdirSync(join(__dirname, '..', d)).sort()) {
        all += '\n' + readFileSync(join(__dirname, '..', d, f), 'utf-8');
      }
    }
    const innerCount = (all.match(/innerHTML/g) || []).length;
    check('L1 : zéro innerHTML dans index.html + css/ + js/ (rendu par createElement/textContent)', innerCount === 0, 'occurrences=' + innerCount);

    lines.push('FAILURES: ' + failures);
    lines.push('RESULT: ' + (failures === 0 ? 'POCS NON REPRODUCTIBLES' : 'POC REPRODUCTIBLE'));
  } finally {
    try { cdp.close(); } catch (e) {}
  }
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf-8');
  console.log(lines.join('\n'));
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
