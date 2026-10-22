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
      status_timeout: 'Keine Verbindung nach 30 s — bitte Solo-Modus wählen.',
      p2p_solo_btn: 'Solo spielen',
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
      status_timeout: 'No connection within 30 s — choose solo mode.',
      p2p_solo_btn: 'Play solo',
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
      status_timeout: 'Sin conexión en 30 s — elige el modo solo.',
      p2p_solo_btn: 'Jugar en solitario',
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
      status_timeout: 'Pas de connexion après 30 s — passez en mode solo.',
      p2p_solo_btn: 'Jouer en solo',
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
      status_timeout: 'Nessuna connessione entro 30 s — scegli la modalità solo.',
      p2p_solo_btn: 'Gioca da solo',
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
