  'use strict';

  /* ============================================================
   * BARÈME — réutilisé VERBATIM depuis poker-rush/index.html
   * (RANKS, RANK_LABEL, SUIT_LABEL, SUIT_NAME, HAND_SCORES,
   *  HAND_LABEL, isValidCard, evaluate5, isFull, rowScore,
   *  boardScore, boardBreakdown — texte identique, inchangé)
   * ============================================================ */
  // v2.1 — 13 rangs complets (2→A), 52 cartes (Texas Hold'em).
  const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const RANK_LABEL = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "V", 12: "D", 13: "R", 14: "A" };
  const SUIT_LABEL = ["♠", "♥", "♦", "♣"];
  const SUIT_NAME = ["pique", "cœur", "carreau", "trèfle"];
  const HAND_SCORES = {
    quinte_flush: 500, quatre: 300, full: 150, couleur: 100, quinte: 75,
    brelan: 40, double_paire: 25, paire: 10, carte_haute: 2
  };
  const HAND_LABEL = {
    quinte_flush: "Quinte flush", quatre: "Quatre", full: "Full", couleur: "Couleur",
    quinte: "Quinte", brelan: "Brelan", double_paire: "Double paire", paire: "Paire",
    carte_haute: "Carte haute"
  };
  const DIFFICULTIES = ["facile", "normal", "difficile"];

  function isValidCard(c) {
    return !!c && typeof c.r === "number" && c.r >= 2 && c.r <= 14
      && typeof c.s === "number" && c.s >= 0 && c.s <= 3;
  }

  /* Évalue exactement 5 cartes. Renvoie {type, label, score}. */
  function evaluate5(cards) {
    if (!Array.isArray(cards) || cards.length !== 5) {
      throw new Error("evaluate5 : exactement 5 cartes requises");
    }
    for (const c of cards) if (!isValidCard(c)) throw new Error("evaluate5 : carte invalide");
    const count = new Array(15).fill(0);
    let flush = true;
    for (const c of cards) {
      count[c.r] += 1;
      flush = flush && c.s === cards[0].s;
    }
    const ranks = RANKS.filter((r) => count[r] > 0);
    /* Quinte = 5 rangs distincts consécutifs (rangs 2→A). */
    // v2.1 — quinte normale (5 rangs consécutifs) OU wheel basse A-2-3-4-5 autorisée (l'As y est BAS) ;
    // 10-J-Q-K-A est une quinte (broadway) ; K-A-2-3-4 n'est pas une quinte (unique enroulement exclu).
  const wheel = [2, 3, 4, 5, 14].every((r) => count[r] > 0);
  const straight = ranks.length === 5 && (ranks[ranks.length - 1] - ranks[0] === 4 || wheel);
    const counts = ranks.map((r) => count[r]).sort((a, b) => b - a);
    let type;
    if (straight && flush) type = "quinte_flush";
    else if (counts[0] === 4) type = "quatre";
    else if (counts[0] === 3 && counts[1] === 2) type = "full";
    else if (flush) type = "couleur";
    else if (straight) type = "quinte";
    else if (counts[0] === 3) type = "brelan";
    else if (counts[0] === 2 && counts[1] === 2) type = "double_paire";
    else if (counts[0] === 2) type = "paire";
    else type = "carte_haute";
    return { type, label: HAND_LABEL[type], score: HAND_SCORES[type] };
  }

  function isFull(row) { return row.every((c) => c !== null); }

  /* Score d’une ligne terminée (0 si incomplète). */
  function rowScore(row) { return isFull(row) ? evaluate5(row).score : 0; }

  /* Score officiel d’un plateau : somme des 3 lignes. */
  function boardScore(board) { return board.reduce((t, row) => t + rowScore(row), 0); }

  function boardBreakdown(board) {
    return board.map((row) => isFull(row) ? evaluate5(row) : { type: null, label: "Incomplet", score: 0 });
  }

  /* ============================================================
   * POKER CHRONO — logique de jeu (aucune dépendance DOM)
   * Plateau 3×5 par joueur, toujours plein. 32 cartes : 15 + 15 + 2 (jeau).
   * Humain : glisser-déposer sur son plateau (swap). IA : swaps sur son
   * plateau à cadence fixe (2 s / 1 s / 0,5 s selon difficulté).
   * ============================================================ */
  const AI_INTERVAL = { difficile: 500, facile: 2000, normal: 1000 }; // ms

  // Paires de cellules (i<j), ordre déterministe
  const PAIRS = [];

  const TIME_OPTIONS = [10, 20, 30, 60, 90];

  for (let i = 0; i < 15; i++) for (let j = i + 1; j < 15; j++) PAIRS.push([i, j]);

  function colIdx(i) { return i % 5; }

  /* Dérivation d'un flux 128 bits depuis le seed maître (splitmix par mot). */
  function deriveStream(master, constant) {
    const out = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      let z = (master[i] ^ (constant + i * 0x9E3779B9)) >>> 0;
      z = (z ^ (z >>> 16)) >>> 0;
      z = Math.imul(z, 0x85EBCA6B) >>> 0;
      z = (z ^ (z >>> 13)) >>> 0;
      z = Math.imul(z, 0xC2B2AE35) >>> 0;
      out[i] = z >>> 0;
    }
    return out;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (a >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rowIdx(i) { return Math.floor(i / 5); }

  /* xoshiro128** — PRNG 128 bits (fix H1) : le deck d'une partie réelle
   * n'est plus recouvrable par brute-force 2^32 depuis les cartes visibles. */
  function xoshiro128ss(master) {
    let a = master[0] >>> 0, b = master[1] >>> 0, c = master[2] >>> 0, d = master[3] >>> 0;
    if (a === 0 && b === 0 && c === 0 && d === 0) a = 0x9E3779B9; // état nul interdit
    const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
    return function () {
      const result = Math.imul(rotl(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
      const t = (b << 9) >>> 0;
      c = (c ^ a) >>> 0;
      d = (d ^ b) >>> 0;
      b = (b ^ c) >>> 0;
      c = (c ^ d) >>> 0;
      d = (d ^ t) >>> 0;
      c = (c ^ (a << 11)) >>> 0;
      d = rotl(d, 14);
      return result / 4294967296;
    };
  }
'use strict';

  // v2.1 — GO ! (item 5 du brief) : 1 pt / seconde restante, débloqué à
  // t = 5 s, 2e clic idempotent, l'IA ne fait jamais GO.
  // Cap d'anti-abus : recalibré sur le bench 900 parties v2.1
  // (stats humains : min=6, P1=52, médiane=22, max=215) :
  // min + 85 = 91 > P1 − 30 = 22 → on ne garde PAS 85 ;
  // cap = floor(P1 − min − 30) = floor(52 − 6 − 30) = 16.
  const GO_BONUS_CAP = 16;

  const GO_MIN_MS = 5000;

  // Un coup IA sur son propre plateau (visible : les 2 cellules sont flashées).
  function aiStep(state) {
    if (!state || state.over || !state.running) return null;
    if (state.aiFrozen) return null; // v2.1 (mode 2P) : IA gelée — aucun swap, jamais de GO
    const board = state.boards.ai;
    let pick = null;
    if (state.difficulty === 'facile') {
      if (state.rngAI() < 0.25) {
        const p = PAIRS[Math.floor(state.rngAI() * PAIRS.length)];
        pick = { i: p[0], j: p[1] }; // bruit : swap aléatoire
      } else {
        const rs = rowScoresOf(board);
        const cands = [];
        for (const [i, j] of PAIRS) cands.push({ i, j, d: deltaSwap(board, i, j, rs) });
        cands.sort((a, b) => b.d - a.d);
        const top = cands.slice(0, 3); // bruit : aléatoire parmi les 3 meilleurs
        pick = top[Math.floor(state.rngAI() * top.length)];
      }
    } else if (state.difficulty === 'normal') {
      const mv = evalGreedy(board);
      pick = mv.value > 0 ? { i: mv.i, j: mv.j } : neutralMove(board);
    } else {
      const lm = state.lastAiMove;
      const mv3 = eval3ply(board, lm ? lm.i : -1, lm ? lm.j : -1);
      pick = mv3.value > 0 ? { i: mv3.i, j: mv3.j } : neutralMove(board);
    }
    if (!pick) return null;
    swapCells(board, pick.i, pick.j);
    state.aiMoves++;
    state.lastAiMove = { i: pick.i, j: pick.j };
    return pick;
  }

  function bestNextDelta(board, rowScores) {
    let best = -Infinity;
    for (const [i, j] of PAIRS) {
      const d = deltaSwap(board, i, j, rowScores);
      if (d > best) best = d;
    }
    return best;
  }

  function cardText(card) {
    return RANK_LABEL[card.r] + SUIT_LABEL[card.s];
  }

  function createGame(opts = {}) {
    const difficulty = DIFFICULTIES.includes(opts.difficulty) ? opts.difficulty : 'normal';
    const time = TIME_OPTIONS.includes(opts.time) ? opts.time : 30;
    let rngShuffle, rngHuman, rngAI;
    if (Number.isInteger(opts.seed) && opts.seed >= 0) {
      // Chemin override 32 bits (portes de test) : mulberry32 strictement
      // inchangé — les seeds 1000..1299 produisent les mêmes plateaux.
      const seed = opts.seed >>> 0;
      rngShuffle = mulberry32(seed ^ 0x9e3779b9);
      rngHuman = mulberry32(seed ^ 0x85ebca6b);
      rngAI = mulberry32(seed ^ 0xc2b2ae35);
    } else if (Array.isArray(opts.seed) && opts.seed.length === 4) {
      // v2.2 P2P : master 128 bits PARTAGE (4xuint32) partage - derivation deterministe
      // identique des deux cotes (xoshiro128ss sur streams derives). Coeur de
      // l'anti-triche : meme graine -> meme plateau, recalcule localement par
      // chaque joueur (js/net.js). La graine est echangee, jamais l'etat.
      const master = Uint32Array.from(opts.seed.map((w) => (w >>> 0) & 0xFFFFFFFF));
      if (master[0] === 0 && master[1] === 0 && master[2] === 0 && master[3] === 0) {
        master[0] = 0x9E3779B9; // etat nul interdit (coherent xoshiro128ss)
      }
      rngShuffle = xoshiro128ss(deriveStream(master, 0x9E3779B9));
      rngHuman = xoshiro128ss(deriveStream(master, 0x85EBCA6B));
      rngAI = xoshiro128ss(deriveStream(master, 0xC2B2AE35));
    } else {
      // Partie réelle (fix H1) : seed CSPRNG 128 bits (4×uint32) interne,
      // streams shuffle/human/AI dérivés (xoshiro128**) — aucune valeur 32
      // bits recouvrable depuis le deck visible.
      const master = new Uint32Array(4);
      let csp = false;
      try {
        const c = (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function')
          ? crypto
          : (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function')
            ? window.crypto
            : null;
        if (c) { c.getRandomValues(master); csp = true; }
      } catch (err) { csp = false; }
      if (!csp) for (let i = 0; i < 4; i++) master[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
      rngShuffle = xoshiro128ss(deriveStream(master, 0x9E3779B9));
      rngHuman = xoshiro128ss(deriveStream(master, 0x85EBCA6B));
      rngAI = xoshiro128ss(deriveStream(master, 0xC2B2AE35));
    }

    const deck = [];
    for (const s of [0, 1, 2, 3]) for (const r of RANKS) deck.push({ r, s });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rngShuffle() * (i + 1));
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    // v2.1 — DEAL MIROIR : les 15 cartes tirées forment la main du joueur
    // ET celle de l'IA (même sélection, copies profondes) ; les 37 cartes
    // restantes sont non utilisées (conservées en réserve d'audit, jamais jouées).
    const humanRows = [deck.slice(0, 5), deck.slice(5, 10), deck.slice(10, 15)];
    const boards = {
      human: humanRows,
      ai: humanRows.map((row) => row.map((c) => ({ r: c.r, s: c.s })))
    };
    return {
      difficulty,
      time,
      timeLeft: time * 1000,
      running: false,
      over: false,
      aiTimer: 0,
      goUsed: false, // v2.1 : GO déjà utilisé (idempotence du 2e clic)
      goBonus: 0,    // v2.1 : bonus GO accordé (0 = fin naturelle)
      deck: deck.slice(15), // v2.1 : 37 cartes non utilisées (audit, jamais jouées)
      boards,
      rngHuman,
      rngAI,
      aiMoves: 0,
      humanMoves: 0,
      lastAiMove: null,
      result: null
    };
  }

  // Delta de score d'un swap, avec scores de lignes mis en cache.
  // board est restauré à l'identique avant le retour (swap auto-inverse).
  function deltaSwap(board, i, j, rowScores) {
    const ri = rowIdx(i), rj = rowIdx(j);
    if (ri === rj) {
      const before = rowScores[ri];
      swapCells(board, i, j);
      const after = rowScore(board[ri]);
      swapCells(board, i, j);
      return after - before;
    }
    const before1 = rowScores[ri], before2 = rowScores[rj];
    swapCells(board, i, j);
    const after1 = rowScore(board[ri]), after2 = rowScore(board[rj]);
    swapCells(board, i, j);
    return (after1 - before1) + (after2 - before2);
  }

  // Difficile : évaluation quasi exacte sur 3 coups (beam 10 déterministe sur
  // le 1er coup, exploration complète des 105 swaps aux plies 2 et 3).
  // v2.1 (fix P4) : exclusion du dernier swap joué (exI/exJ) et de son
  // annulation à la plie 2 — supprime les cycles 2 plies (l'IA rejouait le
  // même swap à l'identique à chaque tour, oscillant sans jamais progresser).
  function eval3ply(board, exI = -1, exJ = -1) {
    const rs = rowScoresOf(board);
    const cands = [];
    for (const [i, j] of PAIRS) {
      if (exI >= 0 && i === exI && j === exJ) continue;
      cands.push({ i, j, d1: deltaSwap(board, i, j, rs) });
    }
    cands.sort((a, b) => b.d1 - a.d1); // stable → déterministe sur égalité
    const beam = cands.slice(0, 10);
    let bi = -1, bj = -1, bv = -Infinity;
    for (const c of beam) {
      swapCells(board, c.i, c.j);
      const rs2 = rowScoresOf(board);
      const cands2 = [];
      for (const [i, j] of PAIRS) {
        if (i === c.i && j === c.j) continue; // annulation de la plie 1
        cands2.push({ i, j, d: deltaSwap(board, i, j, rs2) });
      }
      cands2.sort((a, b) => b.d - a.d); // stable → déterministe sur égalité
      const beam2 = cands2.slice(0, 12);
      for (const c2 of beam2) {
        swapCells(board, c2.i, c2.j);
        const d3 = bestNextDelta(board, rowScoresOf(board));
        swapCells(board, c2.i, c2.j);
        // v2.1 (fix P4) : l'IA peut toujours passer (coup neutre ou absence
        // de coup) — la valeur d'une plie continue est max(0, meilleur
        // delta), pas la somme forcée de coups négatifs.
        const v = c.d1 + Math.max(0, c2.d) + Math.max(0, d3);
        if (v > bv) { bv = v; bi = c.i; bj = c.j; }
      }
      swapCells(board, c.i, c.j);
    }
    return { i: bi, j: bj, value: bv };
  }

  // Normal : glouton exact 1-coup (argmax du delta, sans bruit)
  function evalGreedy(board) {
    const rs = rowScoresOf(board);
    let bi = -1, bj = -1, bv = -Infinity;
    for (const [i, j] of PAIRS) {
      const d = deltaSwap(board, i, j, rs);
      if (d > bv) { bv = d; bi = i; bj = j; }
    }
    return { i: bi, j: bj, value: bv };
  }

  function finish(state) {
    state.running = false;
    state.over = true;
    const human = boardScore(state.boards.human);
    const ai = boardScore(state.boards.ai);
    const bonus = state.goBonus || 0; // v2.1 : bonus GO (0 pour une fin naturelle)
    const totalHuman = human + bonus;
    state.result = {
      human,
      ai,
      bonus,
      totalHuman,
      // v2.1 : vainqueur recalculé bonus inclus (plateau + GO contre l'IA).
      winner: totalHuman > ai ? 'human' : ai > totalHuman ? 'ai' : 'draw',
      rowsHuman: boardBreakdown(state.boards.human),
      rowsAI: boardBreakdown(state.boards.ai)
    };
    return state.result;
  }

  // v2.1 — GO ! (humain uniquement : l'IA ne fait jamais GO) : stoppe le
  // chrono, bonus = ceil(secondes restantes) × 1 pt, plafonné à
  // GO_BONUS_CAP. Idempotent : le 2e clic est refusé ('already').
  // Retour { ok, bonus, human, ai, totalHuman, winner } ou { ok:false, reason }.
  function goNow(state) {
    if (!state) return { ok: false, reason: 'no_state' };
    if (state.goUsed) return { ok: false, reason: 'already' };
    if (state.over) return { ok: false, reason: 'over' };
    if (!state.running) return { ok: false, reason: 'not_running' };
    const elapsed = state.time * 1000 - state.timeLeft;
    if (elapsed < GO_MIN_MS) return { ok: false, reason: 'too_early' };
    const bonus = Math.min(GO_BONUS_CAP, Math.ceil(state.timeLeft / 1000));
    state.goUsed = true;
    state.goBonus = bonus;
    finish(state); // result recalculé (bonus, totalHuman, winner)
    const res = state.result;
    return { ok: true, bonus, human: res.human, ai: res.ai, totalHuman: res.totalHuman, winner: res.winner };
  }

  // Politique humain aléatoire (tests headless uniquement)
  function humanRandomSwap(state) {
    if (!state || state.over || !state.running) return null;
    const p = PAIRS[Math.floor(state.rngHuman() * PAIRS.length)];
    swapCells(state.boards.human, p[0], p[1]);
    state.humanMoves++;
    return { i: p[0], j: p[1] };
  }

  // Swap humain. to === null → dépôt hors plateau. Résultat { ok, reason? }.
  function humanSwap(state, from, to) {
    if (!state) return { ok: false, reason: 'invalid' };
    if (state.over) return { ok: false, reason: 'over' };
    if (!state.running) return { ok: false, reason: 'not_running' };
    if (to === null || to === undefined) return { ok: false, reason: 'out' };
    if (typeof from !== 'number' || typeof to !== 'number' ||
        !Number.isInteger(from) || !Number.isInteger(to) ||
        from < 0 || from > 14 || to < 0 || to > 14) {
      return { ok: false, reason: 'invalid' };
    }
    if (from === to) return { ok: false, reason: 'self' };
    swapCells(state.boards.human, from, to);
    state.humanMoves++;
    return { ok: true };
  }

  // v2.2 P2P : swap sur le plateau DISTANT (le plateau "ai" vu de notre cote).
  // Meme validation que humanSwap ; met a jour aiMoves + lastAiMove (flash UI).
  function remoteSwap(state, from, to) {
    if (!state) return { ok: false, reason: 'invalid' };
    if (state.over) return { ok: false, reason: 'over' };
    if (!state.running) return { ok: false, reason: 'not_running' };
    if (to === null || to === undefined) return { ok: false, reason: 'out' };
    if (typeof from !== 'number' || typeof to !== 'number' ||
        !Number.isInteger(from) || !Number.isInteger(to) ||
        from < 0 || from > 14 || to < 0 || to > 14) {
      return { ok: false, reason: 'invalid' };
    }
    if (from === to) return { ok: false, reason: 'self' };
    swapCells(state.boards.ai, from, to);
    state.aiMoves++;
    state.lastAiMove = { i: from, j: to };
    return { ok: true };
  }

  function neutralMove(board) {
    const rs = rowScoresOf(board);
    for (const [i, j] of PAIRS) {
      if (deltaSwap(board, i, j, rs) === 0) return { i, j };
    }
    return null;
  }

  function rowScoresOf(board) {
    return [rowScore(board[0]), rowScore(board[1]), rowScore(board[2])];
  }

  // Simulation headless complète : tick 100 ms, humain = swap aléatoire/1 s
  function simulateGame(opts = {}) {
    const st = createGame(opts);
    const errors = [];
    let t = 0;
    start(st);
    try {
      while (!st.over) {
        if (t % 1000 === 0 && t > 0) humanRandomSwap(st);
        tick(st, 100);
        t += 100;
      }
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err));
    }
    return { st, errors };
  }

  function start(state) {
    if (state.over) return false;
    state.running = true;
    return true;
  }

function swapCells(board, i, j) {
    const ri = rowIdx(i), ci = colIdx(i), rj = rowIdx(j), cj = colIdx(j);
    const t = board[ri][ci];
    board[ri][ci] = board[rj][cj];
    board[rj][cj] = t;
  }

  function tick(state, dt) {
    if (state.over || !state.running) return { ended: false, aiMoved: false };
    // Fix M1 : dt négatif ou non fini interdit — pas de chrono infini via tick.
    if (!Number.isFinite(dt) || dt <= 0) return { ended: false, aiMoved: false };
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    let aiMoved = false;
    const interval = AI_INTERVAL[state.difficulty];
    state.aiTimer += dt;
    while (state.timeLeft > 0 && state.aiTimer >= interval) {
      state.aiTimer -= interval;
      if (aiStep(state)) aiMoved = true;
    }
    if (state.timeLeft <= 0) {
      finish(state);
      return { ended: true, aiMoved };
    }
    return { ended: false, aiMoved };
  }

  globalThis.G = {
    version: '2.1.1',
    // barème verbatim
    RANKS, RANK_LABEL, SUIT_LABEL, SUIT_NAME, HAND_SCORES, HAND_LABEL,
    isValidCard, evaluate5, isFull, rowScore, boardScore, boardBreakdown,
    // poker chrono
    DIFFICULTIES, TIME_OPTIONS, AI_INTERVAL, PAIRS,
    GO_MIN_MS, GO_BONUS_CAP,
    createGame, start, tick, humanSwap, remoteSwap, goNow, aiStep, humanRandomSwap,
    simulateGame, cardText
  };

/* ============================================================
 * i18n — v2.1.1 : 5 langues (EN défaut, FR, ES, IT, DE).
 * Toutes les chaînes user-facing passent par G.I18N.t().
 * Les libellés canoniques du barème (FR, js/deck.js) sont
 * mappés sur des clés de dictionnaire (HAND_KEYS).
 * Persistance : localStorage 'poker-chrono-lang'.
 * Aucun effet sur la logique de jeu (barème, IA, deck, seed).
 * ============================================================ */
(() => {
  'use strict';

  const DICTS = {
    de: {
      ai_board: 'KI-Brett',
      ai_readonly: 'Abgelehnt: das KI-Brett ist schreibgeschützt.',
      best: 'Bestwert: {n} Pkt',
      colors_2: '2 Farben',
      colors_4: '4 Farben',
      colors_label: 'Farbmodus',
      diff_difficile: 'Schwer',
      diff_facile: 'Leicht',
      diff_label: 'KI-Schwierigkeit',
      diff_normal: 'Normal',
      draw: '🤝 Unentschieden!',
      ended: 'Fertig — {h} menschliche(r) Swap, {a} KI-Swap.',
      final_game: 'Spielende',
      fs_ai: ' — KI-Brett: {n} Pkt',
      fs_go: ' + GO-Bonus: {b} Pkt = {t} Pkt',
      fs_human: 'Dein Brett: {n} Pkt',
      go_btn: 'Fertig!',
      go_no_state: 'Spiel nicht gestartet.',
      go_not_running: 'Zuerst das Spiel starten.',
      go_over: 'Spiel beendet.',
      go_too_early: 'Zu früh: GO wird in den letzten 5 s freigeschaltet.',
      hand_brelan: 'Drilling',
      hand_carte_haute: 'Hohes Blatt',
      hand_couleur: 'Flush',
      hand_double_paire: 'Zwei Paare',
      hand_full: 'Full House',
      hand_incomplete: 'Unvollständig',
      hand_paire: 'Paar',
      hand_quatre: 'Vierling',
      hand_quinte: 'Straight',
      hand_quinte_flush: 'Straight Flush',
      human_board: 'Dein Brett',
      idle: 'Bereit — Schwierigkeitsgrad und Zeit wählen.',
      lang_label: 'Sprache',
      lose: '💻 Die KI gewinnt.',
      meta_desc: 'Poker Chrono — schneller Poker zu zweit: Drag & Drop, GO-Bonus, 5 Sprachen.',
      music_btn: '♪ Musik',
      new_best: 'Neuer Rekord: {n} Pkt',
      play: 'Spielen',
      pts: 'Pkt',
      rank_11: 'J', rank_12: 'Q', rank_13: 'K', rank_14: 'A'
    ,
      reason_invalid: 'Ungültige Ablage: abgelehnt.',
      reason_not_running: 'Spiel nicht gestartet: zuerst starten.',
      reason_out: 'Außerhalb des Bretts abgelegt: abgebrochen.',
      reason_over: 'Spiel beendet: kein Swap mehr möglich.',
      reason_self: 'Auf die eigene Zelle abgelegt: nichts.',
      replay: 'Nochmal spielen',
      row_line: 'Zeile {n} — {label} ({score} Pkt)',
      running: "Los geht's: {time} s, KI {diff}.",
      sfx_btn: 'SFX',
      start_first: 'Starte das Spiel, bevor du Karten bewegst.',
      time_label: 'Rundenzeit (Sekunden)',
      title: 'Poker Chrono — v2 dopamine',
      total_label: 'Summe: ',
      vol_music: 'Musik-Lautst.',
      vol_sfx: 'SFX-Lautst.',
      win: '🏆 Du gewinnst!',
      p2p_title: 'Zwei Spieler',
      p2p_host_btn: 'Spiel hosten',
      p2p_join_btn: 'Mit Code beitreten',
      p2p_code_label: 'Raum-Code',
      status_connecting: 'Verbinde...',
      status_connected: 'Verbunden',
      status_waiting_host: 'Warte auf den Host...',
      status_err_no_server: 'Kein Signalisierungsserver (oder ungültiger Code)',
            err_from: 'Ungültiger Zug: Ausgangsfeld außerhalb.',
      err_to: 'Ungültiger Zug: Zielfeld außerhalb.',
      err_bad_card: 'Ungültiger Zug: unbekannte Karte.',
      err_moved: 'Diese Karte hat sich bereits bewegt.',
      err_bad_seed: 'Anfangszustand abgelehnt (ungültiger Seed).',
      err_bad_payload: 'Fehlerhafte Nachricht empfangen.',
status_err_seed_mismatch: 'Unstimmiger Anfangszustand (Manipulation?)'},
    en: {
      ai_board: 'AI board',
      ai_readonly: 'Refused: the AI board is read-only.',
      best: 'Best score: {n} pts',
      colors_2: '2 colors',
      colors_4: '4 colors',
      colors_label: 'Color rendering mode',
      diff_difficile: 'Hard',
      diff_facile: 'Easy',
      diff_label: 'AI difficulty',
      diff_normal: 'Normal',
      draw: '🤝 Draw!',
      ended: 'Done — {h} human swap(s), {a} AI swap(s).',
      final_game: 'Game over',
      fs_ai: ' — AI board: {n} pts',
      fs_go: ' + GO bonus: {b} pts = {t} pts',
      fs_human: 'Your board: {n} pts',
      go_btn: 'Finish!',
      go_no_state: 'Game not started.',
      go_not_running: 'Start the game first.',
      go_over: 'Game over.',
      go_too_early: 'Too early: GO unlocks in the last 5 s.',
      hand_brelan: 'Three of a kind',
      hand_carte_haute: 'High card',
      hand_couleur: 'Flush',
      hand_double_paire: 'Two pair',
      hand_full: 'Full house',
      hand_incomplete: 'Incomplete',
      hand_paire: 'Pair',
      hand_quatre: 'Four of a kind',
      hand_quinte: 'Straight',
      hand_quinte_flush: 'Straight flush',
      human_board: 'Your board',
      idle: 'Ready — choose difficulty and time.',
      lang_label: 'Language',
      lose: '💻 The AI wins.',
      meta_desc: 'Poker Chrono — 2-player speed poker: drag & drop, GO bonus, 5 languages.',
      music_btn: '♪ Music',
      new_best: 'New best score: {n} pts',
      play: 'Play',
      pts: 'pts',
      rank_11: 'J', rank_12: 'Q', rank_13: 'K', rank_14: 'A'
    ,
      reason_invalid: 'Invalid drop: refused.',
      reason_not_running: 'Game not started: start the game first.',
      reason_out: 'Dropped off the board: cancelled.',
      reason_over: 'Game over: no more swaps.',
      reason_self: 'Dropped on its own cell: nothing.',
      replay: 'Play again',
      row_line: 'Row {n} — {label} ({score} pts)',
      running: 'Here we go: {time} s, AI {diff}.',
      sfx_btn: 'SFX',
      start_first: 'Start the game before moving cards.',
      time_label: 'Round time (seconds)',
      title: 'Poker Chrono — v2 dopamine',
      total_label: 'Total: ',
      vol_music: 'Music vol.',
      vol_sfx: 'SFX vol.',
      win: '🏆 You win!',
      p2p_title: 'Two-player',
      p2p_host_btn: 'Host a game',
      p2p_join_btn: 'Join with a code',
      p2p_code_label: 'Room code',
      status_connecting: 'Connecting...',
      status_connected: 'Connected',
      status_waiting_host: 'Waiting for the host...',
      status_err_no_server: 'No signaling server (or bad code)',
            err_from: 'Bad move: origin out of range.',
      err_to: 'Bad move: destination out of range.',
      err_bad_card: 'Bad move: unknown card.',
      err_moved: 'That card has already moved.',
      err_bad_seed: 'Initial state rejected (bad seed).',
      err_bad_payload: 'Malformed message received.',
status_err_seed_mismatch: 'Initial state mismatch (possible tamper)'},
    es: {
      ai_board: 'Tablero de la IA',
      ai_readonly: 'Rechazado: el tablero de la IA es solo lectura.',
      best: 'Mejor puntuación: {n} pts',
      colors_2: '2 colores',
      colors_4: '4 colores',
      colors_label: 'Modo de color',
      diff_difficile: 'Difícil',
      diff_facile: 'Fácil',
      diff_label: 'Dificultad de la IA',
      diff_normal: 'Normal',
      draw: '🤝 ¡Empate!',
      ended: 'Terminado — {h} swap(s) humano(s), {a} swap(s) IA.',
      final_game: 'Fin de partida',
      fs_ai: ' — Tablero de la IA: {n} pts',
      fs_go: ' + bonus GO: {b} pts = {t} pts',
      fs_human: 'Tu tablero: {n} pts',
      go_btn: '¡Fin!',
      go_no_state: 'Partida no iniciada.',
      go_not_running: 'Empieza la partida primero.',
      go_over: 'Partida terminada.',
      go_too_early: 'Demasiado pronto: el GO se desbloquea en los últimos 5 s.',
      hand_brelan: 'Trío',
      hand_carte_haute: 'Carta alta',
      hand_couleur: 'Color',
      hand_double_paire: 'Doble pareja',
      hand_full: 'Full',
      hand_incomplete: 'Incompleta',
      hand_paire: 'Pareja',
      hand_quatre: 'Póker',
      hand_quinte: 'Escalera',
      hand_quinte_flush: 'Escalera de color',
      human_board: 'Tu tablero',
      idle: 'Listo: elige dificultad y tiempo.',
      lang_label: 'Idioma',
      lose: '💻 Gana la IA.',
      meta_desc: 'Poker Chrono — poker rápido a 2: arrastrar y soltar, bonus GO, 5 idiomas.',
      music_btn: '♪ Música',
      new_best: '¡Nuevo récord! {n} pts',
      play: 'Jugar',
      pts: 'pts',
      rank_11: 'J', rank_12: 'Q', rank_13: 'K', rank_14: 'A'
    ,
      reason_invalid: 'Colocación inválida: rechazada.',
      reason_not_running: 'Partida no iniciada: empieza primero.',
      reason_out: 'Suelta fuera del tablero: cancelado.',
      reason_over: 'Partida terminada: ya no hay swaps.',
      reason_self: 'Soltada en su propia casilla: nada.',
      replay: 'Jugar de nuevo',
      row_line: 'Línea {n} — {label} ({score} pts)',
      running: '¡A jugar! {time} s, IA {diff}.',
      sfx_btn: 'SFX',
      start_first: 'Empieza la partida antes de mover cartas.',
      time_label: 'Tiempo de la mano (segundos)',
      title: 'Poker Chrono — v2 dopamine',
      total_label: 'Total: ',
      vol_music: 'Vol. música',
      vol_sfx: 'Vol. SFX',
      win: '🏆 ¡Ganas!',
      p2p_title: 'Dos jugadores',
      p2p_host_btn: 'Organizar una partida',
      p2p_join_btn: 'Unirse con un código',
      p2p_code_label: 'Código de la sala',
      status_connecting: 'Conectando...',
      status_connected: 'Conectado',
      status_waiting_host: 'Esperando al anfitrión...',
      status_err_no_server: 'Sin servidor de señalización (o código inválido)',
            err_from: 'Movimiento inválido: origen fuera de límites.',
      err_to: 'Movimiento inválido: destino fuera de límites.',
      err_bad_card: 'Movimiento inválido: carta desconocida.',
      err_moved: 'Esa carta ya se movió.',
      err_bad_seed: 'Estado inicial rechazado (seed inválido).',
      err_bad_payload: 'Mensaje mal formado recibido.',
status_err_seed_mismatch: 'Estado inicial no coincide (¿trampa?)'},
    fr: {
      ai_board: "Plateau de l'IA",
      ai_readonly: "Refusé : le plateau de l'IA est en lecture seule.",
      best: 'Meilleur score : {n} pts',
      colors_2: '2 couleurs',
      colors_4: '4 couleurs',
      colors_label: 'Mode de rendu des couleurs',
      diff_difficile: 'Difficile',
      diff_facile: 'Facile',
      diff_label: "Difficulté de l'IA",
      diff_normal: 'Normal',
      draw: '🤝 Égalité !',
      ended: 'Terminé — {h} swap(s) humain(s), {a} swap(s) IA.',
      final_game: 'Fin de partie',
      fs_ai: " — Plateau de l'IA : {n} pts",
      fs_go: ' + bonus GO : {b} pts = {t} pts',
      fs_human: 'Votre plateau : {n} pts',
      go_btn: 'Finis !',
      go_no_state: 'Partie non lancée.',
      go_not_running: "Lancez la partie d'abord.",
      go_over: 'Partie terminée.',
      go_too_early: 'Trop tôt : le GO se débloque après 5 s.',
      hand_brelan: 'Brelan',
      hand_carte_haute: 'Carte haute',
      hand_couleur: 'Couleur',
      hand_double_paire: 'Double paire',
      hand_full: 'Full',
      hand_incomplete: 'Incomplet',
      hand_paire: 'Paire',
      hand_quatre: 'Quatre',
      hand_quinte: 'Quinte',
      hand_quinte_flush: 'Quinte flush',
      human_board: 'Votre plateau',
      idle: 'Prêt — choisissez la difficulté et le temps.',
      lang_label: 'Langue',
      lose: "💻 L'IA gagne.",
      meta_desc: 'Poker Chrono — poker rapide à 2 : glisser-déposer, bonus GO, 5 langues.',
      music_btn: '♪ Musique',
      new_best: 'Nouveau meilleur score : {n} pts',
      play: 'Jouer',
      pts: 'pts',
      rank_11: 'V', rank_12: 'D', rank_13: 'R', rank_14: 'A'
    ,
      reason_invalid: 'Dépôt invalide : refusé.',
      reason_not_running: "Partie non lancée : lancez la partie d'abord.",
      reason_out: 'Dépôt hors du plateau : annulé.',
      reason_over: 'Partie terminée : plus de swap possible.',
      reason_self: 'Déposé sur sa propre case : rien.',
      replay: 'Rejouer',
      row_line: 'Ligne {n} — {label} ({score} pts)',
      running: "C'est parti : {time} s, IA {diff}.",
      sfx_btn: 'SFX',
      start_first: "Lancez la partie avant de déplacer des cartes.",
      time_label: 'Temps de la manche (secondes)',
      title: 'Poker Chrono — v2 dopamine',
      total_label: 'Total : ',
      vol_music: 'Vol. musique',
      vol_sfx: 'Vol. SFX',
      win: '🏆 Vous gagnez !',
      p2p_title: 'Deux joueurs',
      p2p_host_btn: 'Héberger une partie',
      p2p_join_btn: 'Rejoindre avec un code',
      p2p_code_label: 'Code de la salle',
      status_connecting: 'Connexion...',
      status_connected: 'Connecté',
      status_waiting_host: "En attente de l'host...",
      status_err_no_server: 'Aucun serveur de signalisation (ou code invalide)',
            err_from: 'Mauvais déplacement : origine hors limites.',
      err_to: 'Mauvais déplacement : destination hors limites.',
      err_bad_card: 'Mauvais déplacement : carte inconnue.',
      err_moved: 'Cette carte a déjà bougé.',
      err_bad_seed: 'État initial refusé (mauvais seed).',
      err_bad_payload: 'Message mal formé reçu.',
status_err_seed_mismatch: 'État initial incohérent (triche ?)'},
    it: {
      ai_board: "Tabellone dell'IA",
      ai_readonly: "Rifiutato: il tabellone dell'IA è in sola lettura.",
      best: 'Punteggio migliore: {n} pts',
      colors_2: '2 colori',
      colors_4: '4 colori',
      colors_label: 'Modalità colore',
      diff_difficile: 'Difficile',
      diff_facile: 'Facile',
      diff_label: "Difficoltà dell'IA",
      diff_normal: 'Normale',
      draw: '🤝 Pareggio!',
      ended: 'Finita — {h} swap umano/umani, {a} swap IA.',
      final_game: 'Fine della partita',
      fs_ai: " — Tabellone dell'IA: {n} pts",
      fs_go: ' + bonus GO: {b} pts = {t} pts',
      fs_human: 'Il tuo tabellone: {n} pts',
      go_btn: 'Fine!',
      go_no_state: 'Partita non iniziata.',
      go_not_running: 'Avvia prima la partita.',
      go_over: 'Partita terminata.',
      go_too_early: 'Troppo presto: il GO si sblocca negli ultimi 5 s.',
      hand_brelan: 'Brelan',
      hand_carte_haute: 'Carta alta',
      hand_couleur: 'Colore',
      hand_double_paire: 'Doppia coppia',
      hand_full: 'Full',
      hand_incomplete: 'Incompleta',
      hand_paire: 'Coppia',
      hand_quatre: 'Quattro',
      hand_quinte: 'Scala',
      hand_quinte_flush: 'Scala colore',
      human_board: 'Il tuo tabellone',
      idle: 'Pronto: scegli difficoltà e tempo.',
      lang_label: 'Lingua',
      lose: "💻 Vince l'IA.",
      meta_desc: 'Poker Chrono — poker veloce a 2: drag & drop, bonus GO, 5 lingue.',
      music_btn: '♪ Musica',
      new_best: 'Nuovo record: {n} pts',
      play: 'Gioca',
      pts: 'pts',
      rank_11: 'J', rank_12: 'Q', rank_13: 'K', rank_14: 'A'
    ,
      reason_invalid: 'Posizionamento non valido: rifiutato.',
      reason_not_running: 'Partita non iniziata: prima avvia la partita.',
      reason_out: 'Presa fuori dal tabellone: annullato.',
      reason_over: 'Partita terminata: più swap possibili.',
      reason_self: 'Posizionata sulla propria cella: niente.',
      replay: 'Rigioca',
      row_line: 'Riga {n} — {label} ({score} pts)',
      running: 'Si parte: {time} s, IA {diff}.',
      sfx_btn: 'SFX',
      start_first: 'Avvia la partita prima di muovere le carte.',
      time_label: 'Tempo della mano (secondi)',
      title: 'Poker Chrono — v2 dopamine',
      total_label: 'Totale: ',
      vol_music: 'Vol. musica',
      vol_sfx: 'Vol. SFX',
      win: '🏆 Hai vinto!',
      p2p_title: 'Due giocatori',
      p2p_host_btn: 'Ospita una partita',
      p2p_join_btn: 'Entra con un codice',
      p2p_code_label: 'Codice della sala',
      status_connecting: 'Connessione...',
      status_connected: 'Connesso',
      status_waiting_host: "In attesa dell'host...",
      status_err_no_server: 'Nessun server di segnalazione (o codice non valido)',
            err_from: 'Scambio non valido: origine fuori limite.',
      err_to: 'Scambio non valido: destinazione fuori limite.',
      err_bad_card: 'Scambio non valido: carta sconosciuta.',
      err_moved: 'Quella carta si è già mossa.',
      err_bad_seed: 'Stato iniziale rifiutato (seed non valido).',
      err_bad_payload: 'Messaggio malformato ricevuto.',
status_err_seed_mismatch: 'Stato iniziale non corrispondente (trucco?)'}
  };

  const G = globalThis.G;

  /* Libellés canoniques du barème (FR, js/deck.js) → clés de dictionnaire. */
  const HAND_KEYS = {
    'Brelan': 'hand_brelan',
    'Carte haute': 'hand_carte_haute',
    'Couleur': 'hand_couleur',
    'Double paire': 'hand_double_paire',
    'Full': 'hand_full',
    'Incomplet': 'hand_incomplete',
    'Paire': 'hand_paire',
    'Quatre': 'hand_quatre',
    'Quinte flush': 'hand_quinte_flush',
    'Quinte': 'hand_quinte'
  };

  let lang = 'en';

  const LANGS = ['en', 'fr', 'es', 'it', 'de'];

  function apply() {
    const d = dict();
    document.documentElement.setAttribute('lang', lang);
    document.title = d.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', d.meta_desc);
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = t(el.getAttribute('data-i18n'));
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    }
  }

  function dict() { return DICTS[lang] || DICTS.en; }

  function diffLabel(v) { return t('diff_' + v); }

  function handName(canonical) {
    const k = HAND_KEYS[canonical];
    return k ? t(k) : canonical;
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem('poker-chrono-lang'); } catch (err) { /* stockage indisponible */ }
    if (saved && DICTS[saved]) lang = saved;
    apply();
  }

  function rankLabel(r) {
    const k = 'rank_' + r;
    const d = dict();
    if (Object.prototype.hasOwnProperty.call(d, k)) return d[k];
    return (G && G.RANK_LABEL && G.RANK_LABEL[r] !== undefined) ? G.RANK_LABEL[r] : String(r);
  }

  function setLang(l) {
    if (!LANGS.includes(l)) return false;
    lang = l;
    try { localStorage.setItem('poker-chrono-lang', l); } catch (err) { /* stockage indisponible */ }
    apply();
    return true;
  }

  function t(key, vars) {
    let s = Object.prototype.hasOwnProperty.call(dict(), key)
      ? dict()[key]
      : (Object.prototype.hasOwnProperty.call(DICTS.en, key) ? DICTS.en[key] : key);
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  }

  G.I18N = {
    t, handName, rankLabel, diffLabel, apply, setLang,
    getLang: () => lang,
    dicts: () => DICTS,
    LANGS,
    init
  };

  init();
})();

/* Poker Chrono v2 — couche audio 100 % Web Audio API (zéro fichier, zéro dépendance).
 * Musique de fond (séquenceur lookahead, gamme de la mineur) + SFX synthétiques.
 * Démarrage au premier geste utilisateur (politique autoplay des navigateurs).
 * Toggles ON/OFF musique & SFX + volumes séparés, persistés en localStorage.
 * Conçu pour être testable headless : si le AudioContext est absent/stub, aucune
 * exception ne fuit — le module reste fonctionnel (silencieux). */
(function () {
  'use strict';

  const BASS = [45, 45, 0, 45, 48, 0, 48, 0, 43, 43, 0, 43, 47, 0, 48, 0];

  const KEY = {
    music: 'poker-chrono-audio-music',
    mv: 'poker-chrono-audio-music-vol',
    sfx: 'poker-chrono-audio-sfx',
    sv: 'poker-chrono-audio-sfx-vol'
  };

  const A = {
    ctx: null,
    musicGain: null,
    sfxGain: null,
    /* v2.1.2 : musique OFF par défaut au chargement frais (aucune entrée LS) ;
       une valeur LS existante ('1'/'0') continue de primer. SFX reste ON par défaut. */
    musicOn: lsGet(KEY.music, '0') === '1',
    sfxOn: lsGet(KEY.sfx, '1') === '1',
    musicVol: clamp01(lsGet(KEY.mv, '0.7')),
    sfxVol: clamp01(lsGet(KEY.sv, '0.8')),
    step: 0,
    nextStepTime: 0,
    timer: null,
    /* v2.1 (fix réactivité) : le 1er clic sur un toggle ARME le son
       (force ON, contexte créé/repris dans le même tick) au lieu
       d'inverser l'état affiché. Clics suivants : basculement normal. */
    _musicArmed: false,
    _sfxArmed: false
  };

  const LEAD = [69, 0, 72, 74, 0, 72, 0, 69, 67, 0, 69, 71, 0, 74, 0, 71];

  /* ---------- SFX ---------- */
  const sfx = {
    /* pop du deal : 3 blips montants */
    deal() {
      if (!ready()) return;
      const t = A.ctx.currentTime;
      [520, 660, 820].forEach((f, i) => note(f, t + i * 0.07, 0.12, 'sine', 0.25, A.sfxGain));
    },
    /* swap humain : chirp montant */
    swap() {
      if (!ready()) return;
      glide(320, 760, A.ctx.currentTime, 0.14, 'square', 0.12, A.sfxGain);
    },
    /* swap IA : chirp plus doux */
    swapSoft() {
      if (!ready()) return;
      glide(280, 520, A.ctx.currentTime, 0.12, 'sine', 0.06, A.sfxGain);
    },
    /* tic (secondes impaires) */
    tick() { if (ready()) note(1250, A.ctx.currentTime, 0.05, 'sine', 0.16, A.sfxGain); },
    /* tac (secondes paires) */
    tock() { if (ready()) note(830, A.ctx.currentTime, 0.05, 'sine', 0.14, A.sfxGain); },
    /* sirène finale (≤ 5 s) */
    sirene() {
      if (!ready()) return;
      const t = A.ctx.currentTime;
      glide(700, 220, t, 0.9, 'sawtooth', 0.18, A.sfxGain);
      glide(1400, 440, t + 0.05, 0.8, 'sine', 0.08, A.sfxGain);
    },
    /* explosion de victoire : bruit filtré + descente de grave + fanfare */
    victoire() {
      if (!ready()) return;
      const t = A.ctx.currentTime;
      noiseBurst(t, 0.9, 1800, 120, 0.5, A.sfxGain);
      glide(110, 40, t, 0.7, 'sine', 0.4, A.sfxGain);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        note(f, t + 0.15 + i * 0.12, 0.5, 'triangle', 0.22, A.sfxGain));
    },
    /* chute de défaite */
    defaite() {
      if (!ready()) return;
      glide(300, 120, A.ctx.currentTime, 0.8, 'sawtooth', 0.15, A.sfxGain);
    },
    /* accord neutre pour l'égalité */
    egalite() {
      if (!ready()) return;
      const t = A.ctx.currentTime;
      [440, 554.37].forEach((f, i) => note(f, t + i * 0.18, 0.4, 'sine', 0.18, A.sfxGain));
    }
  };

  /* Partition 16 pas (120 BPM, 1 pas = 1/4 de temps). 0 = repos. */
  const STEP = 0.25;

  function clamp01(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.7;
  }

  function ensure() {
    if (A.ctx) {
      try { if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); }
      catch (err) { /* déjà prêt ou contexte indisponible */ }
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (typeof AC !== 'function') return false;
    try {
      A.ctx = new AC();
      A.musicGain = A.ctx.createGain();
      A.musicGain.gain.value = musicGainValue();
      A.musicGain.connect(A.ctx.destination);
      A.sfxGain = A.ctx.createGain();
      A.sfxGain.gain.value = sfxGainValue();
      A.sfxGain.connect(A.ctx.destination);
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      startMusic();
    } catch (err) {
      A.ctx = null;
      return false;
    }
    return true;
  }

  function glide(freq0, freq1, when, dur, type, peak, dest) {
    if (!A.ctx) return;
    try {
      const o = A.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(20, freq0), when);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), when + dur);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g);
      g.connect(dest);
      o.start(when);
      o.stop(when + dur + 0.05);
    } catch (err) { /* non critique */ }
  }

  function lsGet(k, dflt) {
    try { const v = localStorage.getItem(k); return v === null ? dflt : v; }
    catch (err) { return dflt; }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, String(v)); } catch (err) { /* stockage indisponible */ }
  }

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function musicGainValue() {
    return A.musicOn ? Math.pow(A.musicVol, 2) * 0.5 : 0;
  }

  function noiseBurst(when, dur, cutoff0, cutoff1, gainVal, dest) {
    if (!A.ctx) return;
    try {
      const len = Math.max(1, Math.floor(A.ctx.sampleRate * dur));
      const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      const src = A.ctx.createBufferSource();
      src.buffer = buf;
      const f = A.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(Math.max(40, cutoff0), when);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, cutoff1), when + dur);
      const g = A.ctx.createGain();
      g.gain.value = gainVal;
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(when);
    } catch (err) { /* non critique */ }
  }

  function note(freq, when, dur, type, peak, dest) {
    if (!A.ctx) return;
    try {
      const o = A.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g);
      g.connect(dest);
      o.start(when);
      o.stop(when + dur + 0.05);
    } catch (err) { /* note perdue : non critique */ }
  }

  /* Démarrage au premier clic / touche (autoplay policy). */
  function onFirstGesture() {
    try { ensure(); } catch (err) { /* non critique */ }
  }

  function playStep(step, t) {
    if (!A.musicOn) return;
    const b = BASS[step];
    const l = LEAD[step];
    if (b) note(midiToFreq(b), t, STEP * 1.8, 'triangle', 0.5, A.musicGain);
    if (l) note(midiToFreq(l), t, STEP * 1.2, 'sine', 0.28, A.musicGain);
    if (step % 2 === 1) note(6000, t, 0.03, 'square', 0.012, A.musicGain);
  }

  function ready() {
    return !!(A.ctx && A.ctx.state === 'running');
  }

  /* Séquenceur à lookahead : planifie les notes un peu devant currentTime. */
  function scheduler() {
    if (!A.ctx) return;
    try {
      if (A.ctx.state === 'suspended') {
        /* pas de temps qui passe tant que le contexte est en pause : on resynchronise */
        A.nextStepTime = A.ctx.currentTime + 0.1;
        return;
      }
      while (A.nextStepTime < A.ctx.currentTime + 0.18) {
        playStep(A.step, A.nextStepTime);
        A.step = (A.step + 1) % 16;
        A.nextStepTime += STEP;
      }
    } catch (err) { /* la musique est non critique */ }
  }

  /* ---------- API publique ---------- */
  function setMusic(on) {
    if (!A._musicArmed) { A._musicArmed = true; on = true; }
    A.musicOn = !!on;
    lsSet(KEY.music, A.musicOn ? '1' : '0');
    if (A.musicOn) ensure(); // arme le contexte au premier geste (autoplay)
    if (A.musicGain) A.musicGain.gain.value = musicGainValue();
  }

  function setMusicVol(v) {
    A.musicVol = clamp01(v);
    lsSet(KEY.mv, String(A.musicVol));
    if (A.musicGain) A.musicGain.gain.value = musicGainValue();
  }

  function setSfx(on) {
    if (!A._sfxArmed) { A._sfxArmed = true; on = true; }
    A.sfxOn = !!on;
    lsSet(KEY.sfx, A.sfxOn ? '1' : '0');
    if (A.sfxOn) ensure(); // arme le contexte au premier geste (autoplay)
    if (A.sfxGain) A.sfxGain.gain.value = sfxGainValue();
  }

  function setSfxVol(v) {
    A.sfxVol = clamp01(v);
    lsSet(KEY.sv, String(A.sfxVol));
    if (A.sfxGain) A.sfxGain.gain.value = sfxGainValue();
  }

  function sfxGainValue() {
    return A.sfxOn ? Math.pow(A.sfxVol, 2) : 0;
  }

  function startMusic() {
    if (A.timer || !A.ctx) return;
    A.step = 0;
    A.nextStepTime = A.ctx.currentTime + 0.1;
    A.timer = setInterval(scheduler, 50);
  }

  ['pointerdown', 'keydown', 'click'].forEach((ev) => {
    document.addEventListener(ev, onFirstGesture, { capture: true, passive: true });
  });

  globalThis.G = globalThis.G || {};

  G.AUDIO = {
    ensure,
    setMusic,
    setSfx,
    setMusicVol,
    setSfxVol,
    sfx,
    ready,
    state: A
  };
})();

/* Poker Chrono v2 — couche FX 100 % canvas 2D (zéro dépendance, zéro fichier).
 * Canvas plein écran au-dessus du DOM, pointer-events:none.
 * Particules poolées (pool fixe, aucun GC par frame), compositing additif
 * (globalCompositeOperation='lighter'), sprites de lueur pré-rendus.
 * Mesure FPS intégrée (G.FX.fps()) pour la porte 7. */
(function () {
  'use strict';

  const cv = document.getElementById('fx');

  if (!cv) return;

  const x2d = cv.getContext('2d');

  if (!x2d) return;

  let H = 1;

  let W = 1;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    cv.width = Math.max(1, Math.floor(W * dpr));
    cv.height = Math.max(1, Math.floor(H * dpr));
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    x2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);

  resize();

  /* Sprites de lueur radiale pré-rendus (compositing additif). */
  const COLORS = {
    blue: '91,140,255',
    cyan: '102,222,255',
    gold: '255,209,102',
    green: '62,207,142',
    red: '255,107,107',
    white: '232,236,244'
  };

  const SPR = 64;

  const sprites = {};

  for (const k in COLORS) {
    const c = document.createElement('canvas');
    c.width = c.height = SPR;
    const g = c.getContext('2d');
    if (!g) continue;
    const grd = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
    grd.addColorStop(0, 'rgba(' + COLORS[k] + ',0.95)');
    grd.addColorStop(0.35, 'rgba(' + COLORS[k] + ',0.35)');
    grd.addColorStop(1, 'rgba(' + COLORS[k] + ',0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, SPR, SPR);
    sprites[k] = c;
  }

  let next = 0;

  const P = [];

  /* Pool fixe de particules : zéro allocation par frame. */
  const POOL = 240;

  for (let i = 0; i < POOL; i++) {
    P.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 10, col: 'gold', on: false });
  }

  let fps = 0;

  let frames = 0;

  /* Boucle rAF : physique + rendu additif + mesure FPS (fenêtre 1 s). */
  let last = (typeof performance !== 'undefined') ? performance.now() : 0;

  let fpsWindowStart = last;

  function burst(x, y, n, o) {
    for (let i = 0; i < n; i++) spawn(x, y, o);
  }

  function centerOf(sel) {
    const el = document.querySelector(sel);
    if (!el) return [W / 2, H / 2];
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(50, now - last);
    last = now;
    frames++;
    if (now - fpsWindowStart >= 1000) {
      fps = Math.round(frames * 1000 / (now - fpsWindowStart));
      frames = 0;
      fpsWindowStart = now;
    }
    x2d.clearRect(0, 0, W, H);
    let any = false;
    for (let i = 0; i < POOL; i++) if (P[i].on) { any = true; break; }
    if (!any) return;
    x2d.globalCompositeOperation = 'lighter';
    for (let i = 0; i < POOL; i++) {
      const p = P[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0004 * dt; // gravité légère
      p.vx *= Math.pow(0.999, dt); // friction
      const a = Math.max(0, p.life / p.max);
      x2d.globalAlpha = a;
      const s = p.size * (0.6 + 0.4 * a);
      x2d.drawImage(sprites[p.col] || sprites.gold, p.x - s / 2, p.y - s / 2, s, s);
    }
    x2d.globalAlpha = 1;
    x2d.globalCompositeOperation = 'source-over';
  }

  function spawn(x, y, o) {
    const p = P[next];
    next = (next + 1) % POOL;
    const ang = (o && o.angle !== undefined) ? o.angle : Math.random() * Math.PI * 2;
    const sp = (o && o.speed !== undefined) ? o.speed : (0.05 + Math.random() * 0.35); // px/ms
    p.x = x;
    p.y = y;
    p.vx = Math.cos(ang) * sp;
    p.vy = Math.sin(ang) * sp - (o && o.up || 0);
    p.max = p.life = (o && o.life !== undefined) ? o.life : (500 + Math.random() * 600);
    p.size = (o && o.size !== undefined) ? o.size : (6 + Math.random() * 10);
    p.col = (o && o.col) || 'gold';
    p.on = true;
  }

  requestAnimationFrame(loop);

  function shake() {
    const m = document.querySelector('main');
    if (!m) return;
    m.classList.remove('shake');
    void m.offsetWidth; // relance l'animation
    m.classList.add('shake');
    setTimeout(() => m.classList.remove('shake'), 700);
  }

  globalThis.G = globalThis.G || {};

  G.FX = {
    fps: () => fps,
    burst: burst,
    /* burst sur une cellule (swap). */
    cellBurst: (sel) => {
      const c = centerOf(sel);
      burst(c[0], c[1], 8, { col: 'cyan', speed: 0.15, life: 500, size: 8 });
    },
    /* burst sur tout un plateau (deal). */
    boardBurst: (sel) => {
      const c = centerOf(sel);
      burst(c[0], c[1], 26, { col: 'gold', speed: 0.3, life: 900, size: 12 });
    },
    /* fusée finale de victoire (rafales multi-points). */
    winBurst: () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => burst(
          W * (0.15 + 0.175 * i), H * 0.35, 30,
          { col: i % 2 ? 'gold' : 'cyan', speed: 0.45, life: 1400, size: 14, up: 0.12 }
        ), i * 120);
      }
    },
    loseBurst: () => {
      burst(W / 2, H / 2, 34, { col: 'red', speed: 0.35, life: 1000, size: 12 });
    },
    rowSparkle: (sel) => {
      const c = centerOf(sel);
      burst(c[0], c[1], 10, { col: 'green', speed: 0.12, life: 600, size: 7 });
    },
    shake: shake,
    poolSize: () => POOL,
    activeCount: () => {
      let n = 0;
      for (let i = 0; i < POOL; i++) if (P[i].on) n++;
      return n;
    }
  };
})();

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  /* ---------- glisser-déposer (humain uniquement) — v2.1.2 : Pointer Events ----------
   * L'API HTML5 DragEvents est inopérante en tactile : passage aux Pointer
   * Events (souris + tactile). Survol par document.elementFromPoint, dépôt
   * au pointerup. Seuil de 4 px : un simple clic sur une carte ne déclenche
   * ni swap ni message (équivalent du comportement DragEvents). */
  const DRAG_THRESHOLD_PX = 4;

  const G = globalThis.G;

  /* ---------- GO ! (v2.1, item 5 du brief) ----------
   * 1 pt / seconde restante, débloqué à 5 s, 2e clic idempotent,
   * l'IA ne fait jamais GO. */
  const GO_REASONS = {
    no_state: 'go_no_state',
    already: '', // idempotent : 2e clic silencieux
    over: 'go_over',
    not_running: 'go_not_running',
    too_early: 'go_too_early'
  };

  let lastAiMoveSeen = -1;

  /* Fix M1 : le chrono avance avec le temps réel (performance.now), jamais
   * avec un dt fourni depuis l'extérieur ; dt borné après suspension d'onglet. */
  let lastUiMs = 0;

  let lastWholeSec = null;

  const LS = {
    best: 'poker-chrono-best-score',
    colors: 'poker-chrono-colors'
  };

  /* v2 : mode de rendu des couleurs ('2' rouge/noir ou '4' par atout), persisté. */
  let colorMode = readLS(LS.colors, '2') === '4' ? '4' : '2';

  let pointerDrag = null; // { from, pointerId, x0, y0, moved }

  const REASONS = {
    invalid: 'reason_invalid',
    not_running: 'reason_not_running',
    out: 'reason_out',
    over: 'reason_over',
    self: 'reason_self'
  };

  let sirenPlayed = false;

  let state = null;
  let twoPlayer = false; // v2.2 P2P : mode 2 joueurs actif

  let uiTimer = null;

  /* v2 : seed aléatoire par partie réelle — CSPRNG (crypto.getRandomValues) si
   * disponible, sinon Math.random. Aucun seed fixe dans l'UI ; l'override seed
   * de G.createGame reste réservé aux portes (logique inchangée). */
  function applyColors() { document.body.dataset.colors = colorMode; }

  function cardEl(card, boardName, idx) {
    const d = document.createElement('div');
    d.className = 'card s' + card.s;
    d.dataset.idx = String(idx);
    const rank = document.createElement('span');
    rank.textContent = G.I18N.rankLabel(card.r);
    const suit = document.createElement('span');
    suit.className = 'suit';
    suit.textContent = G.SUIT_LABEL[card.s];
    d.append(rank, suit);
    if (boardName === 'human') {
      d.addEventListener('pointerdown', onCardPointerDown);
    }
    return d;
  }

  function cellAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('.cell') : null;
  }

  function clearPointerDrag() {
    document.querySelectorAll('.cell.drag-over').forEach((c) => c.classList.remove('drag-over'));
    document.querySelectorAll('.card.dragging').forEach((c) => c.classList.remove('dragging'));
    pointerDrag = null;
  }

  function endGame() {
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
    const r = state.result;
    $('#final-title').textContent =
      r.winner === 'human' ? G.I18N.t('win')
      : r.winner === 'ai' ? G.I18N.t('lose')
      : G.I18N.t('draw');
    renderBreakdown($('#rows-human'), r.rowsHuman);
    renderBreakdown($('#rows-ai'), r.rowsAI);
    const goBonus = r.bonus || 0;
    $('#final-scores').textContent =
      G.I18N.t('fs_human', { n: r.human }) +
      (goBonus > 0 ? G.I18N.t('fs_go', { b: goBonus, t: r.human + goBonus }) : '') +
      G.I18N.t('fs_ai', { n: r.ai });
    let best = 0;
    let record = false;
    try {
      // Fix M2 : valeur lue validée (Number.isFinite && >= 0), sinon 0 —
      // plus de NaN bloquant les records, record ré-armable.
      const parsedBest = Number(localStorage.getItem(LS.best));
      best = Number.isFinite(parsedBest) && parsedBest >= 0 ? parsedBest : 0;
      if (r.human > best) {
        best = r.human;
        record = true;
        localStorage.setItem(LS.best, String(best));
      }
    } catch (err) { /* stockage indisponible : on continue sans persistance */ }
    $('#best').textContent = record
      ? G.I18N.t('new_best', { n: best })
      : G.I18N.t('best', { n: best });
    $('#final').hidden = false;
    status(G.I18N.t('ended', { h: state.humanMoves, a: state.aiMoves }));
    /* v2 : dopamine finale — SFX (explosion victoire / chute défaite) + FX (secousse + burst). */
    if (G.AUDIO) {
      if (r.winner === 'human') G.AUDIO.sfx.victoire();
      else if (r.winner === 'ai') G.AUDIO.sfx.defaite();
      else G.AUDIO.sfx.egalite();
    }
    if (G.FX) {
      G.FX.shake();
      if (r.winner === 'human') G.FX.winBurst();
      else if (r.winner === 'ai') G.FX.loseBurst();
    }
    /* v2.1.2 : la pulsation du bouton de départ est ré-armée — une nouvelle
     * partie est à nouveau possible depuis le bouton #start. */
    $('#start').classList.add('pulse-glow');
  }

  function flashAiMove() {
    if (!state.lastAiMove) return;
    const cells = document.querySelectorAll('#board-ai .cell');
    for (const idx of [state.lastAiMove.i, state.lastAiMove.j]) {
      const cell = cells[idx];
      if (!cell) continue;
      cell.classList.remove('flash');
      void cell.offsetWidth; // relance l'animation
      cell.classList.add('flash');
    }
  }

  function msg(text) { $('#msg').textContent = text || ''; }

  function onCardPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // clic droit / molette
    if (pointerDrag) return; // un seul drag à la fois
    if (!state || !state.running || state.over) {
      msg(state && state.over ? G.I18N.t(REASONS.over) : G.I18N.t('start_first'));
      return;
    }
    const from = parseInt(e.currentTarget.dataset.idx, 10);
    if (Number.isNaN(from)) return;
    pointerDrag = { from, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* événement synthétique : capture indisponible */ }
    e.currentTarget.classList.add('dragging');
    e.preventDefault();
  }

  function onGoClick() {
    if (!state) return;
    const res = G.goNow(state);
    if (!res.ok) {
      if (res.reason !== 'already' && GO_REASONS[res.reason]) msg(G.I18N.t(GO_REASONS[res.reason]));
      return;
    }
    endGame();
  }

  function onPointerCancel(e) {
    if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
    clearPointerDrag(); // annulation (touche Esc / interruption) : pas de message,
    // parité avec l'ancien dragend silencieux.
  }

  function onPointerMove(e) {
    if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
    if (!pointerDrag.moved &&
        Math.hypot(e.clientX - pointerDrag.x0, e.clientY - pointerDrag.y0) >= DRAG_THRESHOLD_PX) {
      pointerDrag.moved = true;
    }
    const cell = cellAtPoint(e.clientX, e.clientY);
    document.querySelectorAll('.cell.drag-over').forEach((c) => {
      if (c !== cell) c.classList.remove('drag-over');
    });
    if (cell && cell.closest('#board-human')) cell.classList.add('drag-over');
  }

  function onPointerUp(e) {
    if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
    const from = pointerDrag.from;
    const moved = pointerDrag.moved;
    const cell = cellAtPoint(e.clientX, e.clientY);
    clearPointerDrag();
    if (!moved) return; // simple clic sur une carte : aucun dépôt
    if (!cell) { msg(G.I18N.t(REASONS.out)); return; }
    if (!cell.closest('#board-human')) { msg(G.I18N.t('ai_readonly')); return; }
    const to = parseInt(cell.dataset.idx, 10);
    if (Number.isNaN(to)) return;
    if (!state) return;
    if (state.over || !state.running) { msg(G.I18N.t(state.over ? REASONS.over : REASONS.not_running)); return; }
    const prevScores = [
      G.rowScore(state.boards.human[0]),
      G.rowScore(state.boards.human[1]),
      G.rowScore(state.boards.human[2])
    ];
    const res = G.humanSwap(state, from, to);
    if (!res.ok) { msg(G.I18N.t(REASONS[res.reason] || REASONS.invalid)); return; }
    renderBoard('human', { prevScores, flipIdx: [from, to] });
    updateScores();
    msg('');
    if (G.AUDIO) G.AUDIO.sfx.swap();
    if (G.FX) {
      G.FX.cellBurst('#board-human .cell[data-idx="' + from + '"]');
      G.FX.cellBurst('#board-human .cell[data-idx="' + to + '"]');
    }
    if (twoPlayer && G.P2P) G.P2P.onLocalHumanMove(from, to);
  }

  function readLS(key, dflt) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? dflt : v;
    } catch (err) { return dflt; }
  }

  function renderAll(opts) {
    renderBoard('human', opts);
    renderBoard('ai', opts);
    updateScores();
    updateTimer();
  }

  /* opts : { animateAll, prevScores, flipIdx } (v2 : rendu animé + nom de ligne). */
  function renderBoard(name, opts = {}) {
    const board = state.boards[name];
    const wrap = $(name === 'human' ? '#board-human .rows' : '#board-ai .rows');
    const prevScores = opts.prevScores || null;
    const flipIdx = opts.flipIdx || null;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    for (let r = 0; r < 3; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'row';
      const nm = document.createElement('span');
      nm.className = 'row-name';
      nm.textContent = rowLabel(board[r]);
      rowEl.appendChild(nm);
      for (let c = 0; c < 5; c++) {
        const idx = r * 5 + c;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.idx = String(idx);
        const card = cardEl(board[r][c], name, idx);
        if (opts.animateAll) {
          card.classList.add('deal-in');
          card.style.animationDelay = (idx * 25) + 'ms';
        }
        cell.appendChild(card);
        /* v2.1.2 : Pointer Events — survol et dépôt gérés au niveau
         * document (document.elementFromPoint), plus d'écouteurs par case. */
        rowEl.appendChild(cell);
      }
      /* v2 : lueur sur la ligne dont le score vient de se renforcer. */
      if (prevScores && G.rowScore(board[r]) > (prevScores[r] || 0)) rowEl.classList.add('glow');
      wrap.appendChild(rowEl);
    }
    /* v2 : flip rotateY sur les deux cellules échangées. */
    if (flipIdx) {
      for (const idx of flipIdx) {
        const card = wrap.querySelector('.cell[data-idx="' + idx + '"] .card');
        if (card) card.classList.add('flip');
      }
    }
  }

  /* Fix L1 : rendu 100 % createElement/textContent — aucune injection de
   * balises sur données dynamiques (labels issus de l'évaluateur). */
  function renderBreakdown(el, rows) {
    while (el.firstChild) el.removeChild(el.firstChild);
    rows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'row-line';
      div.textContent = G.I18N.t('row_line', { n: i + 1, label: G.I18N.handName(row.label), score: row.score });
      el.appendChild(div);
    });
  }

  /* Nom exact de la main d'une ligne : même fonction évaluatrice (G.evaluate5)
   * que le score — l'affichage et l'évaluation ne peuvent pas diverger. */
  function rowLabel(row) {
    return G.I18N.handName(G.isFull(row) ? G.evaluate5(row).label : 'Incomplet');
  }

  /* ---------- cycle de vie ---------- */
  function beginGame(difficulty, time, seed, frozen) {
    const opts = { difficulty, time };
    if (seed) opts.seed = seed;
    state = G.createGame(opts);
    if (frozen) state.aiFrozen = true; // v2.2 P2P : gel de l'IA locale
    G.start(state);
    lastUiMs = performance.now();
    lastAiMoveSeen = -1;
    lastWholeSec = Math.ceil(state.timeLeft / 1000);
    sirenPlayed = false;
    $('#final').hidden = true;
    $('#start').classList.remove('pulse-glow');
    msg('');
    status(G.I18N.t('running', { time, diff: G.I18N.diffLabel(difficulty) }));
    renderAll({ animateAll: true });
    if (G.AUDIO) { G.AUDIO.ensure(); G.AUDIO.sfx.deal(); }
    if (G.FX) { G.FX.boardBurst('#board-human'); G.FX.boardBurst('#board-ai'); }
    updateGoButton();
    if (uiTimer) clearInterval(uiTimer);
    uiTimer = setInterval(uiTick, 100);
  }

  function startGame() {
    twoPlayer = false;
    beginGame($('#diff').value, parseInt($('#time').value, 10), null, false);
  }

  /* v2.2 P2P : demarrage a partir du seed 128 bits partags (4xuint32).
   * L'IA locale est gelée ; les coups du distant arrivent via applyRemoteMove. */
  function start2PGame(seed) {
    twoPlayer = true;
    beginGame('normal', 30, seed, true);
    status(G.I18N.t('status_connected'));
  }

  /* v2.2 P2P : un swap du distant s'applique sur NOTRE plateau "ai" (le sien). */
  function applyRemoteMove(from, to) {
    if (!twoPlayer || !state) return;
    if (state.over || !state.running) return;
    const prevScores = [
      G.rowScore(state.boards.ai[0]), G.rowScore(state.boards.ai[1]), G.rowScore(state.boards.ai[2])
    ];
    const res = G.remoteSwap(state, from, to);
    if (!res.ok) { msg(G.I18N.t(REASONS[res.reason] || REASONS.invalid)); return; }
    renderBoard('ai', { prevScores, flipIdx: [from, to] });
    updateScores();
    if (G.FX) {
      G.FX.cellBurst('#board-ai .cell[data-idx="' + from + '"]');
      G.FX.cellBurst('#board-ai .cell[data-idx="' + to + '"]');
    }
  }

  function status(text) { $('#status').textContent = text; }

  function uiTick() {
    if (!state) return;
    const now = performance.now();
    let dt = lastUiMs > 0 ? now - lastUiMs : 100;
    lastUiMs = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 100;
    if (dt > 1000) dt = 100;
    /* v2 : scores IA AVANT le tick (le swap IA se joue à l'intérieur de tick)
     * pour pouvoir détecter la ligne qui se renforce. */
    const aiPrev = [
      G.rowScore(state.boards.ai[0]),
      G.rowScore(state.boards.ai[1]),
      G.rowScore(state.boards.ai[2])
    ];
    const info = G.tick(state, dt);
    updateTimer();
    updateGoButton();
    if (!state.over) {
      /* v2 : tic-tac chrono (10 dernières secondes) + sirène finale (≤ 5 s). */
      const sec = Math.ceil(state.timeLeft / 1000);
      if (sec !== lastWholeSec) {
        lastWholeSec = sec;
        if (sec >= 1 && sec <= 10 && G.AUDIO) G.AUDIO.sfx[sec % 2 === 0 ? 'tock' : 'tick']();
        if (sec <= 5 && !sirenPlayed && G.AUDIO) { sirenPlayed = true; G.AUDIO.sfx.sirene(); }
      }
    }
    if (state.aiMoves > lastAiMoveSeen) {
      lastAiMoveSeen = state.aiMoves;
      /* v2 : le plateau IA est re-rendu à chaque swap IA (cartes + nom de main
         à jour) — v1 ne flasheait que les cellules sans mettre les cartes à jour. */
      const mv = state.lastAiMove;
      renderBoard('ai', { prevScores: aiPrev, flipIdx: mv ? [mv.i, mv.j] : null });
      flashAiMove();
      updateScores();
      if (G.AUDIO) G.AUDIO.sfx.swapSoft();
      if (G.FX && mv) G.FX.cellBurst('#board-ai .cell[data-idx="' + mv.i + '"]');
    }
    if (info.ended) endGame();
  }

  function updateGoButton() {
    const b = $('#go');
    if (!b || !state) return;
    const elapsed = state.time * 1000 - state.timeLeft;
    b.disabled = state.over || state.goUsed || !state.running || elapsed < G.GO_MIN_MS;
  }

  function updateScores() {
    $('#score-human').textContent = String(G.boardScore(state.boards.human));
    $('#score-ai').textContent = String(G.boardScore(state.boards.ai));
  }

  function updateTimer() {
    const el = $('#timer');
    el.textContent = (state.timeLeft / 1000).toFixed(1) + ' s';
    el.classList.toggle('low', state.timeLeft <= 5000);
  }

  function writeLS(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (err) { /* stockage indisponible */ }
  }

  /* ---------- init ---------- */
  /* v2.1.2 : Pointer Events — écouteurs document (souris + tactile). */
  document.addEventListener('pointermove', onPointerMove);

  document.addEventListener('pointerup', onPointerUp);

  document.addEventListener('pointercancel', onPointerCancel);

  $('#start').addEventListener('click', startGame);

  $('#go').addEventListener('click', onGoClick);

  $('#replay').addEventListener('click', startGame);

  /* v2 : toggle de rendu 2 ↔ 4 couleurs (persisté, rendu uniquement). */
  const colorsSel = $('#colors');

  colorsSel.value = colorMode;

  applyColors();

  colorsSel.addEventListener('change', (e) => {
    colorMode = e.target.value === '4' ? '4' : '2';
    writeLS(LS.colors, colorMode);
    applyColors();
  });

  /* v2.1.2 flagfix : menu de langue custom (drapeaux).
   * Le <select> natif ne rend pas les drapeaux (emoji Regional Indicator) dans
   * sa popup sous Windows (Opera PC) — menu DOM custom ARIA à la place.
   * Persistance + <html lang> restent inchangés, toujours via G.I18N. */
  const LANG_LABELS = {
    de: '🇩🇪 Deutsch',
    en: '🇬🇧 English',
    es: '🇪🇸 Español',
    fr: '🇫🇷 Français',
    it: '🇮🇹 Italiano'
  };

  const langBtn = $('#lang-btn');
  const langList = $('#lang-list');

  function syncLangBtn() {
    langBtn.textContent = LANG_LABELS[G.I18N.getLang()] || LANG_LABELS.en;
  }

  function setLangMenuOpen(open) {
    langBtn.setAttribute('aria-expanded', String(open));
    langList.hidden = !open;
  }

  syncLangBtn();

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setLangMenuOpen(langList.hidden);
  });

  langList.addEventListener('click', (e) => {
    const opt = e.target.closest('li[data-lang]');
    if (!opt) return;
    if (G.I18N.setLang(opt.dataset.lang)) {
      syncLangBtn();
      renderAll();
    }
    setLangMenuOpen(false);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#lang')) setLangMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setLangMenuOpen(false);
  });

  /* v2 : contrôles audio (toggles ON/OFF + sliders séparés, persistés). */
  if (G.AUDIO) {
    const musicBtn = $('#music-toggle');
    const sfxBtn = $('#sfx-toggle');
    const musicVol = $('#music-vol');
    const sfxVol = $('#sfx-vol');
    function syncAudioUI() {
      musicBtn.classList.toggle('on', G.AUDIO.state.musicOn);
      musicBtn.setAttribute('aria-pressed', String(G.AUDIO.state.musicOn));
      sfxBtn.classList.toggle('on', G.AUDIO.state.sfxOn);
      sfxBtn.setAttribute('aria-pressed', String(G.AUDIO.state.sfxOn));
    }
    syncAudioUI();
    musicBtn.addEventListener('click', () => { G.AUDIO.setMusic(!G.AUDIO.state.musicOn); syncAudioUI(); });
    sfxBtn.addEventListener('click', () => { G.AUDIO.setSfx(!G.AUDIO.state.sfxOn); syncAudioUI(); });
    musicVol.value = String(Math.round(G.AUDIO.state.musicVol * 100));
    sfxVol.value = String(Math.round(G.AUDIO.state.sfxVol * 100));
    musicVol.addEventListener('input', () => G.AUDIO.setMusicVol(Number(musicVol.value) / 100));
    sfxVol.addEventListener('input', () => G.AUDIO.setSfxVol(Number(sfxVol.value) / 100));
  }

  /* v2 : hook de test additif — donne aux portes accès aux fonctions de rendu
   * (n'affecte ni la logique ni le barème). */
  G.UI = {
    renderBoard, renderAll, updateScores, updateTimer,
    startGame, endGame, rowLabel, start2PGame, applyRemoteMove,
    colorMode: () => colorMode,
    setColors: (m) => {
      colorMode = m === '4' ? '4' : '2';
      writeLS(LS.colors, colorMode);
      if (colorsSel) colorsSel.value = colorMode;
      applyColors();
    },
    /* Fix H2 : snapshots lecture seule (deep copy) de l'état vivant, qui
     * reste dans la closure — aucune mutation possible depuis l'extérieur. */
    boards: () => state ? JSON.parse(JSON.stringify(state.boards)) : null,
    board: (who) => (state && state.boards[who])
      ? JSON.parse(JSON.stringify(state.boards[who])) : null,
    deck: () => state ? JSON.parse(JSON.stringify(state.deck)) : null,
    result: () => (state && state.result) ? JSON.parse(JSON.stringify(state.result)) : null,
    humanMoves: () => state ? state.humanMoves : null,
    aiMoves: () => state ? state.aiMoves : null,
    stateInfo: () => state
      ? { difficulty: state.difficulty, timeLeft: state.timeLeft, running: state.running,
          over: state.over, humanMoves: state.humanMoves, aiMoves: state.aiMoves,
          ended: state.result !== null }
      : null,
    /* v2.1 — GO ! : état du chrono + résultat (test / automatisation) */
    goInfo: () => {
      if (!state) return null;
      const human = state.result ? state.result.human : G.boardScore(state.boards.human);
      const bonus = state.result ? state.result.bonus : 0;
      return {
        elapsedMs: state.time * 1000 - state.timeLeft,
        over: state.over,
        human,
        bonus,
        totalHuman: human + bonus
      };
    }
  };

  /* Init : partie réelle (seed 128 bits CSPRNG interne), aucun handle public. */
  state = G.createGame({ difficulty: 'normal', time: 30 });

  renderAll();
})();

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
  const VERSION = 1;

  // Session active : un seul 2P à la fois par page.
  let currentPeer = null;
  let role = null; // 'host' | 'guest' | null

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
      seed: seed.slice(),
      d: difficulty,
      t: time,
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
    const t = TIME_OPTIONS.indexOf(msg.t) >= 0 ? msg.t : null;
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
    if (!msg || msg.t !== 'move') return { ok: false, reason: 'bad_msg' };
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
  function connect(opts) {
    const o = Object.assign({ host: '127.0.0.1', port: 9000, secure: false }, opts || {});
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
  function setStatus(key) {
    const el = document.getElementById('p2p-status');
    if (!el) return;
    try { el.textContent = G.I18N.t(key); } catch (err) { /* i18n indispo */ }
  }

  // ---- Messages entrants (hôte OU visiteur) ----
  function onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'init' && role === 'guest') {
      const v = validateInit(msg);
      if (!v.ok) { setStatus('status_err_seed_mismatch'); return; }
      G.UI.start2PGame(msg.seed, msg.d, msg.t);
      setStatus('status_connected');
    } else if (msg.t === 'move') {
      const v = validateMove(msg);
      if (!v.ok) return; // coup invalide : ignoré, jamais appliqué tel quel
      G.UI.applyRemoteMove(msg.f, msg.to);
    }
  }

  // ---- Flows hôte / visiteur (appels des boutons 2P) ----
  function host(code, difficulty, time) {
    if (currentPeer) return; // déjà en session 2P
    role = 'host';
    setStatus('status_connecting');
    currentPeer = connect({ hostId: code });
    currentPeer.p2p.on(onMessage);
    currentPeer.p2p.onError(() => { setStatus('status_err_no_server'); });
    currentPeer.p2p.ready.then(() => {
      // canal ouvert (le visiteur est connecté) : génère la graine, envoie
      // l'init et démarre la partie (les deux côtés, mêmes 15 cartes).
      const seed = genSeed();
      currentPeer.p2p.send(buildInit(seed, difficulty, time));
      G.UI.start2PGame(seed, difficulty, time);
      setStatus('status_connected');
    });
  }

  function join(code) {
    if (currentPeer) return; // déjà en session 2P
    if (!code) { setStatus('status_err_no_server'); return; }
    role = 'guest';
    setStatus('status_connecting');
    currentPeer = connect({ joinId: code });
    currentPeer.p2p.on(onMessage);
    currentPeer.p2p.onError(() => { setStatus('status_err_no_server'); });
    currentPeer.p2p.ready.then(() => {
      // canal ouvert : attend l'init de l'hôte (traité dans onMessage).
      setStatus('status_waiting_host');
    });
  }

  // Hook : l'UI (ui.js -> onPointerUp) appelle ce hook après un swap humain
  // local réussi ; on relaie le coup vers l'adversaire distant.
  function onLocalHumanMove(from, to) {
    if (currentPeer && currentPeer.p2p) currentPeer.p2p.send({ t: 'move', f: from, to: to });
  }

  // ---- Câblage des boutons 2P (DOM présent au chargement) ----
  function wire() {
    const openBtn = document.getElementById('p2p-open');
    const panel = document.getElementById('p2p-panel');
    const hostBtn = document.getElementById('p2p-host');
    const joinBtn = document.getElementById('p2p-join');
    const codeInput = document.getElementById('p2p-code');
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
    onLocalHumanMove,
    _setStatus: setStatus,
    _currentPeer: () => currentPeer
  };

  wire();
})();
