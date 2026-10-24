// PORTE 16 — P2P 2 joueurs : VRAI chemin hôte→visiteur (v2.2.3).
// Preuve de bout en bout, dans le navigateur (CDP, Chrome headless, DEUX onglets) :
//   - signalisation PeerJS locale (peerjs-server sur 127.0.0.1:9000, /peerjs) ;
//   - tab A = page HÔTE, tab B = page VISITEUR (vraie session WebRTC inter-onglets) ;
//   - handshake Ready bidirectionnel : bouton #p2p-ready cliqué des DEUX côtés ;
//   - compte à rebours 3-2-1 SYNCHRONISÉ : l'hôte re-sert chaque tick, le visiteur l'affiche ;
//   - init (type:'init', graine 128 bits, options hôte) -> onMessage visiteur -> deal miroir ;
//   - coup humain du visiteur via l'UI (Pointer Events) -> onLocalHumanMove -> remoteSwap hôte.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connect, connectTab, evalJs } from './cdp.mjs';

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
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Démarre le serveur de signalisation PeerJS local et attend son message de
// démarrage. Pas de --path : le montage par défaut '/' + le suffixe 'peerjs'
// du serveur donnent l'URL WS ws://127.0.0.1:9000/peerjs, exactement ce que
// construit le client (js/net.js, chemin par défaut '/'). Avec --path /peerjs
// le serveur écouterait sur /peerjs/peerjs (double suffixe) et le handshake
// échouerait.
function startSignaling() {
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

async function waitFor(cdp, expr, timeoutMs, name) {
  const t0 = Date.now();
  for (;;) {
    try { if (await evalJs(cdp, expr) === true) return; } catch { /* pas encore prêt */ }
    if (Date.now() - t0 > timeoutMs) throw new Error('timeout: ' + name);
    await sleep(250);
  }
}

const READY_EXPR = "!!(window.G && window.G.version === '2.2.3' && window.G.UI && window.Peer && window.G.P2P && window.G.P2P._test)";
const OBSERVER = `(() => {
  window.__g16 = { status: [], last: '' };
  const st = document.querySelector('#p2p-status');
  if (!st) return 'no-status';
  const mo = new MutationObserver(() => {
    const t = st.textContent;
    if (t !== window.__g16.last) { window.__g16.last = t; window.__g16.status.push(t); }
  });
  mo.observe(st, { childList: true, characterData: true, subtree: true });
  return 'observer';
})()`;
const GUEST_SWAP = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pe = (type, x, y, el) => {
    const e = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 });
    el.dispatchEvent(e);
  };
  const cell = (i) => document.querySelector('#board-human .cell[data-idx="' + i + '"]');
  for (let i = 0; i < 80; i++) {
    const from = (i * 3 + 1) % 15;
    let to = (i * 7 + 2) % 15;
    if (to === from) to = (to + 1) % 15;
    const fromCell = cell(from);
    const card = fromCell && fromCell.querySelector('.card');
    const target = cell(to);
    if (!card || !target) continue;
    const cr = card.getBoundingClientRect();
    pe('pointerdown', cr.left + cr.width / 2, cr.top + cr.height / 2, card);
    target.scrollIntoView();
    const tr = target.getBoundingClientRect();
    pe('pointermove', tr.left + tr.width / 2, tr.top + tr.height / 2, card);
    pe('pointerup', tr.left + tr.width / 2, tr.top + tr.height / 2, target);
    await sleep(60);
    if (G.UI.humanMoves() >= 1) return true;
  }
  return false;
})()`;

async function main() {
  const sig = await startSignaling();
  let host = null;
  let guest = null;
  try {
    // (a0) Broker par défaut (page sans query string) : cloud 0.peerjs.com:443 (TLS).
    host = await connect(process.argv[2] || '127.0.0.1:9347');
    const navDef = await host.send('Page.navigate', { url: 'file:///' + INDEX_HTML.replace(/\\/g, '/') });
    if (!navDef || navDef.error) throw new Error('Page.navigate (défaut) a échoué: ' + JSON.stringify(navDef));
    await waitFor(host, "!!(window.G && window.G.P2P && typeof window.G.P2P._brokerCfg === 'function')", 20000, 'ready (nav défaut)');
    const cfgDef = JSON.parse(await evalJs(host, 'JSON.stringify(G.P2P._brokerCfg())'));
    check('broker par défaut : cloud 0.peerjs.com:443 (secure)', cfgDef.host === '0.peerjs.com' && cfgDef.port === 443 && cfgDef.secure === true);

    // (a) Onglet HÔTE : navigation avec override dev (broker local 127.0.0.1:9000, insecure).
    const mainUrl = 'file:///' + INDEX_HTML.replace(/\\/g, '/') + '?peerHost=127.0.0.1&peerPort=' + SIG_PORT + '&peerSecure=false';
    const nav = await host.send('Page.navigate', { url: mainUrl });
    if (!nav || nav.error) throw new Error('Page.navigate a échoué: ' + JSON.stringify(nav));
    await waitFor(host, READY_EXPR, 20000, 'ready hôte (G/UI/Peer/P2P)');

    // (b) Onglet VISITEUR : 2e onglet CDP sur la même page (même broker local).
    const created = await host.send('Target.createTarget', { url: mainUrl });
    if (!created || created.error || !created.targetId) throw new Error('Target.createTarget a échoué: ' + JSON.stringify(created));
    guest = await connectTab(process.argv[2] || '127.0.0.1:9347', (t) => t.id !== host.id, 150);
    await waitFor(guest, READY_EXPR, 20000, 'ready visiteur (G/UI/Peer/P2P)');
    check('deux onglets CDP ouverts (hôte + visiteur), même page', true);

    // (c) Contrat DOM (hôte) : 8 ids P2P (dont #p2p-ready, masqué au chargement).
    const domIds = ['p2p-open', 'p2p-panel', 'p2p-host', 'p2p-join', 'p2p-code', 'p2p-status', 'p2p-solo', 'p2p-ready'];
    const dom = await evalJs(host, JSON.stringify(domIds) + '.map((i) => !!document.querySelector("#" + i))');
    check('contrat DOM 2P : 8 ids (#p2p-*)', dom.every(Boolean), JSON.stringify(dom));
    check('panneau 2P masqué au chargement', await evalJs(host, "document.querySelector('#p2p-panel').hidden === true"));
    check('bouton repli solo masqué au chargement', await evalJs(host, "document.querySelector('#p2p-solo').hidden === true"));
    check('bouton Ready masqué au chargement', await evalJs(host, "document.querySelector('#p2p-ready').hidden === true"));

    // (d) Surface G (hôte) : version, G.UI, G.P2P (API + hook _test).
    const ver = await evalJs(host, 'window.G.version');
    check('G.version = 2.2.3', ver === '2.2.3', 'v=' + ver);
    const surf = JSON.parse(await evalJs(host, "JSON.stringify({ u: typeof G.UI.start2PGame, a: typeof G.UI.applyRemoteMove, p: typeof G.P2P.host, j: typeof G.P2P.join, s: typeof G.P2P.genSeed, v: typeof G.P2P.validateInit, d: typeof G.P2P.buildInit, c: typeof G.P2P.validateMove, l: typeof G.P2P.onLocalHumanMove, t: typeof G.P2P._test.onMessage, rs: typeof G.remoteSwap, hs: typeof G.humanSwap })"));
    check('G.UI.start2PGame/applyRemoteMove + G.P2P host/join/genSeed/validateInit/buildInit/validateMove/onLocalHumanMove + hook _test + G.remoteSwap/humanSwap', surf.u === 'function' && surf.a === 'function' && surf.p === 'function' && surf.j === 'function' && surf.s === 'function' && surf.v === 'function' && surf.d === 'function' && surf.c === 'function' && surf.l === 'function' && surf.t === 'function' && surf.rs === 'function' && surf.hs === 'function');

    // (e) Protocole : buildInit/validateInit (type, graine, options hôte) et validateMove.
    const a = JSON.parse(await evalJs(host, "(() => { const o = G.P2P.buildInit([1,2,3,4], 'normal', 20); return JSON.stringify({ ok: G.P2P.validateInit(o).ok === true, type: o.type === 'init', p: o.p === 'pc2p/v1', v: o.v === 2, seedOk: Array.isArray(o.seed) && o.seed.length === 4, d: o.d === 'normal', t: o.time === 20, boards: o.boards.human.length === 3 && o.boards.human.every((r) => r.length === 5), hashOk: o.boardHash === G.P2P.boardHash(o.boards) }); })()"));
    check('buildInit valide (type=init, p=pc2p/v1, v=2, graine 128 bits, d=normal, time=20, hash OK)', a.ok && a.type && a.p && a.v && a.seedOk && a.d && a.t && a.boards && a.hashOk, JSON.stringify(a));
    const b = JSON.parse(await evalJs(host, "(() => { const m = () => G.P2P.buildInit([1,2,3,4], 'normal', 20); const badSeed = m(); delete badSeed.seed; const badSeed2 = m(); badSeed2.seed = 'xy'; const badProto = m(); badProto.p = 'evil'; const badHash = m(); badHash.boardHash = 'zzz'; const badOpts = m(); badOpts.time = 999; return JSON.stringify({ r1: G.P2P.validateInit(badSeed).ok, r2: G.P2P.validateInit(badSeed2).ok, r3: G.P2P.validateInit(badProto).ok, r4: G.P2P.validateInit(badHash).ok, r5: G.P2P.validateInit(badOpts).ok }); })()"));
    check('validateInit rejette : seed absent, seed invalide, protocole invalide, hash invalide, temps invalide', b.r1 === false && b.r2 === false && b.r3 === false && b.r4 === false && b.r5 === false, JSON.stringify(b));
    const c = JSON.parse(await evalJs(host, "JSON.stringify({ ok: G.P2P.validateMove({ type: 'move', f: 0, to: 4 }).ok === true, bad: G.P2P.validateMove({ type: 'move', f: 0, to: 0 }).ok === false })"));
    check('validateMove : 0→4 OK, 0→0 refusé', c.ok && c.bad);
    const seed = await evalJs(host, 'Array.from(window.G.P2P.genSeed())');
    check('G.P2P.genSeed : 4 mots int32 (128 bits)', Array.isArray(seed) && seed.length === 4 && seed.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xFFFFFFFF), JSON.stringify(seed));

    // (f) remoteSwap — machine à états, board distant (ai).
    const rs = JSON.parse(await evalJs(host, "(function(){ const s = G.createGame({ time: 20, seed: [1,2,3,4] }); G.start(s); const before = JSON.stringify(s.boards.ai); const r = G.remoteSwap(s, 0, 4); return JSON.stringify({ ok: !!(r && r.ok), aiMoves: s.aiMoves, changed: JSON.stringify(s.boards.ai) !== before, self: G.remoteSwap(s, 2, 2).ok === false }); })()"));
    check('remoteSwap 0→4 : board ai modifié, aiMoves=1', rs.ok && rs.aiMoves === 1 && rs.changed);
    check('remoteSwap invalide (from==to) refusé, sans effet', rs.self);

    // (g) Chemin réel 2 joueurs : hôte (onglet A) -> visiteur (onglet B).
    // (g1) Observateurs du statut #p2p-status (historique texte) des deux côtés.
    const obsH = await evalJs(host, OBSERVER);
    const obsG = await evalJs(guest, OBSERVER);
    check('observateurs statut installés (hôte + visiteur)', obsH === 'observer' && obsG === 'observer');
    // Langue déterministe (EN) pour les assertions de texte.
    await evalJs(host, "G.I18N.setLang('en'); 'ok'");
    await evalJs(guest, "G.I18N.setLang('en'); 'ok'");

    // (g2) Garde : countdown invalide (sans rôle / n non entier) -> aucun effet.
    const guard = JSON.parse(await evalJs(host, "(() => { const st = document.querySelector('#p2p-status'); const before = st ? st.textContent : null; G.P2P._test.onMessage({ type: 'countdown', n: 99 }); G.P2P._test.onMessage({ type: 'countdown', n: 'x' }); const after = st ? st.textContent : null; return JSON.stringify({ unchanged: before === after }); })()"));
    check('countdown invalide (sans rôle / n non entier) : statut inchangé', guard.unchanged === true);

    // (g3) Hôte : options (normal, 20 s) + ouverture du canal (salle G16R2) ; visiteur : join.
    await evalJs(host, "(() => { document.querySelector('#diff').value = 'normal'; document.querySelector('#time').value = '20'; G.P2P.host('G16R2', 'normal', 20); return 'host'; })()");
    await evalJs(guest, "G.P2P.join('G16R2')");

    // (g4) Bouton « Ready ? » visible des deux côtés (canal ouvert).
    await waitFor(host, "!document.querySelector('#p2p-ready').hidden", 20000, 'bouton Ready visible (hôte)');
    await waitFor(guest, "!document.querySelector('#p2p-ready').hidden", 20000, 'bouton Ready visible (visiteur)');
    check('bouton Ready visible côté hôte ET visiteur', true);
    // (g4b) v2.2.3 B1 : garde Play/Rejouer avant 2×Ready — en session 2P,
    // #start (Play) et #replay (Rejouer) sont inactifs tant que les deux
    // joueurs ne sont pas ready.
    const guardB1a = JSON.parse(await evalJs(host, 'JSON.stringify({ s: document.querySelector("#start").disabled, r: document.querySelector("#replay").disabled })'));
    const guardB1b = JSON.parse(await evalJs(guest, 'JSON.stringify({ s: document.querySelector("#start").disabled, r: document.querySelector("#replay").disabled })'));
    check('B1 Play + Rejouer inactifs avant 2×Ready (hôte ET visiteur)', guardB1a.s === true && guardB1a.r === true && guardB1b.s === true && guardB1b.r === true, JSON.stringify([guardB1a, guardB1b]));
    await evalJs(host, "document.querySelector('#p2p-ready').click()");
    await sleep(500);
    const guardB1c = JSON.parse(await evalJs(host, 'JSON.stringify({ s: document.querySelector("#start").disabled, r: document.querySelector("#replay").disabled })'));
    check('B1 Play + Rejouer inactifs après 1×Ready seul (hôte)', guardB1c.s === true && guardB1c.r === true, JSON.stringify(guardB1c));

    // (g5) Les deux joueurs cliquent « Ready ? » (handshake bidirectionnel).
    await evalJs(host, "document.querySelector('#p2p-ready').click()");
    await evalJs(guest, "document.querySelector('#p2p-ready').click()");
    check('clicks Ready effectués des deux côtés', true);

    // (g6) Deal : l'hôte compte 3-2-1 puis envoie l'init ; les deux parties démarrent.
    await waitFor(host, "window.G.UI.stateInfo() && window.G.UI.stateInfo().running === true", 25000, 'départ hôte');
    await waitFor(guest, "window.G.UI.stateInfo() && window.G.UI.stateInfo().running === true", 25000, 'départ visiteur');
    check('départ effectif des deux côtés (game running)', true);
    // (g6b) v2.2.3 B1 : pendant la partie 2P, Play reste inactif et Rejouer
    // aussi (la partie est en cours — Rejouer se ré-arme à la fin, g12).
    const guardB1d = JSON.parse(await evalJs(host, 'JSON.stringify({ s: document.querySelector("#start").disabled, r: document.querySelector("#replay").disabled })'));
    check('B1 Play + Rejouer inactifs pendant la partie 2P (hôte)', guardB1d.s === true && guardB1d.r === true, JSON.stringify(guardB1d));
    const siH = JSON.parse(await evalJs(host, 'JSON.stringify(G.UI.stateInfo())'));
    const siG = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.stateInfo())'));
    check('options hôte propagées (difficulty=normal des deux côtés)', siH.difficulty === 'normal' && siG.difficulty === 'normal', 'h=' + siH.difficulty + ' g=' + siG.difficulty);

    // (g7) Miroir du deal : mêmes 15 cartes, human==ai, hôte==visiteur.
    const bh = JSON.parse(await evalJs(host, 'JSON.stringify(G.UI.boards())'));
    const bg = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.boards())'));
    const j = (x) => JSON.stringify(x);
    check('deal miroir : human == ai (hôte)', j(bh.human) === j(bh.ai));
    check('deal miroir : human == ai (visiteur)', j(bg.human) === j(bg.ai));
    check('deal identique hôte == visiteur', j(bh.human) === j(bg.human));

    // (g8) Compte à rebours SYNCHRONISÉ : les ticks de l'hôte vus par le visiteur.
    const sh = await evalJs(host, 'window.__g16.status');
    const sg = await evalJs(guest, 'window.__g16.status');
    const cdOf = (arr) => (arr || []).filter((t) => typeof t === 'string' && /Dealing in [123]/.test(t));
    const cdH = cdOf(sh);
    const cdG = cdOf(sg);
    check('hôte : compte à rebours 3-2-1 affiché (ticks >= 2)', cdH.length >= 2, 'seq=' + JSON.stringify(sh));
    check('visiteur : compte à rebours synchronisé reçu (ticks >= 2)', cdG.length >= 2, 'seq=' + JSON.stringify(sg));
    const nums = (arr) => arr.map((t) => Number(t.match(/Dealing in ([123])/)[1]));
    const dec = (arr) => { const n = nums(arr); return n.length >= 2 && n[0] === 3 && n[n.length - 1] === 1 && n.every((v, i) => i === 0 || n[i - 1] > v); };
    check('visiteur : ticks strictement décroissants 3 -> 1', dec(cdG), JSON.stringify(nums(cdG)));

    // (g9) Coup humain du VISITEUR via l'UI (Pointer Events) -> onLocalHumanMove.
    const guestSwap = await evalJs(guest, GUEST_SWAP);
    check('visiteur : swap UI réussi (Pointer Events), humanMoves >= 1', guestSwap === true);

    // (g10) Hôte : coup distant reçu + remoteSwap appliqué sur son board ai.
    const hostAiMoves = await evalJs(host, "new Promise((res) => { const t0 = Date.now(); const iv = setInterval(() => { const m = window.G.UI.aiMoves(); if (m >= 1) { clearInterval(iv); res(m); } else if (Date.now() - t0 > 8000) { clearInterval(iv); res(m || 0); } }, 100); })");
    check('hôte : coup distant reçu et appliqué (aiMoves=1)', hostAiMoves === 1);

    // (g11) Invariants post-move + statut final.
    const bh2 = JSON.parse(await evalJs(host, 'JSON.stringify(G.UI.boards())'));
    const bg2 = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.boards())'));
    check('invariant post-move : board ai(hôte) == board humain(visiteur)', j(bh2.ai) === j(bg2.human));
    check('invariant post-move : board humain(hôte) == board ai(visiteur)', j(bh2.human) === j(bg2.ai));
    const stH = await evalJs(host, "document.querySelector('#p2p-status').textContent");
    const stG = await evalJs(guest, "document.querySelector('#p2p-status').textContent");
    check('statut final : « Connected » des deux côtés', /Connected/.test(stH) && /Connected/.test(stG), 'hôte=' + stH + ' visiteur=' + stG);

    // (g12) v2.2.3 B1 : fin de partie 2P — Play reste inactif (session 2P),
    // Rejouer se ré-arme ; écran final affiché.
    await waitFor(host, 'window.G.UI.stateInfo() && window.G.UI.stateInfo().ended === true', 30000, 'fin hôte');
    await waitFor(guest, 'window.G.UI.stateInfo() && window.G.UI.stateInfo().ended === true', 30000, 'fin visiteur');
    check('fin de partie 2P (over des 2 côtés, time=20 s)', true);
    const finalH = JSON.parse(await evalJs(host, 'JSON.stringify({ f: !document.querySelector("#final").hidden, s: document.querySelector("#start").disabled, r: !document.querySelector("#replay").disabled })'));
    check('B1 fin 2P : écran final affiché, Play inactif, Rejouer ré-armé (hôte)', finalH.f === true && finalH.s === true && finalH.r === true, JSON.stringify(finalH));

    // (g13) v2.2.3 B2 : « Rejouer » en 2P = PROPOSITION (jamais de partie IA).
    const boardsBefore = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.boards())'));
    await evalJs(guest, "document.querySelector('#replay').click()");
    await sleep(800);
    const boardsAfter = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.boards())'));
    const postG = JSON.parse(await evalJs(guest, 'JSON.stringify({ e: G.UI.stateInfo().ended, rn: G.UI.stateInfo().running, two: !!window.G.twoPlayerMode })'));
    check('B2 Rejouer 2P (visiteur) : pas de partie IA — fin maintenue, plateaux gelés, mode 2P conservé', postG.e === true && postG.rn === false && postG.two === true && JSON.stringify(boardsAfter) === JSON.stringify(boardsBefore), JSON.stringify(postG));
    const postH = JSON.parse(await evalJs(host, 'JSON.stringify({ e: G.UI.stateInfo().ended, rn: G.UI.stateInfo().running, st: document.querySelector("#p2p-status").textContent, ready: !document.querySelector("#p2p-ready").hidden })'));
    check('B2 proposition reçue par le hôte : statut « Rematch? », bouton Ready re-ouvert, pas de re-départ', /Rematch/.test(postH.st) && postH.ready === true && postH.e === true && postH.rn === false, JSON.stringify(postH));
    const hostHS = JSON.parse(await evalJs(host, 'JSON.stringify(G.P2P._test.state())'));
    check('B2 le hôte n\'auto-accepte pas la proposition (localReady/started/dealing = false)', hostHS.localReady === false && hostHS.started === false && hostHS.dealing === false, JSON.stringify(hostHS));

    // (g14) v2.2.3 B2 : acceptation par le hôte → NOUVELLE PARTIE 2P (pas d'IA).
    await evalJs(host, "document.querySelector('#p2p-ready').click()");
    await waitFor(host, 'window.G.UI.stateInfo() && window.G.UI.stateInfo().running === true', 25000, 're-départ hôte');
    await waitFor(guest, 'window.G.UI.stateInfo() && window.G.UI.stateInfo().running === true', 25000, 're-départ visiteur');
    check('B2 acceptation hôte → nouvelle partie 2P (running des 2 côtés)', true);
    const rBh = JSON.parse(await evalJs(host, 'JSON.stringify(G.UI.boards())'));
    const rBg = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.boards())'));
    const nCards = (x) => x.human.flat().length + x.ai.flat().length;
    check('B2 rematch : 30 cartes (15/plateau), miroir hôte == visiteur', nCards(rBh) === 30 && j(rBh.human) === j(rBg.human) && j(rBh.ai) === j(rBg.ai), 'cartes=' + nCards(rBh));
    const siH2 = JSON.parse(await evalJs(host, 'JSON.stringify(G.UI.stateInfo())'));
    const siG2 = JSON.parse(await evalJs(guest, 'JSON.stringify(G.UI.stateInfo())'));
    check('B2 options conservées dans le rematch (difficulty=normal des 2 côtés)', siH2.difficulty === 'normal' && siG2.difficulty === 'normal', 'h=' + siH2.difficulty + ' g=' + siG2.difficulty);

    // (g15) v2.2.3 B3 : plateau adverse libellé « Player 2 » (2P), solo inchangé.
    const tBh = await evalJs(host, 'document.querySelector("#board-ai h2").textContent');
    const tBg = await evalJs(guest, 'document.querySelector("#board-ai h2").textContent');
    check('B3 plateau adverse = « Player 2 » des 2 côtés (EN)', tBh === 'Player 2' && tBg === 'Player 2', 'h=' + tBh + ' g=' + tBg);
    const tHh = await evalJs(host, 'document.querySelector("#board-human h2").textContent');
    check('B3 plateau humain inchangé = « Your board » (EN)', tHh === 'Your board', 'h=' + tHh);
    await evalJs(host, "G.I18N.setLang('fr')");
    const tFr = await evalJs(host, 'document.querySelector("#board-ai h2").textContent');
    check('B3 « Player 2 » traduit : FR = « Joueur 2 » après setLang', tFr === 'Joueur 2', 'h=' + tFr);
    await evalJs(host, "G.I18N.setLang('en')");
  } finally {
    try { if (guest) guest.close(); } catch {}
    try { if (host) host.close(); } catch {}
    try { sig.kill('SIGKILL'); } catch {}
  }
  lines.push('FAILURES: ' + failures);
  lines.push('RESULT: ' + (failures === 0 ? 'OK' : 'KO'));
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf-8');
  console.log(lines.join('\n'));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
