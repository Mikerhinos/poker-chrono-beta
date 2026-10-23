// PORTE 4 — Toggle de rendu 2 couleurs ↔ 4 couleurs : vérifié en DOM + persisté.
import { connect, evalJs } from './cdp.mjs';
import { makeChecker } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const PAGE_PATH = fileURLToPath(new URL('../index.html', import.meta.url)).replace(/\\/g, '/');
const PAGE_URL = 'file:///' + PAGE_PATH;

const { check, summary } = makeChecker('PORTE 4');
const errors = { js: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect(process.argv[2] || '127.0.0.1:9351');
const page = (expr) => evalJs(cdp, expr);

async function waitForPage() {
  for (let i = 0; i < 100; i++) {
    const r = await page(`(document.readyState === 'complete' && window.G && window.G.version === '2.2.2' && window.G.UI) ? 'ready' : 'loading'`);
    if (r === 'ready') return;
    await sleep(200);
  }
  throw new Error('page jamais prête');
}

const cardColor = (sel) => `getComputedStyle(document.querySelector('#board-human .card.${sel}')).color`;
function colorsExpr() {
  return `JSON.stringify({ s0: ${cardColor('s0')}, s1: ${cardColor('s1')}, s2: ${cardColor('s2')}, s3: ${cardColor('s3')} })`;
}
const modeState = `JSON.stringify({ ds: document.body.dataset.colors, sel: document.getElementById('colors').value, ls: localStorage.getItem('poker-chrono-colors') })`;

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

  // État initial : 2 couleurs.
  const init = JSON.parse(await page(modeState));
  check('état initial : dataset = 2', init.ds === '2', JSON.stringify(init));
  check('état initial : select = 2', init.sel === '2');

  // Lance une partie pour que des cartes existent dans le DOM.
  await page(`(() => { document.querySelector('#time').value = '10'; document.querySelector('#start').click(); return 'started'; })()`);
  await sleep(300);
  let allSuits = true;
  for (const s of ['s0', 's1', 's2', 's3']) {
    allSuits = allSuits && (await page(`document.querySelectorAll('#board-human .card.${s}').length > 0`));
  }
  check('cartes présentes dans le DOM (4 atouts)', allSuits, 's0..s3 rendues');

  // Mode 2 : pique/trèfle noirs, cœur/carreau rouges.
  const m2 = JSON.parse(await page(colorsExpr()));
  check('mode 2 : cœur (s1) rouge #b3352c', m2.s1 === 'rgb(179, 53, 44)', m2.s1);
  check('mode 2 : carreau (s2) rouge #b3352c', m2.s2 === 'rgb(179, 53, 44)', m2.s2);
  check('mode 2 : pique (s0) noir #1a1f2b', m2.s0 === 'rgb(26, 31, 43)', m2.s0);
  check('mode 2 : trèfle (s3) noir #1a1f2b', m2.s3 === 'rgb(26, 31, 43)', m2.s3);

  // Bascule vers 4 couleurs.
  await page(`(() => { const el = document.getElementById('colors'); el.value = '4'; el.dispatchEvent(new Event('change')); return el.value; })()`);
  await sleep(100);
  const m4state = JSON.parse(await page(modeState));
  check('mode 4 : dataset = 4', m4state.ds === '4', JSON.stringify(m4state));
  check('mode 4 : persisté en localStorage = 4', m4state.ls === '4');
  const m4 = JSON.parse(await page(colorsExpr()));
  check('mode 4 : pique (s0) noir', m4.s0 === 'rgb(26, 31, 43)', m4.s0);
  check('mode 4 : cœur (s1) rouge', m4.s1 === 'rgb(179, 53, 44)', m4.s1);
  check('mode 4 : carreau (s2) vert', m4.s2 === 'rgb(31, 157, 85)', m4.s2);
  check('mode 4 : trèfle (s3) bleu', m4.s3 === 'rgb(36, 86, 201)', m4.s3);

  // Retour à 2 couleurs, puis persistance à travers un reload.
  await page(`(() => { const el = document.getElementById('colors'); el.value = '2'; el.dispatchEvent(new Event('change')); return el.value; })()`);
  await sleep(100);
  const m2back = JSON.parse(await page(modeState));
  check('retour mode 2 : dataset = 2, LS = 2', m2back.ds === '2' && m2back.ls === '2', JSON.stringify(m2back));
  await page(`(() => { const el = document.getElementById('colors'); el.value = '4'; el.dispatchEvent(new Event('change')); return el.value; })()`);
  await sleep(100);
  // Recharge la page : le choix doit survivre.
  await cdp.send('Page.navigate', { url: PAGE_URL });
  await waitForPage();
  const afterReload = JSON.parse(await page(modeState));
  check('persistance : après reload dataset = 4', afterReload.ds === '4', JSON.stringify(afterReload));
  check('persistance : après reload select = 4', afterReload.sel === '4');
  check('persistance : après reload LS = 4', afterReload.ls === '4');

  const totalErrors = errors.js.length + errors.console.length;
  if (totalErrors) console.log('  erreurs console/page : ' + JSON.stringify({ js: errors.js, console: errors.console }, null, 2));
  check('0 erreur JS console', totalErrors === 0, `${totalErrors} erreur(s)`);
  return totalErrors === 0;
};

const ok = await run();
process.exit(summary('PORTE 4') ? 0 : 1);
