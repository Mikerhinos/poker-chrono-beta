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
