// Config flat ESLint — PORTE 23 (ESLint), Poker-Chrono v2.2-a.
// Lint de l'application comme le navigateur la voit : les 7 scripts js/*.js
// (scripts classiques, scope global partagé) concaténés dans l'ordre de
// chargement de index.html (deck → game → i18n → audio → fx → ui → net) dans all.js.
// js/peerjs.min.js (vendor minifié) est exclu du lint, comme dans v2.1.2-q.
// Ajustements documentés (hérités de v2.1.2) :
//  - global `G` : propriété globalThis créée volontairement par l'app (game.js / fx.js).
//  - no-unused-vars caughtErrors:"none" : les catch silencieux avec repli
//    (lsGet/lsSet, armement audio) sont un motif délibéré du code.
// Ajustement v2.2-a :
//  - global `Peer` (readonly) : global de PeerJS chargé par js/peerjs.min.js
//    (avant js/net.js). js/net.js consomme G, G.UI, G.remoteSwap et Peer.
import js from '@eslint/js';

export default [
  {
    files: ['all.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', location: 'readonly', history: 'readonly',
        AudioContext: 'readonly', webkitAudioContext: 'readonly',
        performance: 'readonly', requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', setInterval: 'readonly',
        clearInterval: 'readonly', console: 'readonly',
        atob: 'readonly', btoa: 'readonly', screen: 'readonly',
        devicePixelRatio: 'readonly', crypto: 'readonly',
        // globalThis.G : scope global partagé de l'application
        G: 'writable',
        // Peer : global PeerJS (js/peerjs.min.js), consommé par js/net.js
        Peer: 'readonly',
      },
    },
    plugins: { js },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { vars: 'all', args: 'after-used', caughtErrors: 'none' }],
    },
  },
];
