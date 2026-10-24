// G9 — Barème des 60 plateaux × 30 seeds (1000..1029), via CDP (règle R).
// v2 : lecture via l état retourné par G.createGame (objet par appel) + G.UI pour la page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = join(__dirname, '..', 'index.html');
const OUT = join(__dirname, 'results', 'porte-9.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });

const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const cdp = await connect(process.argv[2] || '127.0.0.1:9355');
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

    /* ---- v2.2.1 décision D — check de layout déterministe à 1920x1080 (CSS seul) ----
       Le contenu du plateau joueur (#board-human : h2, .rows, .total) doit être aligné
       à droite dans son cadre ; le bouton GO reste à droite de la ligne de score ;
       le plateau IA (#board-ai) n'est pas modifié et reste immédiatement à droite du
       plateau joueur ; le layout mobile (<900 px, 1 colonne) reste utilisable. */
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await new Promise((res) => setTimeout(res, 300));
    const layRaw = await evalJs(cdp, `(() => {
      const rc = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
      const human = document.querySelector('#board-human');
      const ai = document.querySelector('#board-ai');
      const main = document.querySelector('main');
      const gridRight = (b) => { let r = -Infinity; for (const c of b.querySelectorAll('.rows .cell')) { const p = c.getBoundingClientRect(); if (p.right > r) r = p.right; } return r; };
      const gridLeft = (b) => { let l = Infinity; for (const c of b.querySelectorAll('.rows .cell')) { const p = c.getBoundingClientRect(); if (p.left < l) l = p.left; } return l; };
      const bH = getComputedStyle(human), bA = getComputedStyle(ai);
      const hr = rc(human), ar = rc(ai);
      return JSON.stringify({
        hr, ar,
        total: rc(human.querySelector('.total')),
        go: rc(human.querySelector('#go')),
        h2: rc(human.querySelector('h2')),
        pts: rc(human.querySelectorAll('.total span')[1]),
        gridH: gridRight(human),
        rowsH: rc(human.querySelector('.rows')),
        gridA: gridLeft(ai),
        rowA: ai.querySelector('.row').getBoundingClientRect().left,
        track0: parseFloat(getComputedStyle(ai.querySelector('.row')).gridTemplateColumns.split(' ')[0]),
        innerRH: hr[2] - parseFloat(bH.borderRightWidth) - parseFloat(bH.paddingRight),
        innerLA: ar[0] + parseFloat(bA.borderLeftWidth) + parseFloat(bA.paddingLeft),
        gap: parseFloat(getComputedStyle(main).gap)
      });
    })()`);
    const lay = JSON.parse(typeof layRaw === 'string' ? layRaw : layRaw.value);
    const near = (a, b, tol = 8) => Math.abs(a - b) <= tol;
    check('D1 : bord droit de la grille de cartes (.rows + cellules) du plateau joueur à <= 8 px du bord droit intérieur du cadre (1920x1080)', near(lay.gridH, lay.innerRH) && near(lay.rowsH[2], lay.innerRH), 'grille droit=' + lay.gridH + ' px, .rows droit=' + lay.rowsH[2] + ' px, cadre droit int.=' + lay.innerRH + ' px (d=' + (lay.innerRH - lay.gridH) + ' px)');
    check('D2 : bord droit de la ligne de score (.total) à <= 8 px du bord droit intérieur du cadre', near(lay.total[2], lay.innerRH), 'total droit=' + lay.total[2] + ' px');
    check('D3 : bord droit du titre (h2) à <= 8 px du bord droit intérieur du cadre', near(lay.h2[2], lay.innerRH), 'h2 droit=' + lay.h2[2] + ' px');
    check('D4 : bouton GO à droite de la ligne de score, dans le cadre', lay.go[0] >= lay.pts[2] - 0.5 && lay.go[2] <= lay.innerRH + 0.5, 'go=[' + lay.go[0] + '..' + lay.go[2] + '], pts.droit=' + lay.pts[2] + ', cadre droit int.=' + lay.innerRH);
    check('D5 : plateau joueur immédiatement à gauche du plateau IA (écart = gap grid ' + lay.gap + ' px)', Math.abs((lay.ar[0] - lay.hr[2]) - lay.gap) <= 1 && lay.hr[0] < lay.ar[0], 'human.droit=' + lay.hr[2] + ', ai.gauche=' + lay.ar[0] + ', gap=' + lay.gap);
    check('D6 : plateau IA non modifié (ligne .row à <= 8 px du bord gauche intérieur du cadre, grille de cartes à 134 px de celle-ci : colonnes de nom + gap)', near(lay.rowA, lay.innerLA) && Math.abs((lay.gridA - lay.rowA) - (lay.track0 + 6)) <= 1, 'rowA.gauche=' + lay.rowA + ' px, cadre gauche int.=' + lay.innerLA + ' px, grille cartes gauche=' + lay.gridA + ' px, track0=' + lay.track0 + ' px');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 1000, deviceScaleFactor: 1, mobile: false });
    await new Promise((res) => setTimeout(res, 300));
    const mobRaw = await evalJs(cdp, `(() => {
      const human = document.querySelector('#board-human');
      const ai = document.querySelector('#board-ai');
      return JSON.stringify({
        cols: getComputedStyle(document.querySelector('main')).gridTemplateColumns,
        aTop: ai.getBoundingClientRect().top,
        hBottom: human.getBoundingClientRect().bottom
      });
    })()`);
    const mob = JSON.parse(typeof mobRaw === 'string' ? mobRaw : mobRaw.value);
    check('D7 : mobile <900 px — 1 colonne (layout restant utilisable)', mob.cols.trim().split(/\\s+/).length === 1, 'grid-template-columns=' + mob.cols);
    check('D8 : mobile — plateau IA sous le plateau joueur', mob.aTop >= mob.hBottom - 1, 'aTop=' + mob.aTop + ', hBottom=' + mob.hBottom);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

    let allOk = true;
    const perSeed = [];
    for (let seed = 1000; seed <= 1029; seed++) {
      const expr = '(() => { const st = G.createGame({ time: 100000, seed: ' + seed + ' }); const out = []; for (const who of ["human", "ai"]) { const b = st.boards[who]; const bd = G.boardBreakdown(b); const sum = b.reduce((t, row) => t + G.rowScore(row), 0); const bs = G.boardScore(b); const ok = bd.reduce((t, r) => t + r.score, 0) === sum && bs === sum; out.push({ who, score: bs, rowSum: sum, bdSum: bd.reduce((t, r) => t + r.score, 0), ok }); } return JSON.stringify(out); })()';
      const v = await evalJs(cdp, expr);
      const boards = JSON.parse(typeof v === 'string' ? v : v.value);
      const okAll = boards.every((b) => b.ok);
      if (!okAll) allOk = false;
      perSeed.push('seed ' + seed + ': h=' + boards[0].score + ' ia=' + boards[1].score + ' ' + (okAll ? 'OK' : 'KO'));
    }
    lines.unshift('== G9 — 30 seeds × 2 plateaux, barème interne cohérent (v2) ==');
    lines.push('file: ' + INDEX_HTML);
    lines.push(...perSeed);
    check('60 plateaux : somme des lignes = boardScore = barème', allOk);
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
