# MANIFESTE — Poker Chrono v2.2.3 (état final, 2026-10-24, P2P : gate Play 2×Ready + Rejouer = proposition acceptée + libellé « Player 2 »)

**État** : commit parent **`0f01a65`** (v2.2.2), patch v2.2.3 (fichiers modifiés ci-dessous + 6 preuves `test/results/v2.2.3/`, non poussé — NI4NI pousse la beta après revue). `G.version` = **2.2.3** (seule occurrence, `js/game.js`). Suite complète : **23/23 RC=0** (22 node + 1 ESLint, fin 2026-10-24 16:19:05 — `test/results/v2.2.3/suite-run-v223.txt`) ; réserve porte 8 : voir § Résultats. `all.js` = concat **7 scripts** dans l'ordre des `<script>` d'index.html (`deck, game, i18n, audio, fx, ui, net`), séparateur `\n` — **101 612 octets, 0 CR**. `peerjs-server` reste **dev-only** dans `package.json` (jamais servi en prod).

**Périmètre (48 fichiers en table + 5 preuves v2.2.2 + 5 preuves v2.2.3 + 3 fichiers hors table 48)** : les 48 du périmètre v2.2 (app + suites + docs, table ci-dessous) + 5 preuves du run v2.2.2 :
- 49. `test/results/v2.2.2/suite-run-v222.txt` (`c45362c18b31cab7d95f03b268cbeb26914929bf34407e466f96a937c05dae6b`)
- 50. `test/results/v2.2.2/eslint-p23.log` (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, fichier vide = 0 erreur)
- 51. `test/results/v2.2.2/g2g4-bench900.log` (`c4e13376da185b0ba6b93374c291304c6fa6700bdb0997136f2521a9444dcc85`)
- 52. `test/results/v2.2.2/bench900-normalized.sha256` (`99b9468919305812e5082101c03b23dff7aab4b7ebdfd8200976133854dfd0de`)
- 53. `test/results/v2.2.2/g16-p2p.log` (`6bcf54b8b5be64947b8410901d5f725947ca29c8390e1dd18b1eb7ae5aa75042`)

+ 5 preuves du run v2.2.3 :
- 54. `test/results/v2.2.3/suite-run-v223.txt` (`e8d8d897a8cf413634309d6584d284b216dba4fc9d65774dd6f409571b5eb072`)
- 55. `test/results/v2.2.3/eslint-p23.log` (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, fichier vide = 0 erreur)
- 56. `test/results/v2.2.3/g2g4-bench900.log` (`1db0edc27914593f0dc1666b046fc7c13929610f876ef4b1fb4dd5d9b0fdc6f3`)
- 57. `test/results/v2.2.3/bench900-normalized.sha256` (`8fc8f8ff05d94ee1b71b7bed68ad0446e857fdabc83f211700f1ae2857686f08`) — hash normalisé `312841cd…` identique à la référence v2.1.2
- 58. `test/results/v2.2.3/g16-p2p.log` (`c226545d81c2c61500afc1d6fbcfb7dbf4ddd6515c975c46ea95d59fcbe5654a`) — 45 checks OK, FAILURES 0

**Hors table 48 (v2.2.x, hashés ci-dessous)** : `./js/net.js` (`9d9b8396e1a0e855dff46bafc4dc9a93d618b107f7cb0950c37e129ab06ce1b4`), `./test/g16-p2p.mjs` (`342bf133c1c844e436290041867100bfd344fc12157ddfc5bcdbfdf7ee01dfea`, 45 checks), `./all.js` (`5517f095892e3fa21ca568baefec62c5c3c43dfe907ab067f750ef79a88f0d76`, reconstruite : 7 scripts dans l'ordre des `<script>` d'index.html, 101 612 o, 0 CR, ESLint porte 23 RC=0).

**Hors périmètre** : `node_modules/`, `server/` (inexistant), `.gitignore`, `PROGRESS.md`, `PLAN-MULTIJOUEUR-2JOUERS.md`, `PROJET-POKER-CHRONO.md`, `STATE-CARD-TASK-V223-BUGS-2P-20261024-01.md` (carte de travail, non livrée), les preuves v2.1.2/v2.1.2-flagfix/v2.2-a/v2.2-flagfix/v2.2.1/v2.2.2, `MANIFESTE.md` (auto-référence impossible), `sha256-final-v212.txt` (fichier machine de ce manifeste).

## Résultats ancrés à l'état final

| Mesure | Résultat |
|---|---|
| Taille totale HTML+CSS+JS (porte 8) | **268 533 octets** — **1 FAIL** sur cette check : dépassement du plafond 256 Ko de 12 409 o (fenêtre 100–256 Ko) ; RC=0 conservé (FAIL interne à la porte, même comportement que v2.2.2 — 262 752 o, +5 781 o dus au flow 2P : protocole rematch, 10 clés i18n, gate B1, libellés B3) |
| Bench 900 (sha256 normalisé, wall → 111.5) | `312841cd81911460d998d4b4d6a026cfab11b4c7efca4559a8443bc828bc357a` — identique à la référence v2.1.2 / v2.2 / v2.2.1 / v2.2.2 (logique du jeu inchangée) |
| Portes (g1–g16, w3c, go-logic, go-ui, go-ui-85, max-board) | **23/23 RC=0** (porte 8 : voir ligne ci-dessus) ; g16 : **45 checks OK (31 baseline + 14 B1/B2/B3), FAILURES 0** ; g15 i18n : FAILURES 0 (parité 5 langues avec 10 nouvelles clés) |
| ESLint porte 23 (`all.js` 101 612 o, flat config v2.2-a, 7 scripts + global `Peer`) | **RC=0, 0 erreur / 0 warning** (sortie vide) |
| Deck 52 cartes | verbatim inchangé (`js/deck.js` non modifié par le patch) |

## Table des 48 sha256 (re-lecture binaire de l'arbre final — 48/48 recalculés K0D3R 2026-10-24)

| n | Chemin | sha256 |
|---|---|---|
| 1 | `./ANCRE-PARTS.md` | `ba9e1555316b0e88b97df62c844ecb35d3aa6ee7fc9a3ce666fffe097eb21a2c` |
| 2 | `./COMPT-RENDU.md` | `33eefd8935cf49d5951e531d9b58b010756a75249a6c354e6e382ee26df030f6` |
| 3 | `./css/anim.css` | `f8beff71bf0e2936f2f87f34444ee481b9d4f0f19a79bfe576f157e2f50d569a` |
| 4 | `./css/base.css` | `4c62804f7834209356f1385115973f21bdbca35e27bee695af5df9f9f36b7cc4` |
| 5 | `./css/fonts.css` | `0f697d3146f6c7e4a818ea7f25458ab62a60713543049b3c6aa754659709f68a` |
| 6 | `./css/theme.css` | `bda14af5e8afe1efb09fab88490bea039e281b235654469c099856fa37d2da89` |
| 7 | `./index.html` | `d861bebb8975afd945e7c914d78dda155b6854f62004685344e7b4e5c89d5a90` |
| 8 | `./js/audio.js` | `e2d144421e0bc1454eb328b50c9eace97f73e7b3d9a21fec1bffafecc5252759` |
| 9 | `./js/deck.js` | `f7f02ef31fb56880e2a7caf2c10302bfa24d34c2bfca9b602cad324c1f50df73` |
| 10 | `./js/fx.js` | `e388cdcd4a30fd7b6df8bd81fd4333a7bbf2a6621ea5c5ce11c732e5e92fe374` |
| 11 | `./js/i18n.js` | `d71a9f19b5fa6a383c94420ef7e5fbffd9aa1f459c0283a13226f1bada2d08fd` |
| 12 | `./js/game.js` | `2a9bf8fa105feabd1859b771e7776e27c979f7e0c04945bdadec4dd6b674c854` |
| 13 | `./js/ui.js` | `d2c4c175c16109041bfc6259b7856783ddcc3e6f4071b9b43809d2712cdd33f5` |
| 14 | `./README.md` | `bec68f65b72959c1958d0243c1cbf652118e6fc4debde26be56c743732b96476` |
| 15 | `./test/cdp.mjs` | `a51609ea357a4958d36b988fd175bcd924704c3b9fd2edec63e2c8531f9d419b` |
| 16 | `./test/diag-p4.mjs` | `be4efbe80888e11f1544486ce1515877cd05e2fac723135c3e6cd6c650080485` |
| 17 | `./test/g11-noscore.mjs` | `885affbdc97791727f2d45e2ab498232d33aa43ea8a5ee82d48fc1fbc7d02ab6` |
| 18 | `./test/g12-seed.mjs` | `0b3ccbefaba999442f48d67f568115fac581e5d863cca76c9e9f9c7a3b30434b` |
| 19 | `./test/g13-best.mjs` | `17883f2929d97d17d74770debb8a1d3fea39424a89f41582a3de4d44324e2c99` |
| 20 | `./test/g14-innertest.mjs` | `9a935b99745ad1fa4799b5ed917c68986fb88079e6a33dc7d3b17349c777cd38` |
| 21 | `./test/g15-i18n.mjs` | `29cdd3a2abb64bfc57051fbac02a889558cec4a83d679c45318139171b1ec4c9` |
| 22 | `./test/g1-result.txt` | `b48db4e2b37ee9ea23654684ea5d51689ef2a5569c6f45eba5042b29f428c323` |
| 23 | `./test/g1-scores.js` | `d1c06237b5c6e08b1de7b3c59725add5888a90ca374137d670e01610c28c39ac` |
| 24 | `./test/g2g4-headless.js` | `1f63e9041a75fcda647823fa9628fddfdcb73b06149b111d2652640df8aeab08` |
| 25 | `./test/g2g4-result.txt` | `33e6d93ffaa05b6f225b5c20a2cfd2578bb522486177e086b4809a63ffa87f81` |
| 26 | `./test/g3-result.txt` | `fab9d59b09f102685a38ad452a6f65d48fe08c5079f9fc0303a2644d6c83d60d` |
| 27 | `./test/g3-swap.js` | `28f8eabdff190ae2a4ca455d1ad1336ff93d15930cbc943fdbf47043923cd90e` |
| 28 | `./test/g4-colors.mjs` | `5b79ec952cf5af9423e53d78accb409fa9198ee5aeb68b62699aa10c70b5b743` |
| 29 | `./test/g5-result.txt` | `729413a0b3884e03f504765d104bed654d855d7116ce78fb657579830aa4fab8` |
| 30 | `./test/g5-rownames.mjs` | `b287bc7c7f92e43fbb843cc8292e088d4ab3ba7dba3b9e851fa4177ae9feaa17` |
| 31 | `./test/g5-run.mjs` | `4e8626b9f6f754406018fa088c8f62d55e28299c260bcdc6281adb8f82760e50` |
| 32 | `./test/g5-ui.mjs` | `232d408aa250d5a0c9636e4e0bd012d7a819aaeef1476f6bec3ee7c1f6fca62f` |
| 33 | `./test/g6-audio.mjs` | `76e624937d19522bf5ebda80c4f79e7c7342b4b3034ba0d465cbfd08f41388ee` |
| 34 | `./test/g7-fx.mjs` | `cf2e0d2567a423fb68499e96c423201f9e73b0dbeb6ee0d185087b17262e22be` |
| 35 | `./test/g8-scan.mjs` | `765e1e9939a032cd11931b05b1f9c90c6d8d813e77b76b35c93cb7a9b4c26deb` |
| 36 | `./test/g9-boards.mjs` | `daa0e250455f2251e4e99940538b59035e4e0b4e1b54de33ef38b49efd3ed110` |
| 37 | `./test/go-logic.mjs` | `349b3d1018d0e31402cd23e2ef561d778ad55acce79573ed4732e27bced65b54` |
| 38 | `./test/go-ui.mjs` | `d964383c651dfe90177b5d341b5a0aae507b671cfb71f78943fd0399a30fdc9f` |
| 39 | `./test/go-ui-85.mjs` | `723e87294e516f4d8738fbefe37015f57b2648e38fb5570392f97099bae9adfe` |
| 40 | `./test/lib.mjs` | `b0d8d59c552fcce2ce381a71ff8c3dbe48a07628a6abf6bb20d38fa9d6b01954` |
| 41 | `./test/max-board.mjs` | `a76d3d61efb02f989568aef63435e76c6c02ebf0687c816ad4fcb2d6a4e36f02` |
| 42 | `./test/poc-repro.mjs` | `4f9d2ea7b25eeff2be6c53667fb4f11b379878f1e884cd925063d7051a597725` |
| 43 | `./test/reactivity.mjs` | `026f5f3d8534be9d3df2617098b86e5f3f2b0eb7326559aaea47d9f4ae64a61a` |
| 44 | `./test/run-headless.mjs` | `e5c0f71c2ef1f866f8bd1b984acb4afd00c9f500be8aa6b98605a62830c86670` |
| 45 | `./test/scaffold-v21/g12-seed.mjs` | `758876fcfd037093a46d6c384bdc6043515a53759befa5a8425170f2c4a4f53b` |
| 46 | `./test/scaffold-v21/g3-swap.js` | `e19040f74e0cdb1d41614247d3abfc230ef0f0d79aafc3f95e686b72fbea62d3` |
| 47 | `./test/scaffold-v21/poc-repro.mjs` | `f7660f0d29738255d58fe787265451453ce406f5eaf6d28c710a96f364a20e96` |
| 48 | `./test/w3c.mjs` | `a1a4c755e8db9115789925539b8a3a8473f734ee1c81fb9f83c5c0f784773679` |

## PATCH v2.2.3 — Flow 2P : B1 gate Play 2×Ready + B2 Rejouer = proposition acceptée + B3 libellé « Player 2 » (2026-10-24, TASK-V223-BUGS-2P-20261024-01)

**Changements** (source + tests + régénérations) :
1. `js/ui.js` — B1 : `#start`/`#replay` disabled en 2P tant que les 2 joueurs ne sont pas Ready (ré-activation au deal / à la fin de partie).
2. `js/net.js` — B2 : type de message `rematch` (pc2p) ; « Rejouer » 2P = proposition, nouvelle partie uniquement si acceptée, via Ready/`maybeDeal` (jamais de startGame solo/IA depuis l'écran de fin 2P) ; garde `proposeRematch` `started && !ended` (racine du timeout g16).
3. `js/i18n.js` — B3 : `p2p_player2` + `p2p_rematch_ask` × 5 langues (EN/FR/ES/IT/DE) ; `apply()` → `G.UI.updateBoardTitles()` (libellé dynamique).
4. `js/ui.js` — B3 : plateau 2P étiqueté `p2p_player2` quand `twoPlayer === true` (libellés solo inchangés).
5. `js/game.js` : `G.version` → `2.2.3` (seule occurrence de version déclarée, convention v2.2.2) ; `index.html` et `package.json` inchangés (libellé dynamique B3 en `js/ui.js` + `js/i18n.js` ; package.json 2.2.0, convention v2.2.2).
6. `all.js` : reconstruite (7 modules, `\n`) — 101 612 o, 0 CR.
7. `test/g16-p2p.mjs` : 31 checks baseline + 14 checks B1/B2/B3 = 45 checks ; pins version 2.2.3 : 11 tests.
8. Régénérés par la suite v2.2.3 : `test/results/porte-13.log`, `porte-14.log`, `porte-16.log`, `COMPT-RENDU.md` (§ « PATCH v2.2.3 »), `sha256-final-v212.txt` (48 entrées), `test/results/v2.2.3/` (6 preuves).

**Preuves** : `test/results/v2.2.3/` (6 fichiers : 54–58 ci-dessus + `progress.log`). Détails, anomalies et commande par commande : `COMPT-RENDU.md` § « PATCH v2.2.3 ».

## Procédure
1. `git clone https://github.com/Mikerhinos/poker-chrono-beta.git poker-chrono` (branche `main` = commit v2.2.3 après push NI4NI).
2. `git config core.autocrlf false` + checkout forcé (arbres LF — 0 CR sur l'ensemble du périmètre v2.2.3 : 48 table + 3 hors table).
3. `npm install --no-save --no-package-lock eslint@9.39.2 @eslint/js@9.39.2 peerjs@1.5.5 peerjs-server@0.2.9` (versions épinglées, aucun lock commité, `peerjs-server` dev-only).
4. Lancer la suite des 23 commandes (22 node + 1 ESLint) : `test/results/v2.2.3/suite-run-v223.txt` — headless Chrome via `test/run-headless.mjs` (CDP 9341–9359, broker `peerjs-server` 127.0.0.1:9000 pour g16).
5. Recalculer les 48 sha256 par re-lecture binaire + comparer à la table ci-dessus (et à `sha256-final-v212.txt`).

