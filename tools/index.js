// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/index.js — Point d'export central de tous les tools MCP
 *
 * Agrège tous les tools (existants + nouveaux) en un seul tableau
 * prêt à être passé à createServerWithTools().
 */

// ── Tools de navigation (repris de l'original) ──────────────────────
export {
  navigate,
  goBack,
  goForward,
  wait,
  pressKey,
  snapshot,
  click,
  hover,
  type,
  selectOption,
  drag,
  screenshot,
  getConsoleLogs,
  executeScript,
} from './navigate.js';

// ── Nouveaux tools : onglets ─────────────────────────────────────────
export { listTabs, switchTab, newTab, closeTab } from './tabs.js';

// ── Nouveaux tools : DOM ─────────────────────────────────────────────
export { getHtml, getText, executeInFrame, scroll, uploadFile } from './dom.js';

// ── Nouveaux tools : réseau/cookies/storage ──────────────────────────
export { getCookies, setCookie, deleteCookie, getStorage } from './network.js';

// ── Nouveaux tools : capture d'écran ────────────────────────────────
export { screenshotElement, screenshotFullPage } from './screenshot.js';

// ── Nouveaux tools : interaction avancée ────────────────────────────
export { dragDrop, dialogHandle, clipboardWrite, reload } from './interaction.js';

// Capture réseau HTTP et WebSocket
export { networkStart, networkStop, networkList, networkDetail, networkClear, networkExportHar } from './network-capture.js';
