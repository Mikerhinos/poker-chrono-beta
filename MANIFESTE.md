# MANIFESTE — Poker Chrono v2.2.1 (état final, 2026-10-22, P2P : broker cloud par défaut + timeout 30 s + repli solo)

**État** : commit parent **`59b3f74`** (v2.2-flagfix), patch v2.2.1 (19 fichiers, non poussé — NI4NI pousse après revue). `G.version` = **2.2.1** (seule occurrence, `js/game.js` ligne 352). Suite complète : **22/22 portes PASS + ESLint RC=0** (g1-scores : voir COMPT-RENDU § Anomalies / historique). `all.js` = concat **7 scripts** dans l'ordre des `<script>` d'index.html (`deck, game, i18n, audio, fx, ui, net`), séparateur `\n` — **90358 octets, 0 CR**. `peerjs-server` reste **dev-only** dans `package.json` (jamais servi en prod).

**Périmètre (48 fichiers en table + 4 preuves v2.2.1 + 3 fichiers hors table 48)** : les 48 du périmètre v2.2 (app + suites + docs, table ci-dessous) + 4 preuves du run v2.2.1 :
- 49. `test/results/v2.2.1/suite-run-v221.txt`
- 50. `test/results/v2.2.1/eslint-gate23-v221.txt`
- 51. `test/results/v2.2.1/bench900-run-v221.txt`
- 52. `test/results/v2.2.1/bench900-normalized.sha256`

**Hors table 48 (v2.2.1 / v2.2-A, hashés ci-dessous)** : `./js/net.js` (`d3211cebedc79a6f1804649ea6f22f06d54afd1e451bd7b512cb5dee465460b6`), `./test/g16-p2p.mjs` (`50116bbb14824536def543c2265cdbe1679cee1a54a63f785c03637d47da2c4b`, CRLF conservé), `./all.js` (`f6d8a6f6539f5e042f3975f6f71819f6533a1e0918edab35769bdace0e50f3ac`, reconstruite : 7 scripts dans l'ordre des `<script>` d'index.html, 90358 o, 0 CR, ESLint porte 23 RC=0).

**Hors périmètre** : `node_modules/`, `server/` (inexistant), `.gitignore`, `PROGRESS.md`, `PLAN-MULTIJOUEUR-2JOUERS.md`, `PROJET-POKER-CHRONO.md`, les preuves v2.1.2/v2.1.2-flagfix/v2.2-a/v2.2-flagfix, `MANIFESTE.md` (auto-référence impossible), `sha256-final-v212.txt` (fichier machine de ce manifeste).

## Résultats ancrés à l'état final

| Mesure | Résultat |
|---|---|
| Taille totale HTML+CSS+JS (porte 8) | **257187 octets** (fenêtre 100–256 Ko) |
| Bench 900 (sha256 normalisé, wall → 111.5) | `312841cd81911460d998d4b4d6a026cfab11b4c7efca4559a8443bc828bc357a` — identique à la référence v2.1.2/v2.2 |
| Portes (g1–g16, w3c, go-logic, go-ui, go-ui-85, max-board) | **22/22 PASS** (g16 : 19 OK, FAILURES 0) |
| ESLint porte 23 (`all.js` 90358 o, flat config v2.2-a, 7 scripts + global `Peer`) | **RC=0, 0 erreur / 0 warning** (sortie vide) |
| i18n (porte 15) | **30 ok / 0 fail** (parité 5 langues, persistance localStorage) |
| Deck 52 cartes | verbatim inchangé (`js/deck.js` non modifié par le patch) |

## Table des 48 sha256 (re-lecture binaire de l'arbre final)

| n | Chemin | sha256 |
|---|---|---|
| 1 | `./ANCRE-PARTS.md` | `ba9e1555316b0e88b97df62c844ecb35d3aa6ee7fc9a3ce666fffe097eb21a2c` |
| 2 | `./COMPT-RENDU.md` | `2d8db66bb5a345603d369ac832fde8c10812ab1dffe51568d6b58472d90ae61c` |
| 3 | `./css/anim.css` | `f8beff71bf0e2936f2f87f34444ee481b9d4f0f19a79bfe576f157e2f50d569a` |
| 4 | `./css/base.css` | `4c62804f7834209356f1385115973f21bdbca35e27bee695af5df9f9f36b7cc4` |
| 5 | `./css/fonts.css` | `0f697d3146f6c7e4a818ea7f25458ab62a60713543049b3c6aa754659709f68a` |
| 6 | `./css/theme.css` | `bda14af5e8afe1efb09fab88490bea039e281b235654469c099856fa37d2da89` |
| 7 | `./index.html` | `cfd5dc23ee6a0f65f1b4da2fce36a8dd26979b4c22b1f46f2be0748c80f4d6b6` |
| 8 | `./js/audio.js` | `e2d144421e0bc1454eb328b50c9eace97f73e7b3d9a21fec1bffafecc5252759` |
| 9 | `./js/deck.js` | `f7f02ef31fb56880e2a7caf2c10302bfa24d34c2bfca9b602cad324c1f50df73` |
| 10 | `./js/fx.js` | `e388cdcd4a30fd7b6df8bd81fd4333a7bbf2a6621ea5c5ce11c732e5e92fe374` |
| 11 | `./js/i18n.js` | `f12e21931b594520047b78f876fc4c4ea03ff908777ff3fd2e2424c38ea5512b` |
| 12 | `./js/game.js` | `9188d9968db9a90e55279c2f4f96de7359f6dc50f242381791f118a223883365` |
| 13 | `./js/ui.js` | `944fd0cd096c3195b16dcb9357ff5584e1ffefaa9d3847fb2d522b8cc2817719` |
| 14 | `./README.md` | `bec68f65b72959c1958d0243c1cbf652118e6fc4debde26be56c743732b96476` |
| 15 | `./test/cdp.mjs` | `986dea6adb306bb3b2b63d87059f3df6c5148630a02502af743e2f1453c5b554` |
| 16 | `./test/diag-p4.mjs` | `be4efbe80888e11f1544486ce1515877cd05e2fac723135c3e6cd6c650080485` |
| 17 | `./test/g11-noscore.mjs` | `0a4fcbcb775703f16f280c573c2ca05d2a066286869c990c6c17859766f1148e` |
| 18 | `./test/g12-seed.mjs` | `b2ead31eba0abf5364da64245c7ced4ff879e01abd99182440502bde0c42e425` |
| 19 | `./test/g13-best.mjs` | `0179811ac054b608b1d06f0278cd5be79df98c049fbe7235f5c8a969e0477ef2` |
| 20 | `./test/g14-innertest.mjs` | `37f48ee309282d5998c64bef16edb92dba804dd26c24417e31a0bd48be699617` |
| 21 | `./test/g15-i18n.mjs` | `29cdd3a2abb64bfc57051fbac02a889558cec4a83d679c45318139171b1ec4c9` |
| 22 | `./test/g1-result.txt` | `b48db4e2b37ee9ea23654684ea5d51689ef2a5569c6f45eba5042b29f428c323` |
| 23 | `./test/g1-scores.js` | `d1c06237b5c6e08b1de7b3c59725add5888a90ca374137d670e01610c28c39ac` |
| 24 | `./test/g2g4-headless.js` | `1f63e9041a75fcda647823fa9628fddfdcb73b06149b111d2652640df8aeab08` |
| 25 | `./test/g2g4-result.txt` | `33e6d93ffaa05b6f225b5c20a2cfd2578bb522486177e086b4809a63ffa87f81` |
| 26 | `./test/g3-result.txt` | `fab9d59b09f102685a38ad452a6f65d48fe08c5079f9fc0303a2644d6c83d60d` |
| 27 | `./test/g3-swap.js` | `28f8eabdff190ae2a4ca455d1ad1336ff93d15930cbc943fdbf47043923cd90e` |
| 28 | `./test/g4-colors.mjs` | `493feb35bf2eb44399da7d2074b9afaf512840ea261609ca69f538197d0005c7` |
| 29 | `./test/g5-result.txt` | `729413a0b3884e03f504765d104bed654d855d7116ce78fb657579830aa4fab8` |
| 30 | `./test/g5-rownames.mjs` | `5da4e713eb1ab1203525f150e75ea091f78ff0801b34380043cda771d562b8d1` |
| 31 | `./test/g5-run.mjs` | `4e8626b9f6f754406018fa088c8f62d55e28299c260bcdc6281adb8f82760e50` |
| 32 | `./test/g5-ui.mjs` | `68033649eb2ad601a3a157f20a72ee199557dfd74f50f0b746a0737f591fd10e` |
| 33 | `./test/g6-audio.mjs` | `2835875a8ec3ac77c926ec36f3895a7769063316251a2ec003059cd09de4cecb` |
| 34 | `./test/g7-fx.mjs` | `0844520389122146423cdbabf6d29d5aace3b56c7e148331a3476c09432b4c36` |
| 35 | `./test/g8-scan.mjs` | `765e1e9939a032cd11931b05b1f9c90c6d8d813e77b76b35c93cb7a9b4c26deb` |
| 36 | `./test/g9-boards.mjs` | `a535c2ea99229f6c4440c5b16de82cefa193c785815ac6c1c924f13dd4649704` |
| 37 | `./test/go-logic.mjs` | `349b3d1018d0e31402cd23e2ef561d778ad55acce79573ed4732e27bced65b54` |
| 38 | `./test/go-ui.mjs` | `d964383c651dfe90177b5d341b5a0aae507b671cfb71f78943fd0399a30fdc9f` |
| 39 | `./test/go-ui-85.mjs` | `723e87294e516f4d8738fbefe37015f57b2648e38fb5570392f97099bae9adfe` |
| 40 | `./test/lib.mjs` | `b0d8d59c552fcce2ce381a71ff8c3dbe48a07628a6abf6bb20d38fa9d6b01954` |
| 41 | `./test/max-board.mjs` | `a76d3d61efb02f989568aef63435e76c6c02ebf0687c816ad4fcb2d6a4e36f02` |
| 42 | `./test/poc-repro.mjs` | `22dbbb7d7b5b8cfe675d60f8a695286d497aa877a06c25fa62321b1d2c58a29b` |
| 43 | `./test/reactivity.mjs` | `026f5f3d8534be9d3df2617098b86e5f3f2b0eb7326559aaea47d9f4ae64a61a` |
| 44 | `./test/run-headless.mjs` | `e5c0f71c2ef1f866f8bd1b984acb4afd00c9f500be8aa6b98605a62830c86670` |
| 45 | `./test/scaffold-v21/g12-seed.mjs` | `758876fcfd037093a46d6c384bdc6043515a53759befa5a8425170f2c4a4f53b` |
| 46 | `./test/scaffold-v21/g3-swap.js` | `e19040f74e0cdb1d41614247d3abfc230ef0f0d79aafc3f95e686b72fbea62d3` |
| 47 | `./test/scaffold-v21/poc-repro.mjs` | `f7660f0d29738255d58fe787265451453ce406f5eaf6d28c710a96f364a20e96` |
| 48 | `./test/w3c.mjs` | `a1a4c755e8db9115789925539b8a3a8473f734ee1c81fb9f83c5c0f784773679` |

## PATCH v2.2.1 — P2P : broker cloud par défaut + timeout 30 s + repli solo (2026-10-22)

**Changements** (19 fichiers) :
1. `js/net.js` : `brokerCfg()` — défaut **cloud `0.peerjs.com:443` (TLS/secure)** ; override dev par query string `?peerHost=&peerPort=&peerSecure=` (validation ports 1–65535, booléen `secure`), `peerHost` vide = `null` (PeerJS choisit). `CONNECT_TIMEOUT_MS = 30000` armé sur `hostGame`/`joinGame`, désarmé sur `onOpen`/`onError`/`close2P` ; sur timeout ou erreur de signalisation → statut `status_timeout`/`status_err_no_server` + `showSoloFallback()` (bouton `#p2p-solo` affiché). `_brokerCfg` exposé (testable).
2. `index.html` : `<button id="p2p-solo" class="p2p-btn" data-i18n="p2p_solo_btn" hidden>` dans `#p2p-panel`.
3. `js/ui.js` : clic `#p2p-solo` → masque panneau + bouton, démarre `startGame()` (partie solo normale).
4. `js/i18n.js` : `status_timeout` + `p2p_solo_btn` × 5 langues (fr, de, en, es, it) — insertion avant `err_from` de chaque bloc.
5. `js/game.js` : `G.version` → `2.2.1`.
6. `all.js` : reconstruite (7 modules, `\n`).
7. `test/g16-p2p.mjs` : 3 nouveaux checks (broker défaut cloud, bouton solo masqué au chargement, `G.P2P._brokerCfg` exposé), contrat DOM 7 ids, pins 2.2.1.
8. Pins version 2.2.1 : `test/g4-colors.mjs`, `g5-rownames.mjs`, `g5-ui.mjs`, `g6-audio.mjs`, `g7-fx.mjs`, `g8-scan.mjs`, `g9-boards.mjs`, `g11-noscore.mjs`, `g12-seed.mjs`, `g13-best.mjs`, `g14-innertest.mjs`, `poc-repro.mjs`.

**Preuves** : `test/results/v2.2.1/` (49–52 ci-dessus + logs de portes). Détails, anomalies et commande par commande : `COMPT-RENDU.md` § « PATCH v2.2.1 ».

## Procédure
1. `git clone https://github.com/Mikerhinos/poker-chrono-beta.git poker-chrono` (branche `main`).
2. `git config core.autocrlf false` + checkout forcé (arbres LF, à l'exception de `test/g16-p2p.mjs` conservé CRLF — byte-identique aux blobs).
3. `npm install --no-save --no-package-lock eslint@9.39.2 @eslint/js@9.39.2 peerjs@1.5.5 peerjs-server@0.2.9` (versions épinglées, aucun lock commité, `peerjs-server` dev-only).
4. Appliquer le patch v2.2.1 (19 fichiers, voir § PATCH ci-dessus).
5. Lancer la suite des 23 commandes (22 node + 1 ESLint) : `test/results/v2.2.1/suite-run-v221.txt` — headless Chrome via `test/run-headless.mjs` (CDP 9441–9452 ; g16 : 9347 + broker local 127.0.0.1:9000 spawné par le gate), bench 900 headless, ESLint flat config v2.2-a.
6. Recalculer les 48 sha256 par re-lecture binaire + écrire `MANIFESTE.md` + `sha256-final-v212.txt` (format machine).
7. Commit local sur `main` (sans push).
