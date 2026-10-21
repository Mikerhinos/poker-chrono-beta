// G13 — Fondation P2P WebRTC (milestone V2.2-A).
// Preuve de bout en bout, dans le navigateur (CDP, Chrome headless) :
//   - signalisation PeerJS locale (serveur peerjs-server sur 127.0.0.1:9000, /peerjs) ;
//   - deux Peer connectés (ICE/SDP + data channel) ;
//   - protocole init (graine 128 bits) + move (coups) ;
//   - deal miroir (deck.js : même graine -> mêmes 15 cartes, human == ai) ;
//   - machine à états (game.js : createGame + start + humanSwap/remoteSwap).
// Un seul onglet, deux instances Peer (moteur WebRTC interne) : c'est le
// schéma de test standard d'une connexion P2P dans un même navigateur.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_HTML = join(ROOT, 'index.html');
const OUT = join(__dirname, 'results', 'porte-16.log');
mkdirSync(join(__dirname, 'results'), { recursive: true });
const SIG_PORT = 9000;

const lines = [];
let failures = 0;
function check(name, ok, info) {
  if (!ok) failures++;
  lines.push((ok ? '[ OK ] ' : '[ FAIL] ') + name + (info !== undefined ? ' — ' + info : ''));
}

// Démarre le serveur de signalisation PeerJS local et attend son message de
// démarrage. Le chemin doit être /peerjs : le client PeerJS (js/net.js) y va
// par défaut (chemin '/' + 'peerjs').
function startSignaling() {
  // Pas de --path : le montage par défaut '/' + le suffixe 'peerjs' du serveur
  // donnent l'URL WS ws://127.0.0.1:9000/peerjs, exactement ce que construit le
  // client (js/net.js, chemin par défaut '/'). Avec --path /peerjs le serveur
  // écouterait sur /peerjs/peerjs (double suffixe) et le handshake échouerait.
  const args = [join(ROOT, 'node_modules', 'peerjs-server', 'bin', 'peerjs'), '-p', String(SIG_PORT)];
  const proc = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', (d) => { out += String(d); });
  proc.stderr.on('data', (d) => { out += String(d); });
  const t0 = Date.now();
  return new Promise((resolve) => {
    const iv = setInterval(() => {
      if (/Started PeerServer/i.test(out)) { clearInterval(iv); resolve(proc); }
      else if (Date.now() - t0 > 15000) { clearInterval(iv); console.error('peerjs-server :', out); resolve(proc); }
    }, 200);
  });
}

async function main() {
  const { connect, evalJs } = await import('./cdp.mjs');
  const sig = await startSignaling();
  let cdp = null;
  try {
    cdp = await connect(process.argv[2] || '127.0.0.1:9347');
    const nav = await cdp.send('Page.navigate', { url: 'file:///' + INDEX_HTML.replace(/\\/g, '/') });
    if (!nav || nav.error) throw new Error('Page.navigate a échoué: ' + JSON.stringify(nav));
    const deadline = Date.now() + 20000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try {
        ready = (await evalJs(cdp, "(window.G && window.G.version === '2.1.1' && window.G.UI && window.Peer && window.G.P2P) ? 'ready' : 'loading'")) === 'ready';
      } catch { /* pas prêt */ }
      if (!ready) await new Promise((res) => setTimeout(res, 200));
    }
    if (!ready) throw new Error('ready timeout (G/UI/Peer/P2P)');

    // (a) Contrat DOM attendu par js/net.js.
    const domIds = ['p2p-open', 'p2p-panel', 'p2p-host', 'p2p-join', 'p2p-code', 'p2p-status'];
    const dom = JSON.parse(await evalJs(cdp, 'JSON.stringify(' + JSON.stringify(domIds) + '.map((i) => !!document.querySelector("#" + i)))'));
    check('contrat DOM 2P : 6 ids (#p2p-*)', dom.every(Boolean));
    const panelHidden = (await evalJs(cdp, "document.querySelector('#p2p-panel').hidden === true")) === true;
    check('panneau 2P masqué au chargement', panelHidden);

    // (b) Surface G exposée par net.js / ui.js / game.js.
    const surf = JSON.parse(await evalJs(cdp, "JSON.stringify({ onLocal: typeof G.P2P.onLocalHumanMove === 'function', start2P: typeof G.UI.start2PGame === 'function', applyRemote: typeof G.UI.applyRemoteMove === 'function', remoteSwap: typeof G.remoteSwap === 'function', humanSwap: typeof G.humanSwap === 'function' })"));
    check('G.P2P.onLocalHumanMove est une fonction', surf.onLocal);
    check('G.UI.start2PGame est une fonction', surf.start2P);
    check('G.UI.applyRemoteMove est une fonction', surf.applyRemote);
    check('G.remoteSwap et G.humanSwap exposés (game.js)', surf.remoteSwap && surf.humanSwap);

    // (c) remoteSwap — machine à états, board distant (ai).
    const rs = JSON.parse(await evalJs(cdp, "(function(){ const s = G.createGame({ time: 20, seed: [1,2,3,4] }); G.start(s); const before = JSON.stringify(s.boards.ai); const r = G.remoteSwap(s, 0, 4); return JSON.stringify({ ok: !!(r && r.ok), aiMoves: s.aiMoves, changed: JSON.stringify(s.boards.ai) !== before, self: G.remoteSwap(s, 2, 2).ok === false }); })()"));
    check('remoteSwap 0→4 : board ai modifié, aiMoves=1', rs.ok && rs.aiMoves === 1 && rs.changed);
    check('remoteSwap invalide (from==to) refusé, sans effet', rs.self);

    // (d) WebRTC : deux Peer (signalisation PeerJS locale), ICE/SDP, data channel,
    //     protocole init/move, deal miroir, application du coup distant.
    const payload = [
      '(async () => {',
      '  const SEED = [1, 2, 3, 4];',
      "  const CFG = { host: '127.0.0.1', port: " + SIG_PORT + ", secure: false };",
      '  const out = { port: CFG.port };',
      "  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms')), ms));",
      '  const race = (p, ms) => Promise.race([p, timeout(ms)]);',
      "  const rndId = () => 'g' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);",
      "  const A = new Peer(rndId(), CFG);",
      "  const B = new Peer(rndId(), CFG);",
      "  const idP = (P) => new Promise((res, rej) => { P.on('open', res); P.on('error', (e) => rej(new Error('peer err: ' + (e && e.type ? e.type : e)))); });",
      "  const connAWait = new Promise((res) => { A.on('connection', (c) => res(c)); });",
      '  try {',
      '    const idA = await race(idP(A), 10000);',
      '    const idB = await race(idP(B), 10000);',
      '    out.ids = [idA, idB];',
      '    const connB = B.connect(idA, { reliable: true });',
      '    const connA = await race(connAWait, 10000);',
      "    const open = (c) => new Promise((res) => { if (c.open) res(); else c.on('open', () => res()); });",
      '    await race(open(connA), 15000);',
      '    await race(open(connB), 15000);',
      '    out.connected = connA.open === true && connB.open === true;',
      '    if (!out.connected) { A.destroy(); B.destroy(); return JSON.stringify(out); }',
      "    const initMsg = JSON.stringify({ v: 1, seed: SEED, d: 'normal', t: 20 });",
      "    connA.send(initMsg);",
      "    const initB = await race(new Promise((res) => connB.on('data', (d) => res(String(d)))), 8000);",
      '    const initObj = JSON.parse(initB);',
      '    out.initSeedOk = Array.isArray(initObj.seed) && initObj.seed.length === 4;',
      '    const gA = G.createGame({ time: 20, seed: initObj.seed });',
      '    const gB = G.createGame({ time: 20, seed: initObj.seed });',
      '    out.mirrorA = JSON.stringify(gA.boards.human) === JSON.stringify(gA.boards.ai);',
      '    out.mirrorB = JSON.stringify(gB.boards.human) === JSON.stringify(gB.boards.ai);',
      '    out.sameDeal = JSON.stringify(gA.boards.human) === JSON.stringify(gB.boards.human);',
      '    G.start(gA); G.start(gB);',
      '    const bBefore = JSON.stringify(gB.boards.human);',
      '    const bRes = G.humanSwap(gB, 0, 4);',
      "    out.bMoved = (bRes && bRes.ok === true) && JSON.stringify(gB.boards.human) !== bBefore;",
      "    const moveMsg = JSON.stringify({ f: 0, t: 4 });",
      "    connB.send(moveMsg);",
      "    const moveA = await race(new Promise((res) => connA.on('data', (d) => res(String(d)))), 8000);",
      '    const mv = JSON.parse(moveA);',
      '    out.moveRecv = mv.f === 0 && mv.t === 4;',
      '    const aBefore = JSON.stringify(gA.boards.ai);',
      '    const aRes = G.remoteSwap(gA, mv.f, mv.t);',
      '    out.aMoved = (aRes && aRes.ok === true) && gA.aiMoves === 1 && JSON.stringify(gA.boards.ai) !== aBefore;',
      '    out.mirrorAfter = JSON.stringify(gA.boards.ai) === JSON.stringify(gB.boards.human);',
      '    A.destroy(); B.destroy();',
      '  } catch (e) {',
      '    out.error = String(e && e.message ? e.message : e);',
      '    try { A.destroy(); } catch (_) {}',
      '    try { B.destroy(); } catch (_) {}',
      '  }',
      '  return JSON.stringify(out);',
      '})()',
    ].join('\n');
    const rt = JSON.parse(await evalJs(cdp, payload));
    check('WebRTC : deux Peer connectés (ICE/SDP, data channel)', rt.connected === true, rt.error || '');
    check('init : graine 128 bits reçue du host', rt.initSeedOk === true);
    check('deal miroir : human == ai des deux cotes', rt.mirrorA === true && rt.mirrorB === true);
    check('deal miroir : plateau identique des deux cotes', rt.sameDeal === true);
    check('move : guest 0→4 appliqué sur son board humain', rt.bMoved === true);
    check('move : reçu par le host (f/t valides)', rt.moveRecv === true);
    check('move : remoteSwap du host sur son board ai (aiMoves=1)', rt.aMoved === true);
    check('invariant post-move : board ai(host) == board humain(guest)', rt.mirrorAfter === true);
  } finally {
    try { if (cdp) cdp.close(); } catch {}
    try { sig.kill('SIGKILL'); } catch {}
  }
  lines.push('FAILURES: ' + failures);
  lines.push('RESULT: ' + (failures === 0 ? 'OK' : 'KO'));
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf-8');
  console.log(lines.join('\n'));
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
