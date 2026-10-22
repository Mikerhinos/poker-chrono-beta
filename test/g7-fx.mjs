// PORTE 7 — FX canvas 2D : 0 erreur JS avec effets activés, 60 fps ciblés.
import { connect, evalJs } from './cdp.mjs';
import { makeChecker } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const PAGE_PATH = fileURLToPath(new URL('../index.html', import.meta.url)).replace(/\\/g, '/');
const PAGE_URL = 'file:///' + PAGE_PATH;

const { check, summary } = makeChecker('PORTE 7');
const errors = { js: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect(process.argv[2] || '127.0.0.1:9354');
const page = (expr) => evalJs(cdp, expr);

async function waitForPage() {
  for (let i = 0; i < 100; i++) {
    const r = await page(`(document.readyState === 'complete' && window.G && window.G.version === '2.2.1' && window.G.UI) ? 'ready' : 'loading'`);
    if (r === 'ready') return;
    await sleep(200);
  }
  throw new Error('page jamais prête');
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

  check('G.FX défini (canvas présent)', await page(`typeof window.G.FX === 'object' && window.G.FX !== null`));
  const dims = JSON.parse(await page(`(() => {
    const c = document.getElementById('fx');
    return JSON.stringify({ w: c.width, h: c.height, dpr: window.devicePixelRatio, clamp: window.devicePixelRatio <= 2 });
  })()`));
  check('canvas plein écran (largeur/hauteur > 0)', dims.w > 0 && dims.h > 0, JSON.stringify(dims));
  check('devicePixelRatio borné ≤ 2', dims.clamp === true, `dpr=${dims.dpr}`);

  // Effets activés : deal + bursts + particules actives.
  await page(`(() => { document.querySelector('#time').value = '10'; document.querySelector('#start').click(); return 'started'; })()`);
  await sleep(250);
  const active1 = await page(`G.FX.activeCount()`);
  check('particules actives après le deal', active1 > 0, `actives=${active1}`);
  await page(`(() => {
    G.FX.burst(window.innerWidth / 2, window.innerHeight / 2, 24, { col: 'gold' });
    G.FX.burst(window.innerWidth * 0.3, window.innerHeight * 0.4, 16, { col: 'red' });
    G.FX.burst(window.innerWidth * 0.7, window.innerHeight * 0.6, 16, { col: 'green' });
    return 'burst';
  })()`);
  const active2 = await page(`G.FX.activeCount()`);
  check('bursts ajoutent des particules', active2 > active1, `avant=${active1} après=${active2}`);

  // Mesure FPS pendant 3 s avec effets actifs (cible 60 fps).
  await sleep(3000);
  const fps = await page(`G.FX.fps()`);
  check('60 fps ciblés (mesure headless ≥ 45 fps)', fps >= 45, `fps mesuré = ${fps}`);

  // Secousse d'écran à la fin du chrono (classe 'shake' sur <main>).
  let shakeSeen = false;
  for (let i = 0; i < 30; i++) {
    const over = await page(`!document.querySelector('#final').hidden`);
    if (over) break;
    await sleep(300);
  }
  for (let i = 0; i < 12; i++) {
    if (await page(`document.querySelector('main').classList.contains('shake')`)) { shakeSeen = true; break; }
    await sleep(100);
  }
  check('secousse d’écran déclenchée au final', shakeSeen === true);

  const totalErrors = errors.js.length + errors.console.length;
  if (totalErrors) console.log('  erreurs console/page : ' + JSON.stringify({ js: errors.js, console: errors.console }, null, 2));
  check('0 erreur JS avec FX activés', totalErrors === 0, `${totalErrors} erreur(s)`);
  return totalErrors === 0;
};

const ok = await run();
process.exit(summary('PORTE 7') ? 0 : 1);
