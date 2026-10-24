// PORTE 5 — Smoke test UI : vrai drag & drop DOM sur Chrome headless (CDP),
// chaque difficulté jouée jusqu'au score final, 0 erreur console.
import { connect, evalJs } from './cdp.mjs';
import { makeChecker } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const PAGE_PATH = fileURLToPath(new URL('../index.html', import.meta.url)).replace(/\\/g, '/');
const PAGE_URL = 'file:///' + PAGE_PATH;

const { check, summary } = makeChecker('PORTE 5');
const errors = { js: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect(process.argv[2] || '127.0.0.1:9347');

async function page(expr) { return evalJs(cdp, expr); }

async function waitForPage() {
  for (let i = 0; i < 100; i++) {
    const r = await page(`(document.readyState === 'complete' && window.G && window.G.version === '2.2.3' && window.G.UI) ? 'ready' : 'loading'`);
    if (r === 'ready') return;
    await sleep(200);
  }
  throw new Error('page jamais prête');
}

// Code page : drag Pointer Events sur la carte fromIdx (pointerdown/move/up),
// dépôt au centre de targetExpr, retour thenExpr. v2.1.2 : API Pointer Events
// (remplace DragEvents/DataTransfer, inopérante en tactile).
function dropExpr(fromIdx, targetExpr, thenExpr) {
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
    let tx, ty;
    if (target === document.body) {
      tx = 4; ty = 4; // hors plateau : coin haut-gauche (zone du header, aucune .cell)
    } else {
      target.scrollIntoView(); // elementFromPoint est borné au viewport : amener la cible à l'écran
      const tr = target.getBoundingClientRect();
      tx = tr.left + tr.width / 2; ty = tr.top + tr.height / 2;
    }
    pe('pointerdown', sx, sy, card);
    pe('pointermove', tx, ty, card); // déplacement > 4 px : le drag est armé
    pe('pointerup', tx, ty, target);
    return ${thenExpr};
  })()`;
}

const cellTarget = (i) => `document.querySelector('#board-human .cell[data-idx="${i}"]')`;

async function playOneGame(difficulty) {
  await page(`(() => {
    document.querySelector('#diff').value = ${JSON.stringify(difficulty)};
    document.querySelector('#time').value = '20';
    document.querySelector('#start').click();
    return 'started';
  })()`);

  const boardBefore = JSON.parse(await page(`JSON.stringify(window.G.UI.board('human'))`));
  let swapped = false;
  let iterations = 0;
  for (let i = 0; i < 80; i++) {
    const done = await page(`!document.querySelector('#final').hidden`);
    if (done) break;
    iterations++;
    const from = (i * 3 + 1) % 15;
    let to = (i * 7 + 2) % 15;
    if (to === from) to = (to + 1) % 15;
    await page(dropExpr(from, cellTarget(to), 'window.G.UI.humanMoves()'));
    if (i === 0) {
      const boardAfter = JSON.parse(await page(`JSON.stringify(window.G.UI.board('human'))`));
      swapped = boardAfter !== boardBefore;
    }
    await sleep(650);
  }

  const finalVisible = await page(`!document.querySelector('#final').hidden`);
  const scores = JSON.parse(await page(`JSON.stringify({
    human: window.G.UI.result().human,
    ai: window.G.UI.result().ai,
    winner: window.G.UI.result().winner,
    rowsHuman: document.querySelectorAll('#rows-human .row-line').length,
    rowsAI: document.querySelectorAll('#rows-ai .row-line').length,
    timer: document.querySelector('#timer').textContent,
    status: document.querySelector('#status').textContent,
    displayedHuman: document.querySelector('#score-human').textContent,
    displayedAI: document.querySelector('#score-ai').textContent
  })`));
  return { swapped, finalVisible, iterations, scores };
}

async function testSwapRejects() {
  // Partie courte (10 s) : les dépôts de refus se testent PENDANT le jeu.
  await page(`(() => {
    document.querySelector('#diff').value = 'normal';
    document.querySelector('#time').value = '10';
    document.querySelector('#start').click();
    return 'started';
  })()`);
  await sleep(400);

  const res1 = await page(dropExpr(0, 'document.body', `document.querySelector('#msg').textContent`));
  check('dépôt hors plateau → message d’annulation', /annul|cancel/i.test(res1), JSON.stringify(res1));

  const res2 = await page(dropExpr(1, `document.querySelector('#board-ai .cell[data-idx="3"]')`, `document.querySelector('#msg').textContent`));
  check('dépôt sur le plateau IA → refus (lecture seule)', /lecture seule|Refus|read-only/i.test(res2), JSON.stringify(res2));

  // Laisse la partie courir jusqu'au final (10 s).
  for (let i = 0; i < 40; i++) {
    if (await page(`!document.querySelector('#final').hidden`)) break;
    await sleep(500);
  }
  check('partie de refus : final atteint', await page(`!document.querySelector('#final').hidden`));
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
  check('page chargée, G v2 (snapshots UI) présent', true);

  for (const diff of ['facile', 'normal', 'difficile']) {
    const { swapped, finalVisible, iterations, scores } = await playOneGame(diff);
    const label = `partie ${diff}`;
    check(`${label} : drag & drop a modifié le plateau (${iterations} drops)`, swapped);
    check(`${label} : écran final affiché`, finalVisible);
    check(`${label} : 3 lignes décomposées par joueur`, scores.rowsHuman === 3 && scores.rowsAI === 3,
      `humain ${scores.rowsHuman}, IA ${scores.rowsAI}`);
    check(`${label} : timer à 0.0 s au final`, /0\.0/.test(scores.timer), scores.timer);
    check(`${label} : scores affichés = scores calculés`,
      Number(scores.displayedHuman) === scores.human && Number(scores.displayedAI) === scores.ai,
      `affichés ${scores.displayedHuman}/${scores.displayedAI}, calculés ${scores.human}/${scores.ai}`);
    console.log(`    ${label} : humain ${scores.human} pts, IA ${scores.ai} pts, vainqueur ${scores.winner} — ${scores.status}`);
  }

  await testSwapRejects();

  const totalErrors = errors.js.length + errors.console.length;
  if (totalErrors) console.log('  erreurs console/page : ' + JSON.stringify({ js: errors.js, console: errors.console }, null, 2));
  check('0 erreur JS console (3 parties + refus)', totalErrors === 0, `${totalErrors} erreur(s)`);
  return totalErrors === 0;
};

const ok = await run();
process.exit(summary('PORTE 5') ? 0 : 1);
