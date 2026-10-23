/* ============================================================
 * Poker-Chrono — v2.2 : couche P2P WebRTC (Milestone V2.2-A).
 *
 * Rôle : connecter 2 joueurs entre eux SANS serveur de jeu.
 *   - PeerJS (js/peerjs.min.js, vendu localement — jamais de CDN, porte 8)
 *     fournit la signalisation : RTCPeerConnection, offre/réponse SDP,
 *     candidats ICE et canal de données fiable.
 *   - Un mini-serveur de signalisation local (peerjs-server, dev/test) est
 *     requis par le navigateur pour établir la connexion P2P (voir test/).
 *
 * Protocole « deal miroir » (zéro asymétrie de main) :
 *   - l'HÔTE génère un maître 128 bits (4 x uint32) et l'envoie au visiteur ;
 *   - les DEUX joueurs calculent localement les MÊMES 15 cartes depuis ce
 *     maître (G.createGame({ seed })) ; on n'échange JAMAIS l'état, seulement
 *     la graine + une empreinte canonique (boardHash) de contrôle ;
 *   - l'IA est gelée (state.aiFrozen) : l'adversaire est l'humain distant ;
 *     ses coups arrivent par le canal de données (relais validé).
 *
 * Surface globale : globalThis.G.P2P = {
 *   PROTOCOL, VERSION,
 *   genSeed(), boardHash(boards), buildInit(seed, d, t),
 *   validateInit(msg), validateMove(msg),
 *   connect({ hostId | joinId, ... }), disconnect(),
 *   host(code, d, t), join(code), onLocalHumanMove(from, to)
 * }
 * ============================================================ */
(function () {
  'use strict';

  const PROTOCOL = 'pc2p/v1';
  const VERSION = 2;

  // Session active : un seul 2P à la fois par page.
  let currentPeer = null;
  let role = null; // 'host' | 'guest' | null

  // v2.2.2 — handshake Ready bidirectionnel : la partie 2P ne démarre QU'UNE
  // FOIS que les DEUX joueurs ont pressé « Ready ? ». Aucun deal automatique
  // au channel-open (l'ancien auto-deal est retiré).
  //   host  : retient la graine + options, envoie l'init après countdown 3-2-1.
  //   guest : attend l'init valide de l'hôte, puis démarre.
  let localReady = false;   // j'ai pressé Ready
  let peerReady = false;    // l'adversaire a pressé Ready
  let started = false;      // la partie a démarré (anti double-deal)
  let dealing = false;      // countdown 2P en cours (anti double-deal)
  const seedRef = { seed: null, d: null, time: null }; // options choisies (hôte)

  function resetHandshake() {
    localReady = false;
    peerReady = false;
    started = false;
    dealing = false;
    seedRef.seed = null;
    seedRef.d = null;
    seedRef.time = null;
  }

  function showReadyButton() {
    const b = document.getElementById('p2p-ready');
    if (b) b.hidden = false;
  }

  function hideReadyButton() {
    const b = document.getElementById('p2p-ready');
    if (b) b.hidden = true;
  }

  // Countdown 3-2-1 : l'hôte l'affiche ET re-sert chaque tick au pair
  // (message {type:'countdown', n}) pour que le visiteur affiche le MÊME
  // compte à rebours synchronisé ; cb() à la fin.
  function runCountdown(cb) {
    let n = 3;
    setStatus('p2p_cd', { n: n });
    if (currentPeer && currentPeer.p2p) currentPeer.p2p.send({ type: 'countdown', n: n });
    const iv = setInterval(function () {
      n -= 1;
      if (n <= 0) { clearInterval(iv); cb(); }
      else {
        setStatus('p2p_cd', { n: n });
        if (currentPeer && currentPeer.p2p) currentPeer.p2p.send({ type: 'countdown', n: n });
      }
    }, 1000);
  }

  // ---- Maître 128 bits (CSPRNG si dispo, repli Math.random) ----
  function genSeed() {
    const m = new Uint32Array(4);
    let csp = false;
    try {
      const c = (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function')
        ? crypto
        : (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function')
          ? window.crypto
          : null;
      if (c) { c.getRandomValues(m); csp = true; }
    } catch (err) { csp = false; }
    if (!csp) for (let i = 0; i < 4; i++) m[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
    if (m[0] === 0 && m[1] === 0 && m[2] === 0 && m[3] === 0) m[0] = 0x9E3779B9; // état nul interdit
    return Array.from(m);
  }

  // Empreinte canonique d'un plateau : "r:s;r:s;..." sur le plateau humain.
  // Checksum anti-triche : on ne fait confiance qu'à la graine, l'empreinte
  // sert à vérifier que le plateau annoncé a bien été dérivé de la graine.
  function boardHash(boards) {
    const rows = boards && boards.human ? boards.human : [];
    let acc = '';
    for (const row of rows) for (const c of row) acc += c.r + ':' + c.s + ';';
    return acc;
  }

  // Message d'initialisation (hôte -> visiteur) : graine + barème + 15 cartes.
  function buildInit(seed, difficulty, time) {
    const st = G.createGame({ seed: seed.slice(), difficulty, time });
    return {
      p: PROTOCOL,
      v: VERSION,
      type: 'init',
      seed: seed.slice(),
      d: difficulty,
      time: time,
      boards: JSON.parse(JSON.stringify(st.boards)),
      boardHash: boardHash(st.boards)
    };
  }

  // Validation côté receveur : on RECALCULE les 15 cartes depuis la graine et
  // on compare au plateau annoncé. Jamais de confiance aux cartes reçues.
  // Retour { ok, reason? }.
  function validateInit(msg) {
    if (!msg || typeof msg !== 'object') return { ok: false, reason: 'bad_msg' };
    if (msg.p !== PROTOCOL || msg.v !== VERSION) return { ok: false, reason: 'protocol' };
    if (!Array.isArray(msg.seed) || msg.seed.length !== 4 ||
        !msg.seed.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xFFFFFFFF)) {
      return { ok: false, reason: 'bad_seed' };
    }
    const d = DIFFICULTIES.indexOf(msg.d) >= 0 ? msg.d : null;
    const t = TIME_OPTIONS.indexOf(msg.time) >= 0 ? msg.time : null;
    if (!d || !t) return { ok: false, reason: 'bad_opts' };
    const mine = G.createGame({ seed: msg.seed.slice(), difficulty: d, time: t });
    if (boardHash(mine.boards) !== boardHash(msg.boards)) return { ok: false, reason: 'board_mismatch' };
    if (typeof msg.boardHash === 'string' && msg.boardHash !== boardHash(msg.boards)) return { ok: false, reason: 'bad_hash' };
    return { ok: true };
  }

  // Validation d'un coup distant : forme + bornes uniquement. L'état courant
  // (running/over) est vérifié ensuite par l'UI (G.UI.applyRemoteMove).
  // Retour { ok, reason? }.
  function validateMove(msg) {
    if (!msg || msg.type !== 'move') return { ok: false, reason: 'bad_msg' };
    const f = msg.f, to = msg.to;
    if (typeof f !== 'number' || typeof to !== 'number' ||
        !Number.isInteger(f) || !Number.isInteger(to) ||
        f < 0 || f > 14 || to < 0 || to > 14 || f === to) {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true };
  }

  // ---- Connexion PeerJS ----
  //   connect({ hostId })  : rôle hôte (le code de salle est l'ID du peer).
  //   connect({ joinId })  : rôle visiteur (rejoint la salle de l'hôte).
  // Le peer renvoyé porte .p2p = {
  //   registered : Promise (peer enregistré sur le serveur),
  //   ready      : Promise (canal de données ouvert),
  //   send(msg), on(fn), onError(fn), destroy()
  // }.
  /* Broker PeerJS : par défaut, le serveur cloud public 0.peerjs.com (port 443, TLS).
   * Dev-only : l'override passe par la query string ?peerHost=&peerPort=&peerSecure=
   * (la suite de tests pointe alors sur un broker local 127.0.0.1:9000 — test/g16-p2p.mjs).
   * Pas de secret en dur : aucune clé d'API, aucune URL de service propriétaire. */
  const CONNECT_TIMEOUT_MS = 30000;
  let timeoutId = null;

  function brokerCfg() {
    const d = { host: '0.peerjs.com', port: 443, secure: true };
    const qs = (window.location.search || '').replace(/^[?]/, '');
    const pairs = qs ? qs.split('&') : [];
    for (let i = 0; i < pairs.length; i++) {
      const kv = pairs[i].split('=');
      if (kv.length < 2) continue;
      const k = kv[0];
      const v = kv.slice(1).join('=');
      if (k === 'peerHost' && v) d.host = v;
      else if (k === 'peerPort') {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n) && n > 0 && n < 65536) d.port = n;
      } else if (k === 'peerSecure') {
        if (v === 'true') d.secure = true;
        else if (v === 'false') d.secure = false;
      }
    }
    return d;
  }

  /* Timeout de connexion (30 s) : au-delà, statut explicite + bouton repli solo. */
  function armTimeout() {
    disarmTimeout();
    timeoutId = setTimeout(function () {
      timeoutId = null;
      setStatus('status_timeout');
      showSoloFallback(); // repli solo en un clic : l'utilisateur démarre la partie
    }, CONNECT_TIMEOUT_MS);
  }

  function disarmTimeout() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function showSoloFallback() {
    const btn = document.getElementById('p2p-solo');
    if (btn) btn.hidden = false;
  }

  function connect(opts) {
    const o = Object.assign(brokerCfg(), opts || {});
    const cfg = { host: o.host, port: o.port, secure: o.secure, key: 'peerjs' };
    let registeredResolve, readyResolve;
    const p2p = {
      conn: null,
      registered: new Promise((r) => { registeredResolve = r; }),
      ready: new Promise((r) => { readyResolve = r; }),
      _handler: null,
      _onerror: null,
      on: (fn) => { p2p._handler = fn; },
      onError: (fn) => { p2p._onerror = fn; },
      send: (msg) => {
        if (p2p.conn && p2p.conn.open) {
          try { p2p.conn.send(JSON.stringify(msg)); } catch (err) { /* canal fermé */ }
        }
      },
      destroy: () => { try { peer.destroy(); } catch (err) { /* déjà détruit */ } }
    };
    const onData = (raw) => {
      let m;
      try { m = JSON.parse(String(raw)); } catch (err) { return; }
      if (p2p._handler) p2p._handler(m);
    };
    // Un id explicite est OBLIGATOIRE : sans id, le client PeerJS fait un
    // retrieveId() HTTP (GET /peerjs/id) que le serveur local 0.2.9 ne sert
    // pas (404) -> 'server-error'. L'id explicite court-circuite ce appel
    // HTTP et passe directement au handshake WebSocket.
    const peer = o.hostId ? new Peer(o.hostId, cfg) : new Peer(genPeerId(), cfg);
    peer.on('open', () => {
      registeredResolve();
      if (!o.hostId) {
        // visiteur : se connecte à la salle (une fois enregistré).
        const conn = peer.connect(o.joinId, { reliable: true });
        p2p.conn = conn;
        conn.on('data', onData);
        conn.on('open', () => readyResolve());
      }
    });
    if (o.hostId) {
      // hôte : attend la connexion du visiteur.
      peer.on('connection', (conn) => {
        p2p.conn = conn;
        conn.on('data', onData);
        conn.on('open', () => readyResolve());
      });
    }
    peer.p2p = p2p;
    return peer;
  }

  function disconnect() {
    disarmTimeout();
    resetHandshake();
    const soloB = document.getElementById('p2p-solo');
    if (soloB) soloB.hidden = true;
    hideReadyButton();
    if (currentPeer) {
      try { currentPeer.p2p.destroy(); } catch (err) { /* déjà détruit */ }
    }
    currentPeer = null;
    role = null;
  }

  // ---- Code de salle : 6 caractères sans 0/O/1/I (ambigus) ----
  function genRoomCode() {
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const n = 6;
    const arr = new Uint32Array(n);
    let csp = false;
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(arr);
        csp = true;
      }
    } catch (err) { csp = false; }
    if (!csp) for (let i = 0; i < n; i++) arr[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
    let s = '';
    for (let i = 0; i < n; i++) s += ALPHABET[arr[i] % ALPHABET.length];
    return s;
  }

  // ---- Identifiant unique de peer (alphanumérique ; passe validateId). ----
  // Deux tirages base36 => ~16 caractères [a-z0-9], sans séparateur : accepté
  // par PeerJS (regex ^[A-Za-z0-9]+...$) et quasi-certainement unique.
  function genPeerId() {
    return 'g' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  // ---- Statut 2P (texte i18n dans #p2p-status) ----
  function setStatus(key, vars) {
    const el = document.getElementById('p2p-status');
    if (!el) return;
    try { el.textContent = G.I18N.t(key, vars); } catch (err) { /* i18n indispo */ }
  }

  // ---- Messages entrants (hôte OU visiteur) ----
  // ---- Handshake Ready (bidirectionnel) : deal unique après les 2 Readies ----
  function markReady() {
    if (started || dealing || !role) return;
    if (currentPeer && currentPeer.p2p) currentPeer.p2p.send({ type: 'ready' });
    localReady = true;
    hideReadyButton();
    setStatus('p2p_wait_opp');
    maybeDeal();
  }

  function markPeerReady() {
    peerReady = true;
    maybeDeal();
  }

  function maybeDeal() {
    if (started || dealing) return;
    if (!localReady || !peerReady) return; // handshake incomplet : on attend
    if (role === 'host') {
      dealing = true;
      const seed = seedRef.seed || genSeed();
      seedRef.seed = seed;
      const diff = seedRef.d || 'normal';
      const time = seedRef.time || 30;
      runCountdown(function () {
        started = true;
        dealing = false;
        if (currentPeer && currentPeer.p2p) currentPeer.p2p.send(buildInit(seed, diff, time));
        if (G.UI && G.UI.start2PGame) G.UI.start2PGame(seed, diff, time);
        setStatus('status_connected');
      });
    } else {
      // guest : rien à envoyer ; l'hôte enverra l'init (traité dans onMessage).
      setStatus('p2p_wait_opp');
    }
  }

  function onInitReceived(msg) {
    if (role !== 'guest' || started) return;
    const v = validateInit(msg);
    if (!v.ok) { setStatus('status_err_seed_mismatch'); return; }
    started = true;
    if (G.UI && G.UI.start2PGame) G.UI.start2PGame(msg.seed, msg.d, msg.time);
    setStatus('status_connected');
  }

  function onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'ready') {
      markPeerReady();
    } else if (msg.type === 'countdown') {
      // Compte à rebours synchronisé : le visiteur affiche les ticks de
      // l'hôte (3-2-1). Aucun effet sur l'état : seul l'init démarre.
      if (role === 'guest' && !started && Number.isInteger(msg.n)) {
        setStatus('p2p_cd', { n: msg.n });
      }
    } else if (msg.type === 'init') {
      onInitReceived(msg);
    } else if (msg.type === 'move') {
      const v = validateMove(msg);
      if (!v.ok) return; // coup invalide : ignoré, jamais appliqué tel quel
      G.UI.applyRemoteMove(msg.f, msg.to);
    }
  }

  // ---- Flows hôte / visiteur (appels des boutons 2P) ----
  function host(code, difficulty, time) {
    if (currentPeer) return; // déjà en session 2P
    role = 'host';
    resetHandshake();
    seedRef.d = difficulty; seedRef.time = time; // retenu pour le deal (après les 2 Readies)
    setStatus('status_connecting');
    currentPeer = connect({ hostId: code });
    currentPeer.p2p.on(onMessage);
    currentPeer.p2p.onError(() => { setStatus('status_err_no_server'); showSoloFallback(); });
    armTimeout();
    currentPeer.p2p.ready.then(() => {
      disarmTimeout();
      // canal ouvert : on n'enverre PAS d'init tout de suite — on attend que
      // les DEUX joueurs pressent « Ready ? » (handshake bidirectionnel),
      // puis l'hôte envoie l'init et démarre les deux parties (mêmes 15 cartes).
      showReadyButton();
      setStatus('p2p_wait_ready');
    });
  }

  function join(code) {
    if (currentPeer) return; // déjà en session 2P
    if (!code) { setStatus('status_err_no_server'); return; }
    role = 'guest';
    resetHandshake();
    setStatus('status_connecting');
    currentPeer = connect({ joinId: code });
    currentPeer.p2p.on(onMessage);
    currentPeer.p2p.onError(() => { setStatus('status_err_no_server'); showSoloFallback(); });
    armTimeout();
    currentPeer.p2p.ready.then(() => {
      disarmTimeout();
      // canal ouvert : on attend le Ready de l'adversaire puis son init.
      showReadyButton();
      setStatus('p2p_wait_ready');
    });
  }

  // Hook : l'UI (ui.js -> onPointerUp) appelle ce hook après un swap humain
  // local réussi ; on relaie le coup vers l'adversaire distant.
  function onLocalHumanMove(from, to) {
    if (currentPeer && currentPeer.p2p) currentPeer.p2p.send({ type: 'move', f: from, to: to });
  }

  // ---- Câblage des boutons 2P (DOM présent au chargement) ----
  function wire() {
    const openBtn = document.getElementById('p2p-open');
    const panel = document.getElementById('p2p-panel');
    const hostBtn = document.getElementById('p2p-host');
    const joinBtn = document.getElementById('p2p-join');
    const codeInput = document.getElementById('p2p-code');
    const soloBtn = document.getElementById('p2p-solo');
    const readyBtn = document.getElementById('p2p-ready');
    if (openBtn && panel) {
      openBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    }
    if (hostBtn) {
      hostBtn.addEventListener('click', () => {
        const diffEl = document.querySelector('#diff');
        const timeEl = document.querySelector('#time');
        const difficulty = diffEl ? diffEl.value : 'normal';
        const time = timeEl ? parseInt(timeEl.value, 10) : 30;
        const code = genRoomCode();
        if (codeInput) codeInput.value = code; // code de salle affiché au hôte
        host(code, difficulty, time);
      });
    }
    if (joinBtn && codeInput) {
      joinBtn.addEventListener('click', () => {
        const code = String(codeInput.value || '').trim().toUpperCase();
        if (code) join(code);
      });
    }
    if (soloBtn) {
      soloBtn.addEventListener('click', () => {
        soloBtn.hidden = true;
        const p2 = document.getElementById('p2p-panel');
        if (p2) p2.hidden = true;
        if (G.UI && G.UI.startGame) G.UI.startGame();
      });
    }
    if (readyBtn) {
      // v2.2.2 : « Ready ? » lance le handshake (envoi + deal si les 2 sont prêts).
      readyBtn.addEventListener('click', () => { markReady(); });
    }
  }

  G.P2P = {
    PROTOCOL,
    VERSION,
    genSeed,
    boardHash,
    buildInit,
    validateInit,
    validateMove,
    connect,
    disconnect,
    host,
    join,
    markReady,
    onLocalHumanMove,
    _brokerCfg: brokerCfg,
    _setStatus: setStatus,
    _currentPeer: () => currentPeer,
    // Hook de test additif (utilisé par test/g16-p2p.mjs) : injection d'un peer
    // + accès handshake. Aucune surface d'attaque ajoutée ; n'affecte ni le
    // flux réel ni le barème.
    _test: {
      injectPeer: function (peer, r) { currentPeer = peer; role = r; resetHandshake(); seedRef.d = 'normal'; seedRef.time = 30; },
      getReady: markReady,
      onMessage: onMessage,
      state: function () { return { role: role, localReady: localReady, peerReady: peerReady, started: started, dealing: dealing, seed: seedRef.seed }; },
      reset: function () { resetHandshake(); role = null; currentPeer = null; }
    }
  };

  wire();
})();
