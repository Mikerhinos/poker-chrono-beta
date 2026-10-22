# MANIFESTE — Poker Chrono v2.2 (état final, 2026-10-22, flagfix menu de langue cherry-piqué)

**État** : branche `v2.2` — commit `d0caf9c` (cherry-pick `24a266d`, flagfix v2.1.2, fils de `cb3077a` v2.2-A) + commit final (fix EOL `js/game.js`/`js/i18n.js`, MANIFESTE + sha256 recalculés, preuves suite v2.2-flagfix). `all.js` reconstruite sur l'arbre final.

**Périmètre** : les **48 entrées** ci-dessous = périmètre du manifeste v2.1 (`sha256-final-v21.txt`), inchangé : livrables site (12), tests CDP/logiques (24 scripts), preuves de runs (8), docs et squelettes (4). Hashs **recalculés par re-lecture** sur l'arbre v2.2 final — aucun hash repris d'un artefact antérieur. Fichiers v2.2-A hors périmètre 48 : `./js/net.js`, `./test/g16-p2p.mjs`, `./test/results/v2.2-a/*` (cf. archive milestone v2.2-A, 4RCH1V), `./all.js` (artefact de build — reconstruite sur l'arbre final : 7 scripts ordre `index.html` v2.2, 87 501 o, 0 CR, `3b1d947d2a895f8709b07cea484c2aaf53e126c7afa71e2f4d0b7b1ec06b9557`, ESLint porte 23 RC=0).

**Hors périmètre (auto-référence impossible)** : `sha256-final-v212.txt` (fichier machine de ce manifeste), `MANIFESTE.md` (ce document), `.git`.

## Résultats ancrés à l'état final

| Invariant | Valeur |
|---|---|
| Taille totale HTML+CSS+JS | **167,289 octets** (100–200 Ko, porte 8) — inclut `js/net.js` (v2.2-A) |
| Bench 900 (sortie normalisée) | `312841cd81911460d998d4b4d6a026cfab11b4c7efca4559a8443bc828bc357a` (identique v2.1.2 / v2.1.2-flagfix) |
| Portes | **22/22 exécutées** — toutes vertes sauf `g1-scores` (exception environnementale documentée : ENOENT `poker-rush`, code g1 inchangé par le fix) |
| ESLint porte 23 | exit 0, 0 erreur (concaténation `all.js` 87 501 o — 7 scripts ordre `index.html` v2.2 — config `test/results/v2.2-a/eslint.concat.config.mjs`) |
| g15-i18n | **30 ok / 0 fail** (assertions menu-lang du flagfix actives) |
| Deck verbatim | `js/deck.js` ↔ `baseline-v2.0.0/index.html` byte-identiques |

## Table des 48 sha256 (format `<n>|<sha256> *<path>`)

| n | chemin | sha256 |
|---|---|---|
| 1 | `./ANCRE-PARTS.md` | `ba9e1555316b0e88b97df62c844ecb35d3aa6ee7fc9a3ce666fffe097eb21a2c` |
| 2 | `./COMPT-RENDU.md` | `f4d3a1b4113873306959d53efab2d62d7b37d7c5c2cd771c80b7a00b769241fe` |
| 3 | `./css/anim.css` | `f8beff71bf0e2936f2f87f34444ee481b9d4f0f19a79bfe576f157e2f50d569a` |
| 4 | `./css/base.css` | `4c62804f7834209356f1385115973f21bdbca35e27bee695af5df9f9f36b7cc4` |
| 5 | `./css/fonts.css` | `0f697d3146f6c7e4a818ea7f25458ab62a60713543049b3c6aa754659709f68a` |
| 6 | `./css/theme.css` | `bda14af5e8afe1efb09fab88490bea039e281b235654469c099856fa37d2da89` |
| 7 | `./index.html` | `a1bc805100f1fd0b02a2afc9aea786bd2f03fdae9033de9427fa1d023627d04a` |
| 8 | `./js/audio.js` | `e2d144421e0bc1454eb328b50c9eace97f73e7b3d9a21fec1bffafecc5252759` |
| 9 | `./js/deck.js` | `f7f02ef31fb56880e2a7caf2c10302bfa24d34c2bfca9b602cad324c1f50df73` |
| 10 | `./js/fx.js` | `e388cdcd4a30fd7b6df8bd81fd4333a7bbf2a6621ea5c5ce11c732e5e92fe374` |
| 11 | `./js/i18n.js` | `0d97aac7ab5cbe65440455791a73c6d3a7ec289957128bf3bbb9017db4a2e2c5` |
| 12 | `./js/game.js` | `b3e4038403e2db5a6ecf44cda9e36be3560e609fc0d890e3c7d3059cb291a648` |
| 13 | `./js/ui.js` | `944fd0cd096c3195b16dcb9357ff5584e1ffefaa9d3847fb2d522b8cc2817719` |
| 14 | `./README.md` | `bec68f65b72959c1958d0243c1cbf652118e6fc4debde26be56c743732b96476` |
| 15 | `./test/cdp.mjs` | `986dea6adb306bb3b2b63d87059f3df6c5148630a02502af743e2f1453c5b554` |
| 16 | `./test/diag-p4.mjs` | `be4efbe80888e11f1544486ce1515877cd05e2fac723135c3e6cd6c650080485` |
| 17 | `./test/g11-noscore.mjs` | `7567d5f02711f3bfba71610e22fbefcc47f7dfe5ed9c3c9fae6600bbb105944a` |
| 18 | `./test/g12-seed.mjs` | `7ffa802aff67dcb3b8514ca86c68dafec98b113fd18ce3d953376323de4089cd` |
| 19 | `./test/g13-best.mjs` | `4f52b1613d7c517a5970e618ab31ccf59d37b78dd5cf1729d18867b03d318b4a` |
| 20 | `./test/g14-innertest.mjs` | `f55502999a269c77fcea99b5b9e41efe03ef9ab930b51fd86953db95b39df5ac` |
| 21 | `./test/g15-i18n.mjs` | `646c96bb00286c9adb7363f6b554b850e08026471c293edd336a015023899a5d` |
| 22 | `./test/g1-result.txt` | `b48db4e2b37ee9ea23654684ea5d51689ef2a5569c6f45eba5042b29f428c323` |
| 23 | `./test/g1-scores.js` | `d1c06237b5c6e08b1de7b3c59725add5888a90ca374137d670e01610c28c39ac` |
| 24 | `./test/g2g4-headless.js` | `1f63e9041a75fcda647823fa9628fddfdcb73b06149b111d2652640df8aeab08` |
| 25 | `./test/g2g4-result.txt` | `33e6d93ffaa05b6f225b5c20a2cfd2578bb522486177e086b4809a63ffa87f81` |
| 26 | `./test/g3-result.txt` | `fab9d59b09f102685a38ad452a6f65d48fe08c5079f9fc0303a2644d6c83d60d` |
| 27 | `./test/g3-swap.js` | `28f8eabdff190ae2a4ca455d1ad1336ff93d15930cbc943fdbf47043923cd90e` |
| 28 | `./test/g4-colors.mjs` | `acf3e2a1c6511fd2eb07264543110d9ba69ad9bf8de6fc3b346bec5aeedb45e8` |
| 29 | `./test/g5-result.txt` | `729413a0b3884e03f504765d104bed654d855d7116ce78fb657579830aa4fab8` |
| 30 | `./test/g5-rownames.mjs` | `e2b6c1eae5c90742eea36bee81ef3f1531e60a679606e54e1f4491f72c9b5114` |
| 31 | `./test/g5-run.mjs` | `4e8626b9f6f754406018fa088c8f62d55e28299c260bcdc6281adb8f82760e50` |
| 32 | `./test/g5-ui.mjs` | `c588bcb614fa3627f7595868c389017c1dc0999c87e0029a23d6ba9ee4202bdd` |
| 33 | `./test/g6-audio.mjs` | `3aec414c17e9ce5c628005ebe45419eae6e5c3eb47c15099d205deebc869c960` |
| 34 | `./test/g7-fx.mjs` | `0da1e832651f76b1be3fcf3aa3ee5235f1b9f13f2e3d5d7f7c4d502d35bfbee8` |
| 35 | `./test/g8-scan.mjs` | `358456898b69cb211ffa2aeae5f344c3977620ba185fa86d955dcc9a91146b37` |
| 36 | `./test/g9-boards.mjs` | `72a621e41fa97605cd5d50177b3a70b35a40b85028e73afe7dc5c6a7d2e07535` |
| 37 | `./test/go-logic.mjs` | `349b3d1018d0e31402cd23e2ef561d778ad55acce79573ed4732e27bced65b54` |
| 38 | `./test/go-ui.mjs` | `d964383c651dfe90177b5d341b5a0aae507b671cfb71f78943fd0399a30fdc9f` |
| 39 | `./test/go-ui-85.mjs` | `723e87294e516f4d8738fbefe37015f57b2648e38fb5570392f97099bae9adfe` |
| 40 | `./test/lib.mjs` | `b0d8d59c552fcce2ce381a71ff8c3dbe48a07628a6abf6bb20d38fa9d6b01954` |
| 41 | `./test/max-board.mjs` | `a76d3d61efb02f989568aef63435e76c6c02ebf0687c816ad4fcb2d6a4e36f02` |
| 42 | `./test/poc-repro.mjs` | `0fad5b9f631a42897ab63474b46ba18100c15cfa0ece9428fa89d6cb6770b5f6` |
| 43 | `./test/reactivity.mjs` | `026f5f3d8534be9d3df2617098b86e5f3f2b0eb7326559aaea47d9f4ae64a61a` |
| 44 | `./test/run-headless.mjs` | `e5c0f71c2ef1f866f8bd1b984acb4afd00c9f500be8aa6b98605a62830c86670` |
| 45 | `./test/scaffold-v21/g12-seed.mjs` | `758876fcfd037093a46d6c384bdc6043515a53759befa5a8425170f2c4a4f53b` |
| 46 | `./test/scaffold-v21/g3-swap.js` | `e19040f74e0cdb1d41614247d3abfc230ef0f0d79aafc3f95e686b72fbea62d3` |
| 47 | `./test/scaffold-v21/poc-repro.mjs` | `f7660f0d29738255d58fe787265451453ce406f5eaf6d28c710a96f364a20e96` |
| 48 | `./test/w3c.mjs` | `a1a4c755e8db9115789925539b8a3a8473f734ee1c81fb9f83c5c0f784773679` |

## PATCH v2.2 — flagfix menu de langue, cherry-pick `24a266d` (2026-10-22)

**Opération** : `git cherry-pick 24a266d` sur `v2.2` @ `cb3077a` → 1 seul conflit (`css/base.css` — blocs P2P ours + blocs lang theirs, aucune collision sémantique) → conservation des deux blocs, marqueurs retirés, blocs **byte-identiques** aux sources (`git show :2:`/`:3:`) → commit **`d0caf9c`**.

**Fix EOL (porte g14)** : `js/game.js` (CRLF=361) et `js/i18n.js` (CRLF=469) héritaient des fins de ligne CRLF du commit v2.2-A `cb3077a` (préexistant, non introduit par le cherry-pick) → violation de la porte g14 « pas de CR (LF) ». Normalisation `sed -i 's/\r$//'` (whitespace-only, contenu byte-identique hors EOL — vérifié). Les 8 autres fichiers CRLF de `cb3077a` sont hors scan g14 : non touchés.

**Entrées changées par rapport à `cb3077a`** (hashs recalculés par re-lecture) :

| n | chemin | sha256 (nouveau) |
|---|---|---|
| 2 | `./COMPT-RENDU.md` | `f4d3a1b4113873306959d53efab2d62d7b37d7c5c2cd771c80b7a00b769241fe` |
| 4 | `./css/base.css` | `4c62804f7834209356f1385115973f21bdbca35e27bee695af5df9f9f36b7cc4` |
| 7 | `./index.html` | `a1bc805100f1fd0b02a2afc9aea786bd2f03fdae9033de9427fa1d023627d04a` |
| 11 | `./js/i18n.js` | `0d97aac7ab5cbe65440455791a73c6d3a7ec289957128bf3bbb9017db4a2e2c5` |
| 12 | `./js/game.js` | `b3e4038403e2db5a6ecf44cda9e36be3560e609fc0d890e3c7d3059cb291a648` |
| 13 | `./js/ui.js` | `944fd0cd096c3195b16dcb9357ff5584e1ffefaa9d3847fb2d522b8cc2817719` |
| 21 | `./test/g15-i18n.mjs` | `646c96bb00286c9adb7363f6b554b850e08026471c293edd336a015023899a5d` |

**Preuves v2.2-flagfix (périmètre élargi 49–52, hors `sha256-final-v212.txt` qui reste sur le périmètre 48)** :

| n | chemin | sha256 |
|---|---|---|
| 49 | `./test/results/v2.2-flagfix/suite-run-v22f.txt` | `f93657bc5301ee63e91b24f4cfb04be9a4bca928afa638945dc1d2fb8045b199` |
| 50 | `./test/results/v2.2-flagfix/eslint-gate23-v22f.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 51 | `./test/results/v2.2-flagfix/bench900-run-v22f.txt` | `9e007616414731a1b3bfdf95f940dc662101bc61468604870a4e603a4d6b0e57` |
| 52 | `./test/results/v2.2-flagfix/bench900-normalized.sha256` | `198e62486e65756145422e27c283bc8c830a35a883f77f2a72c0502b524c23e5` |

**Réexécution complète du 2026-10-22** : 22 portes + w3c + ESLint 23 — toutes vertes sauf `g1-scores` (exception environnementale documentée, code g1 inchangé par le fix). `g15-i18n` : **30 checks** verts. `g16-p2p` : 17 OK (tentative 2, `run-headless.mjs` CDP 9347). Bench 900 : sha256 normalisé `312841cd…` **identique à l'archivé v2.1.2 / v2.1.2-flagfix**. Détails : COMPT-RENDU « PATCH v2.2 — flagfix menu de langue (cherry-pick) » et `test/results/v2.2-flagfix/`.

## Procédure

1. `git cherry-pick 24a266d` sur `v2.2` @ `cb3077a` → conflit `css/base.css` résolu (conservation des deux blocs), `git add`, `GIT_EDITOR=true git cherry-pick --continue` → `d0caf9c`.
2. Suite complète v2.2 : 22 portes + w3c + ESLint 23 + bench 900 → `test/results/v2.2-flagfix/` (log `suite-run-v22f.txt`, toutes tentatives consignées).
3. Fix EOL `js/game.js`/`js/i18n.js` (porte g14) — whitespace-only, vérifié byte-identique hors EOL.
4. Re-lecture binaire de chacun des 48 chemins du périmètre sur l'arbre final, SHA-256 UTF-8.
5. Format machine `sha256-final-v212.txt` (une ligne par entrée : `<n>|<sha256> *<path>`) réaligné sur le même périmètre 48.
