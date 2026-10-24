// PORTE 5 — Nom de la main courante affiché en face de chaque ligne :
// identique à la main évaluée (100 % des cas testés, deal + chaque swap).
import { connect, evalJs } from './cdp.mjs';
import { makeChecker } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const PAGE_PATH = fileURLToPath(new URL('../index.html', import.meta.url)).replace(/\\/g, '/');
const PAGE_URL = 'file:///' + PAGE_PATH;

const { check, summary } = makeChecker('PORTE 5');
const errors = { js: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect(process.argv[2] || '127.0.0.1:9352');
const page = (expr) => evalJs(cdp, expr);

async function waitForPage() {
  for (let i = 0; i < 100; i++) {
    const r = await page(`(document.readyState === 'complete' && window.G && window.G.version === '2.2.3' && window.G.UI) ? 'ready' : 'loading'`);
    if (r === 'ready') return;
    await sleep(200);
  }
  throw new Error('page jamais prête');
}

// Compare les 6 noms de lignes au résultat de G.boardBreakdown (même fonction que le score).
const VERIFY = `(() => {
  const bad = [];
  for (const nm of ['human', 'ai']) {
    const bd = G.boardBreakdown(G.UI.board(nm));
    const names = document.querySelectorAll('#board-' + nm + ' .row .row-name');
    for (let r = 0; r < 3; r++) {
      const shown = names[r] ? names[r].textContent : '(manquant)';
      if (shown !== G.I18N.handName(bd[r].label)) bad.push(nm + ':l' + r + ' affichée=' + JSON.stringify(shown) + ' évaluée=' + JSON.stringify(G.I18N.handName(bd[r].label)));
    }
  }
  return bad.length === 0 ? 'OK' : 'BAD|' + bad.join(' || ');
})()`;

// v2.1.2 : drag Pointer Events (remplace DragEvents/DataTransfer).
function dropExpr(fromIdx, targetExpr) {
  return `(() => {
    const pe = (type, x, y, el) => {
      const e = new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse',
        clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1
      });
      el.dispatchEvent(e);
    };
    const card = document.querySelector('#board-human .cell[data-idx="${fromIdx}"] .card');
    const cr = card.getBoundingClientRect();
    const sx = cr.left + cr.width / 2, sy = cr.top + cr.height / 2;
    const target = ${targetExpr};
    target.scrollIntoView(); // elementFromPoint est borné au viewport : cible à l'écran
    const tr = target.getBoundingClientRect();
    pe('pointerdown', sx, sy, card);
    pe('pointermove', tr.left + tr.width / 2, tr.top + tr.height / 2, card);
    pe('pointerup', tr.left + tr.width / 2, tr.top + tr.height / 2, target);
    return 'done';
  })()`;
}

const run = async () => {
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  cdp.setEventHandler((ev) => {
    if (ev.method === 'Runtime.exceptionThrown') errors.js.push(JSON.stringify(ev.params.exceptionDetails));
    else if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') errors.console.push(ev.params.entry);
    else if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error')
      errors.console.push({ detail: (ev.params.args || []).map((a) => a.value || a.description || '').join(' ') });
  });

  await cdp.send('Page.navigate', { url: PAGE_URL });
  await waitForPage();

  // Nom des lignes AVANT le deal (plateaux vides : '—' ou vide, pas d'étiquette requise).
  await page(`(() => { document.querySelector('#time').value = '30'; document.querySelector('#start').click(); return 'started'; })()`);
  await sleep(250);
  const afterDeal = await page(VERIFY);
  check('après deal : 6 noms = 6 mains évaluées', afterDeal === 'OK', afterDeal);

  // Boucle : swaps humains + coups IA, vérification à chaque pas.
  const TOTAL = 24;
  let failures = [];
  for (let i = 0; i < TOTAL; i++) {
    const done = await page(`!document.querySelector('#final').hidden`);
    if (done) break;
    const from = (i * 5 + 3) % 15;
    const to = (i * 9 + 1) % 15;
    if (to !== from) {
      await page(dropExpr(from, `document.querySelector('#board-human .cell[data-idx="${to}"]')`));
    }
    await sleep(750);
    const res = await page(VERIFY);
    if (res !== 'OK') failures.push({ i, res });
  }
  check(`${TOTAL} vérifications en jeu : 100 % des noms = main évaluée`, failures.length === 0,
    failures.length ? JSON.stringify(failures.slice(0, 5)) : '0 écart sur ' + TOTAL + ' itérations');

  // Vérification finale sur l'écran de fin (dernier état des plateaux).
  const finalRes = await page(VERIFY);
  check('état final : 6 noms = 6 mains évaluées', finalRes === 'OK', finalRes);

  const totalErrors = errors.js.length + errors.console.length;
  if (totalErrors) console.log('  erreurs console/page : ' + JSON.stringify({ js: errors.js, console: errors.console }, null, 2));
  check('0 erreur JS console', totalErrors === 0, `${totalErrors} erreur(s)`);
  return totalErrors === 0;
};

const ok = await run();
process.exit(summary('PORTE 5') ? 0 : 1);
