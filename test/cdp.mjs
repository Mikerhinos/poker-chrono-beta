// Client CDP minimal (WebSocket global Node ≥ 22) pour le smoke test UI.
const WebSocket = globalThis.WebSocket;
if (!WebSocket) throw new Error('Node ≥ 22 requis (WebSocket global manquant)');

async function fetchList(url, tries = 40) {
  let list = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch('http://' + url + '/json');
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length) { list = parsed; break; }
        }
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!list) throw new Error('aucune liste CDP (port ' + url + ')');
  return list;
}

// Connecte à l'onglet CDP choisi par matchFn (multi-onglets : test g16-p2p).
export async function connectTab(url, matchFn, tries = 100) {
  const list = await fetchList(url, tries);
  const page = list.find((t) => t.type === 'page' && matchFn(t));
  if (!page) throw new Error('aucun onglet page correspondant');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const eventWaiters = [];
  let eventHandler = null;

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    } else if (msg.method) {
      if (eventHandler) eventHandler(msg);
      for (let i = eventWaiters.length - 1; i >= 0; i--) {
        if (eventWaiters[i].match(msg)) { eventWaiters.splice(i, 1); eventWaiters[i].resolve(msg); }
      }
    }
  };
  await new Promise((r) => { ws.onopen = r; });

  return {
    id: page.id,
    send,
    close: () => ws.close(),
    setEventHandler(fn) { eventHandler = fn; },
    nextEvent(match, timeoutMs = 30000) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout en attente d’événement')), timeoutMs);
        eventWaiters.push({ match, resolve: (m) => { clearTimeout(t); resolve(m); } });
      });
    }
  };
}

export async function evalJs(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails.exception && r.exceptionDetails.exception.description
      ? r.exceptionDetails.exception.description
      : JSON.stringify(r.exceptionDetails);
    throw new Error('Exception page : ' + d);
  }
  return r.result.value;
}

// Compatibilité historique : premier onglet page de l'instance CDP.
export async function connect(url, tries = 40) {
  return connectTab(url, () => true, tries);
}
