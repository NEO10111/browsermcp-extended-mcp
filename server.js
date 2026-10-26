#!/usr/bin/env node
/** Modified BrowserMCP distribution (see NOTICE). MCP server: stdio plus one local WebSocket channel. */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocket, WebSocketServer } from 'ws';

// Import de tous les tools (existants + nouveaux)
import * as allTools from './tools/index.js';

/* ══════════════════════════════════════════════════════════════════════
   Configuration par défaut
══════════════════════════════════════════════════════════════════════ */
const DEFAULT_EXECUTE_PORT = 9877;   // canal unique extension ↔ serveur MCP
const VERSION              = '2.0.0';
const NAME                 = 'BrowserMCP Extended';

/* Chaque client MCP a son processus stdio ; un seul possède le port navigateur. */
async function createBridge(port, context, onPeerClose = () => {}) {
  const wss = new WebSocketServer({ port, host: '127.0.0.1' });
  wss.on('connection', (socket, request) => {
    if (request.url === '/?role=mcp-peer') {
      socket.on('message', async (data) => {
        let message;
        try { message = JSON.parse(data.toString()); } catch { return; }
        if (!message.id || typeof message.type !== 'string') return;
        try {
          const result = message.type === 'relayHello'
            ? { name: NAME }
            : await context.sendExecute(message.type, message.payload);
          socket.send(JSON.stringify({ type: 'messageResponse', payload: { requestId: message.id, result } }));
        } catch (error) {
          socket.send(JSON.stringify({ type: 'messageResponse', payload: { requestId: message.id, error: String(error) } }));
        }
      });
      return;
    }
    if (context.executeWs) context.executeWs.close();
    context.executeWs = socket;
    socket.on('close', () => {
      if (context.executeWs === socket) context.executeWs = null;
    });
    process.stderr.write(`[BrowserMCP Extended] Extension connectée (port ${port})\n`);
  });

  try {
    await new Promise((resolve, reject) => {
      wss.once('listening', resolve);
      wss.once('error', reject);
    });
    return {
      role: 'owner',
      close: async () => {
        for (const socket of wss.clients) socket.terminate();
        await new Promise(resolve => wss.close(resolve));
      },
    };
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    const peer = new WebSocket(`ws://127.0.0.1:${port}/?role=mcp-peer`, { handshakeTimeout: 2000 });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Handshake WebSocket expiré')), 2000);
        peer.once('open', () => { clearTimeout(timer); resolve(); });
        peer.once('error', error => { clearTimeout(timer); reject(error); });
      });
      const hello = await sendSocketMessage(peer, 'relayHello', {}, 2000);
      if (hello?.name !== NAME) throw new Error(`Port ${port} occupé par un autre service`);
    } catch (cause) {
      peer.terminate();
      throw new Error(`Impossible de partager le port ${port} : ${cause.message}`, { cause });
    }
    context.executeWs = peer;
    peer.on('close', () => {
      if (context.executeWs === peer) {
        context.executeWs = null;
        onPeerClose();
      }
    });
    return { role: 'peer', close: async () => peer.terminate() };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Classe Context — gestion des connexions WebSocket
══════════════════════════════════════════════════════════════════════ */

/** Connexion unique vers l'extension. */
class Context {
  /** @type {WebSocket|null} Connexion unique de l'extension */
  #executeWs = null;

  static NO_CONNECTION = 'BrowserMCP Extended is not connected. Enable the extension and start the local MCP server.';

  get executeWs() { return this.#executeWs; }
  set executeWs(v) { this.#executeWs = v; }

  /* ── Méthodes d'envoi ── */

  /**
   * Envoie un message sur le canal unique et attend la réponse.
   * @param {string} type - Type de message
   * @param {*}      payload
   * @param {{ timeoutMs?: number }} [options]
   */
  async send(type, payload, options = {}) {
    const { timeoutMs = 30_000 } = options;
    return this.sendExecute(type, payload, { timeoutMs });
  }

  /**
   * Envoie un message sur le canal unique et attend la réponse.
   * @param {string} type
   * @param {*}      payload
   * @param {{ timeoutMs?: number }} [options]
   */
  async sendExecute(type, payload, options = {}) {
    const { timeoutMs = 30_000 } = options;
    if (!this.#executeWs) throw new Error(Context.NO_CONNECTION);
    return sendSocketMessage(this.#executeWs, type, payload, timeoutMs);
  }

  async close() {
    try { this.#executeWs?.close(); } catch {}
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Protocole WebSocket — envoi/réception de messages avec requestId
══════════════════════════════════════════════════════════════════════ */

/**
 * Génère un identifiant unique pour chaque requête.
 * @returns {string}
 */
function generateId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Envoie un message WS de type request/response et retourne la réponse.
 * @param {WebSocket} ws
 * @param {string}    type
 * @param {*}         payload
 * @param {number}    timeoutMs
 * @returns {Promise<*>}
 */
function sendSocketMessage(ws, type, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket is not open'));
    }

    const id = generateId();
    let timeoutId;

    /** Nettoie les listeners et le timer. */
    const cleanup = () => {
      ws.removeEventListener('message', onMessage);
      ws.removeEventListener('close',   onClose);
      ws.removeEventListener('error',   onError);
      clearTimeout(timeoutId);
    };

    /** Écoute les réponses correspondant à notre requestId. */
    const onMessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data.toString()); } catch { return; }
      if (msg.type !== 'messageResponse' && msg.type !== 'getActiveTabResult') return;
      // Compatibilité avec les deux formats de réponse
      const reqId = msg.payload?.requestId ?? msg.id;
      if (reqId !== id) return;
      cleanup();
      const { result, error } = msg.payload ?? { result: msg.result };
      if (error) reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      else       resolve(result);
    };

    const onClose = () => { cleanup(); reject(new Error('WebSocket closed')); };
    const onError = () => { cleanup(); reject(new Error('WebSocket error'));  };

    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`WebSocket response timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    ws.addEventListener('message', onMessage);
    ws.addEventListener('close',   onClose);
    ws.addEventListener('error',   onError);

    ws.send(JSON.stringify({ id, type, payload }));
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Création du serveur MCP
══════════════════════════════════════════════════════════════════════ */

/**
 * Démarre les serveurs WebSocket et le serveur MCP stdio.
 * @param {number} [executePort=9877]
 */
async function createServer(executePort = DEFAULT_EXECUTE_PORT) {
  const context = new Context();
  let bridge;
  let closing = false;
  let retryTimer = null;
  const rejoin = async () => {
    if (closing) return;
    try {
      bridge = await createBridge(executePort, context, rejoin);
      process.stderr.write(`[BrowserMCP Extended] Canal navigateur repris : ${bridge.role}\n`);
    } catch (error) {
      process.stderr.write(`[BrowserMCP Extended] Reconnexion du canal : ${error.message}\n`);
      retryTimer = setTimeout(rejoin, 1000);
      retryTimer.unref?.();
    }
  };
  bridge = await createBridge(executePort, context, rejoin);
  process.stderr.write(`[BrowserMCP Extended] Canal navigateur : ${bridge.role} (port ${executePort})\n`);

  // ── Construction de la liste des tools ──
  const tools = Object.values(allTools).filter(t => t && t.schema && t.handle);

  // ── Serveur MCP stdio ──
  const server = new Server(
    { name: NAME, version: VERSION },
    { capabilities: { tools: {} } }
  );

  // Handler : liste des tools disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => t.schema),
  }));

  // Handler : exécution d'un tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.schema.name === request.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool "${request.params.name}" introuvable.` }],
        isError: true,
      };
    }
    try {
      return await tool.handle(context, request.params.arguments);
    } catch (err) {
      return {
        content: [{ type: 'text', text: String(err) }],
        isError: true,
      };
    }
  });

  // Nettoyage à la fermeture du serveur
  const _originalClose = server.close?.bind(server) ?? (() => Promise.resolve());
  server.close = async () => {
    closing = true;
    clearTimeout(retryTimer);
    try { await _originalClose(); }   catch {}
    try { await context.close(); } catch {}
    try { await bridge.close(); } catch {}
  };

  return server;
}

/* ══════════════════════════════════════════════════════════════════════
   Watchdog de sortie propre
══════════════════════════════════════════════════════════════════════ */

/**
 * Installe des handlers pour fermer proprement le serveur lors de
 * SIGINT, SIGTERM ou fermeture de stdin (utilisé par certains hôtes MCP).
 * @param {Server} server
 */
function setupExitWatchdog(server) {
  const exit = async () => {
    try { await server.close(); } catch {}
    process.exit(0);
  };
  process.stdin.on('close', async () => {
    const t = setTimeout(() => process.exit(0), 2000);
    if (t.unref) t.unref();
    await exit();
  });
  process.on('SIGINT',  exit);
  process.on('SIGTERM', exit);
}

/* ══════════════════════════════════════════════════════════════════════
   Point d'entrée
══════════════════════════════════════════════════════════════════════ */

(async () => {
  const args = process.argv.slice(2);
  const portArg = args.indexOf('--execute-port') >= 0 ? args.indexOf('--execute-port') : args.indexOf('--port');
  const executePort = portArg >= 0 ? Number(args[portArg + 1]) : DEFAULT_EXECUTE_PORT;
  if (!Number.isInteger(executePort) || executePort < 1 || executePort > 65535) {
    throw new Error('Port invalide (1–65535)');
  }

  const server = await createServer(executePort);
  setupExitWatchdog(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(`[BrowserMCP Extended] Serveur MCP démarré — port: ${executePort}\n`);
  process.stderr.write(`[BrowserMCP Extended] ${Object.keys(allTools).length} tools disponibles\n`);
})();
