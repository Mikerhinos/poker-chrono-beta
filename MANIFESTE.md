# MANIFESTE — Poker Chrono v2.2.2 (état final, 2026-10-23, P2P : handshake Ready bidirectionnel + countdown synchronisé hôte→visiteur)

**État** : commit parent **`2adc36e`** (v2.2.1), patch v2.2.2 (24 fichiers modifiés + 26 preuves `test/results/v2.2.2/`, non poussé — NI4NI pousse la beta après revue). `G.version` = **2.2.2** (seule occurrence, `js/game.js` ligne 352). Suite complète : **23/23 RC=0** (22 node + 1 ESLint, fin 2026-10-23 12:39:59 — `test/results/v2.2.2/suite-run-v222.txt`) ; réserve porte 8 : voir § Résultats. `all.js` = concat **7 scripts** dans l'ordre des `<script>` d'index.html (`deck, game, i18n, audio, fx, ui, net`), séparateur `\n` — **95 831 octets, 0 CR**. `peerjs-server` reste **dev-only** dans `package.json` (jamais servi en prod).

**Périmètre (48 fichiers en table + 5 preuves v2.2.2 + 3 fichiers hors table 48)** : les 48 du périmètre v2.2 (app + suites + docs, table ci-dessous) + 5 preuves du run v2.2.2 :
- 49. `test/results/v2.2.2/suite-run-v222.txt` (`c45362c18b31cab7d95f03b268cbeb26914929bf34407e466f96a937c05dae6b`)
- 50. `test/results/v2.2.2/eslint-p23.log` (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, fichier vide = 0 erreur)
- 51. `test/results/v2.2.2/g2g4-bench900.log` (`c4e13376da185b0ba6b93374c291304c6fa6700bdb0997136f2521a9444dcc85`)
- 52. `test/results/v2.2.2/bench900-normalized.sha256` (`99b9468919305812e5082101c03b23dff7aab4b7ebdfd8200976133854dfd0de`)
- 53. `test/results/v2.2.2/g16-p2p.log` (`6bcf54b8b5be64947b8410901d5f725947ca29c8390e1dd18b1eb7ae5aa75042`)

**Hors table 48 (v2.2.x, hashés ci-dessous)** : `./js/net.js` (`246f20e726d2aa799f4fd77bdec39feedb98ae631ec6b89588afcf2c81f61b3e`), `./test/g16-p2p.mjs` (`1a27b32ad68ef138e5103d00952e2a1aab5bac9b4eca72aefda8dee40257cf9d`, réécrit en LF), `./all.js` (`964cb582f6ec9d1ee226eb8195b32cdebfc4bca568643546dbf14cb494d62957`, reconstruite : 7 scripts dans l'ordre des `<script>` d'index.html, 95 831 o, 0 CR, ESLint porte 23 RC=0).

**Hors périmètre** : `node_modules/`, `server/` (inexistant), `.gitignore`, `PROGRESS.md`, `PLAN-MULTIJOUEUR-2JOUERS.md`, `PROJET-POKER-CHRONO.md`, `STATE-CARD-TASK-V22C-READY-SYNC-20261022-01.md` (carte de travail, non livrée), les preuves v2.1.2/v2.1.2-flagfix/v2.2-a/v2.2-flagfix/v2.2.1, `MANIFESTE.md` (auto-référence impossible), `sha256-final-v212.txt` (fichier machine de ce manifeste).

## Résultats ancrés à l'état final

| Mesure | Résultat |
|---|---|
| Taille totale HTML+CSS+JS (porte 8) | **262 752 octets** — **1 FAIL** sur cette check : dépassement du plafond 256 Ko de 608 o (fenêtre 100–256 Ko) ; croissance feature v2.2.2 (`js/net.js` +153 lignes, bouton `#p2p-ready`, i18n +4 clés × 5). Porte 8 : 26 ok / 1 FAIL, RC porte = 0 (le gate ne propage pas ce check au code de sortie). Décision à trancher : plafond 288 Ko (précédent 200→256 Ko) ou réduction. |
| Bench 900 (sha256 normalisé, wall → 111.5) | `312841cd81911460d998d4b4d6a026cfab11b4c7efca4559a8443bc828bc357a` — identique à la référence v2.1.2 / v2.2 / v2.2.1 (aucune régression de simulation) |
| Portes (g1–g16, w3c, go-logic, go-ui, go-ui-85, max-board) | **23/23 RC=0** (porte 8 : voir ligne ci-dessus) ; g16 : **31 checks OK, FAILURES 0**, vrai chemin hôte→visiteur |
| ESLint porte 23 (`all.js` 95 831 o, flat config v2.2-a, 7 scripts + global `Peer`) | **RC=0, 0 erreur / 0 warning** (sortie vide) |
| i18n (porte 15) | **30 ok / 0 fail** (parité 5 langues, persistance localStorage) |
| Deck 52 cartes | verbatim inchangé (`js/deck.js` non modifié par le patch) |

## Table des 48 sha256 (re-lecture binaire de l'arbre final — 48/48 re-vérifiés NI4NI 2026-10-23)

| n | Chemin | sha256 |
|---|---|---|
| 1 | `./ANCRE-PARTS.md` | `ba9e1555316b0e88b97df62c844ecb35d3aa6ee7fc9a3ce666fffe097eb21a2c` |
| 2 | `./COMPT-RENDU.md` | `3b669faff1b9166cb32c0c70d272fb67f0fed6655acc16cffbc0437ff71ad9d4` |
| 3 | `./css/anim.css` | `f8beff71bf0e2936f2f87f34444ee481b9d4f0f19a79bfe576f157e2f50d569a` |
| 4 | `./css/base.css` | `4c62804f7834209356f1385115973f21bdbca35e27bee695af5df9f9f36b7cc4` |
| 5 | `./css/fonts.css` | `0f697d3146f6c7e4a818ea7f25458ab62a60713543049b3c6aa754659709f68a` |
| 6 | `./css/theme.css` | `bda14af5e8afe1efb09fab88490bea039e281b235654469c099856fa37d2da89` |
| 7 | `./index.html` | `d861bebb8975afd945e7c914d78dda155b6854f62004685344e7b4e5c89d5a90` |
| 8 | `./js/audio.js` | `e2d144421e0bc1454eb328b50c9eace97f73e7b3d9a21fec1bffafecc5252759` |
| 9 | `./js/deck.js` | `f7f02ef31fb56880e2a7caf2c10302bfa24d34c2bfca9b602cad324c1f50df73` |
| 10 | `./js/fx.js` | `e388cdcd4a30fd7b6df8bd81fd4333a7bbf2a6621ea5c5ce11c732e5e92fe374` |
| 11 | `./js/i18n.js` | `239ff6875a7fab91d1d694d985158ec298f949e1f2af080e75a15a3fbe259116` |
| 12 | `./js/game.js` | `7eec15dfa8e193d4a141ae2a4d42b58b97d6312d86d13c54ee92957f21e3d8f7` |
| 13 | `./js/ui.js` | `fb7c16c79ddfbfb28eb88351adc4561be83a9e6cabcffb785579ed1254758a79` |
| 14 | `./README.md` | `bec68f65b72959c1958d0243c1cbf652118e6fc4debde26be56c743732b96476` |
| 15 | `./test/cdp.mjs` | `a51609ea357a4958d36b988fd175bcd924704c3b9fd2edec63e2c8531f9d419b` |
| 16 | `./test/diag-p4.mjs` | `be4efbe80888e11f1544486ce1515877cd05e2fac723135c3e6cd6c650080485` |
| 17 | `./test/g11-noscore.mjs` | `2546c4a88f96807965282bf514d41e52f1a3fef3a01070fb27ab7177d4b90e7b` |
| 18 | `./test/g12-seed.mjs` | `0879b4d91aeb0701f0f9e3c0d46d753a2d9264611668d79340375aaa830ac3d7` |
| 19 | `./test/g13-best.mjs` | `be386ac368435a5fa95f49c559cab7b5a4838f46ec9c69e72b276756760f372e` |
| 20 | `./test/g14-innertest.mjs` | `d555ba6e466e97c81b4ce0b44eb09c3da5935c5916a001597ee6a0a758e02de4` |
| 21 | `./test/g15-i18n.mjs` | `29cdd3a2abb64bfc57051fbac02a889558cec4a83d679c45318139171b1ec4c9` |
| 22 | `./test/g1-result.txt` | `b48db4e2b37ee9ea23654684ea5d51689ef2a5569c6f45eba5042b29f428c323` |
| 23 | `./test/g1-scores.js` | `d1c06237b5c6e08b1de7b3c59725add5888a90ca374137d670e01610c28c39ac` |
| 24 | `./test/g2g4-headless.js` | `1f63e9041a75fcda647823fa9628fddfdcb73b06149b111d2652640df8aeab08` |
| 25 | `./test/g2g4-result.txt` | `33e6d93ffaa05b6f225b5c20a2cfd2578bb522486177e086b4809a63ffa87f81` |
| 26 | `./test/g3-result.txt` | `fab9d59b09f102685a38ad452a6f65d48fe08c5079f9fc0303a2644d6c83d60d` |
| 27 | `./test/g3-swap.js` | `28f8eabdff190ae2a4ca455d1ad1336ff93d15930cbc943fdbf47043923cd90e` |
| 28 | `./test/g4-colors.mjs` | `fb99e4cc466aaf4cf9429b37aeb6bd3b549650867a831052922a95ef3ff973a2` |
| 29 | `./test/g5-result.txt` | `729413a0b3884e03f504765d104bed654d855d7116ce78fb657579830aa4fab8` |
| 30 | `./test/g5-rownames.mjs` | `07bb9ef3e5d3f14275190d81c719e8e98ef3a41d6b993cdd20a1de34d40c4ec4` |
| 31 | `./test/g5-run.mjs` | `4e8626b9f6f754406018fa088c8f62d55e28299c260bcdc6281adb8f82760e50` |
| 32 | `./test/g5-ui.mjs` | `603ca06405fae3afeb16a82ba5dea9ee84a3423f4ff611e8fafe27e92e985945` |
| 33 | `./test/g6-audio.mjs` | `4fec1af14559f797392ad715464f052ae561965694b7e496e811ef117180baa3` |
| 34 | `./test/g7-fx.mjs` | `d08801c5c13fc56289157d9e94bfa6145d647ab3a0851df749add145ba3072c0` |
| 35 | `./test/g8-scan.mjs` | `765e1e9939a032cd11931b05b1f9c90c6d8d813e77b76b35c93cb7a9b4c26deb` |
| 36 | `./test/g9-boards.mjs` | `19cb36e3fc1feca56fca191cbb9292de009310a78c499f02d1e3e0ae02a9ab1f` |
| 37 | `./test/go-logic.mjs` | `349b3d1018d0e31402cd23e2ef561d778ad55acce79573ed4732e27bced65b54` |
| 38 | `./test/go-ui.mjs` | `d964383c651dfe90177b5d341b5a0aae507b671cfb71f78943fd0399a30fdc9f` |
| 39 | `./test/go-ui-85.mjs` | `723e87294e516f4d8738fbefe37015f57b2648e38fb5570392f97099bae9adfe` |
| 40 | `./test/lib.mjs` | `b0d8d59c552fcce2ce381a71ff8c3dbe48a07628a6abf6bb20d38fa9d6b01954` |
| 41 | `./test/max-board.mjs` | `a76d3d61efb02f989568aef63435e76c6c02ebf0687c816ad4fcb2d6a4e36f02` |
| 42 | `./test/poc-repro.mjs` | `dad8c510ff5be87ddf4c11fa0c5e6932ef2522d7ebc7ebbc3e17c3322100c553` |
| 43 | `./test/reactivity.mjs` | `026f5f3d8534be9d3df2617098b86e5f3f2b0eb7326559aaea47d9f4ae64a61a` |
| 44 | `./test/run-headless.mjs` | `e5c0f71c2ef1f866f8bd1b984acb4afd00c9f500be8aa6b98605a62830c86670` |
| 45 | `./test/scaffold-v21/g12-seed.mjs` | `758876fcfd037093a46d6c384bdc6043515a53759befa5a8425170f2c4a4f53b` |
| 46 | `./test/scaffold-v21/g3-swap.js` | `e19040f74e0cdb1d41614247d3abfc230ef0f0d79aafc3f95e686b72fbea62d3` |
| 47 | `./test/scaffold-v21/poc-repro.mjs` | `f7660f0d29738255d58fe787265451453ce406f5eaf6d28c710a96f364a20e96` |
| 48 | `./test/w3c.mjs` | `a1a4c755e8db9115789925539b8a3a8473f734ee1c81fb9f83c5c0f784773679` |

## PATCH v2.2.2 — P2P : handshake Ready bidirectionnel + countdown synchronisé hôte→visiteur + champ `type` init + propagation options (2026-10-23, TASK-V22C-READY-SYNC-20261022-01)

**Changements** (24 fichiers modifiés, + 26 preuves) :
1. `js/net.js` : protocole `pc2p/v1` — handshake Ready bidirectionnel (`markReady`/`markPeerReady`, `maybeDeal` : deal unique quand les 2 sont prêts, `resetHandshake` à la réinitialisation), champ **`type:'init'`** dans l'init (fix de la cause racine du non-départ visiteur), options hôte propagées (seed/difficulté/temps via `seedRef`), countdown « 3...2...1...GO ! » **synchronisé** : l'hôte envoie `{type:'countdown', n}` à chaque tick, le visiteur observe la même séquence.
2. `js/ui.js` : `start2PGame(seed, difficulty, time)` — les options hôte sont propagées à `beginGame` (fix du hardcode normal/30 s).
3. `index.html` : `<button id="p2p-ready" class="p2p-btn" data-i18n="p2p_ready_btn" hidden>` dans `#p2p-panel` (ligne 61), visible des 2 côtés.
4. `js/i18n.js` : 4 clés × 5 langues (fr, de, en, es, it) : `p2p_ready_btn`, `p2p_wait_ready`, `p2p_wait_opp`, `p2p_cd`.
5. `js/game.js` : `G.version` → `2.2.2` (seule occurrence, ligne 352).
6. `all.js` : reconstruite (7 modules, `\n`) — 95 831 o, 0 CR.
7. `test/g16-p2p.mjs` : réécriture complète — vrai chemin hôte→visiteur (2 onglets CDP, A = hôte, B = visiteur, broker `peerjs-server` 127.0.0.1:9000), 31 checks, FAILURES 0 : bouton Ready des 2 côtés, départ seulement après les 2 clicks, countdown 3→2→1 observé **des 2 côtés**, options hôte propagées, deal miroir hôte == visiteur, coup humain du visiteur (Pointer Events) → `onLocalHumanMove` → `remoteSwap` côté hôte, invariants, « Connected » des 2 côtés.
8. `test/cdp.mjs` : multi-onglets (`fetchList`, `connectTab(url, matchFn, tries)`).
9. Pins version 2.2.2 : 11 tests (`g4-colors`, `g5-rownames`, `g5-ui`, `g6-audio`, `g7-fx`, `g9-boards`, `g11-noscore`, `g12-seed`, `g13-best`, `g14-innertest`, `poc-repro`).
10. Régénérés par la suite v2.2.2 : `test/results/porte-13.log`, `porte-14.log`, `porte-16.log`, `COMPT-RENDU.md` (§ « PATCH v2.2.2 »), `sha256-final-v212.txt` (48 hashs réalignés, format machine).

**Preuves** : `test/results/v2.2.2/` (26 fichiers : 49–53 ci-dessus + logs de portes + `progress.log`). Détails, anomalies et commande par commande : `COMPT-RENDU.md` § « PATCH v2.2.2 ».

## Procédure
1. `git clone https://github.com/Mikerhinos/poker-chrono-beta.git poker-chrono` (branche `main` = commit v2.2.2 après push NI4NI).
2. `git config core.autocrlf false` + checkout forcé (arbres LF — 0 CR sur l'ensemble du périmètre v2.2.2 : 48 table + 3 hors table).
3. `npm install --no-save --no-package-lock eslint@9.39.2 @eslint/js@9.39.2 peerjs@1.5.5 peerjs-server@0.2.9` (versions épinglées, aucun lock commité, `peerjs-server` dev-only).
4. Lancer la suite des 23 commandes (22 node + 1 ESLint) : `test/results/v2.2.2/suite-run-v222.txt` — headless Chrome via `test/run-headless.mjs` (CDP 9441–9452 ; g16 : 9347 + broker local 127.0.0.1:9000 spawné par le gate), bench 900 headless, ESLint flat config v2.2-a.
5. Recalculer les 48 sha256 par re-lecture binaire + comparer à la table ci-dessus (et à `sha256-final-v212.txt`).
