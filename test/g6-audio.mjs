// PORTE 6 — Audio Web Audio API : 0 erreur console, init headless OK,
// toggles + sliders fonctionnels, SFX invocables sans exception.
import { connect, evalJs } from './cdp.mjs';
import { makeChecker } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const PAGE_PATH = fileURLToPath(new URL('../index.html', import.meta.url)).replace(/\\/g, '/');
const PAGE_URL = 'file:///' + PAGE_PATH;

const { check, summary } = makeChecker('PORTE 6');
const errors = { js: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect(process.argv[2] || '127.0.0.1:9353');
const page = (expr) => evalJs(cdp, expr);

async function waitForPage() {
  for (let i = 0; i < 100; i++) {
    const r = await page(`(document.readyState === 'complete' && window.G && window.G.version === '2.2.2' && window.G.UI) ? 'ready' : 'loading'`);
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

  check('G.AUDIO défini', await page(`typeof window.G.AUDIO === 'object' && window.G.AUDIO !== null`));
  const init = JSON.parse(await page(`JSON.stringify({ ready: G.AUDIO.ensure(), ctx: !!G.AUDIO.state.ctx })`));
  check('init headless OK (ensure() sans exception)', init.ready === true || init.ready === false);
  check('AudioContext créé headless', init.ctx === true, JSON.stringify(init));

  // Toggles musique / SFX + persistance (l'entrée LS n'est écrite qu'au premier toggle).
  // v2.1.2 : musique OFF par défaut au chargement frais (aucune entrée LS) ; SFX ON inchangé.
  const st0 = JSON.parse(await page(`JSON.stringify({ m: G.AUDIO.state.musicOn, s: G.AUDIO.state.sfxOn,
    lm: localStorage.getItem('poker-chrono-audio-music'),
    pressed: document.getElementById('music-toggle').getAttribute('aria-pressed'),
    cls: document.getElementById('music-toggle').className })`));
  check('musique OFF par défaut (chargement frais : musicOn === false, aucune entrée LS)', st0.m === false && st0.lm === null, JSON.stringify(st0));
  check('toggle musique reflète OFF au chargement (aria-pressed=false, pas de classe .on)', st0.pressed === 'false' && !st0.cls.includes('on'), JSON.stringify(st0));
  check('SFX ON par défaut', st0.s === true);
  // v2.1 (fix réactivité) : 1er clic sur chaque canal = armement du son (force ON + AudioContext
  // dans le même tick), clics suivants = basculement normal.
  await page(`document.getElementById('music-toggle').click()`);
  const st1 = JSON.parse(await page(`JSON.stringify({ m: G.AUDIO.state.musicOn, lm: localStorage.getItem('poker-chrono-audio-music'),
    pressed: document.getElementById('music-toggle').getAttribute('aria-pressed') })`));
  check('musique 1er clic : armement ON (v2.1) : état + LS + aria-pressed', st1.m === true && st1.lm === '1' && st1.pressed === 'true', JSON.stringify(st1));
  await page(`document.getElementById('music-toggle').click()`);
  const st2 = JSON.parse(await page(`G.AUDIO.state.musicOn === false && localStorage.getItem('poker-chrono-audio-music') === '0'`));
  check('musique 2e clic : OFF', st2 === true);
  await page(`document.getElementById('music-toggle').click()`);
  const st2b = JSON.parse(await page(`G.AUDIO.state.musicOn === true && localStorage.getItem('poker-chrono-audio-music') === '1'`));
  check('musique 3e clic : ON (retour)', st2b === true);
  await page(`document.getElementById('sfx-toggle').click()`);
  const st3 = JSON.parse(await page(`JSON.stringify({ s: G.AUDIO.state.sfxOn, ls: localStorage.getItem('poker-chrono-audio-sfx') })`));
  check('SFX 1er clic : armement ON (v2.1) : état + LS', st3.s === true && st3.ls === '1', JSON.stringify(st3));
  await page(`document.getElementById('sfx-toggle').click()`);
  const st3b = JSON.parse(await page(`G.AUDIO.state.sfxOn === false && localStorage.getItem('poker-chrono-audio-sfx') === '0'`));
  check('SFX 2e clic : OFF', st3b === true);

  // Sliders de volume séparés.
  await page(`(() => { const el = document.getElementById('music-vol'); el.value = '33'; el.dispatchEvent(new Event('input')); return el.value; })()`);
  const v1 = await page(`G.AUDIO.state.musicVol`);
  check('slider volume musique = 0.33', Math.abs(v1 - 0.33) < 1e-9, String(v1));
  await page(`(() => { const el = document.getElementById('sfx-vol'); el.value = '50'; el.dispatchEvent(new Event('input')); return el.value; })()`);
  const v2 = await page(`JSON.stringify({ m: G.AUDIO.state.musicVol, s: G.AUDIO.state.sfxVol })`);
  const vols = JSON.parse(v2);
  check('sliders séparés (musique 0.33 / SFX 0.5)', Math.abs(vols.m - 0.33) < 1e-9 && Math.abs(vols.s - 0.5) < 1e-9, v2);

  // Tous les SFX invocables sans exception (no-op si le contexte n'est pas running).
  const sfxOk = await page(`(() => {
    try {
      ['deal', 'swap', 'swapSoft', 'tick', 'tock', 'sirene', 'victoire', 'defaite', 'egalite']
        .forEach((n) => { if (typeof G.AUDIO.sfx[n] !== 'function') throw new Error('sfx manquant : ' + n); G.AUDIO.sfx[n](); });
      return 'OK';
    } catch (e) { return 'ERR:' + e.message; }
  })()`);
  check('9 SFX invocables sans exception', sfxOk === 'OK', sfxOk);

  // Partie complète : tic-tac, sirène, SFX de fin déclenchés par l'UI (aucune erreur).
  await page(`(() => { document.querySelector('#time').value = '10'; document.querySelector('#start').click(); return 'started'; })()`);
  for (let i = 0; i < 32; i++) {
    if (await page(`!document.querySelector('#final').hidden`)) break;
    await sleep(500);
  }
  check('partie complète avec audio : final atteint', await page(`!document.querySelector('#final').hidden`));

  const totalErrors = errors.js.length + errors.console.length;
  if (totalErrors) console.log('  erreurs console/page : ' + JSON.stringify({ js: errors.js, console: errors.console }, null, 2));
  check('0 erreur JS console (audio headless)', totalErrors === 0, `${totalErrors} erreur(s)`);
  return totalErrors === 0;
};

const ok = await run();
process.exit(summary('PORTE 6') ? 0 : 1);
