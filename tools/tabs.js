// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/tabs.js — Nouveaux tools MCP de gestion des onglets
 *
 * Tools exposés :
 *   browser_list_tabs   — lister tous les onglets ouverts
 *   browser_switch_tab  — activer un onglet par son ID
 *   browser_new_tab     — ouvrir un nouvel onglet
 *   browser_close_tab   — fermer un onglet par son ID
 */

import { z } from 'zod';
import { jsonSchema } from './schema.js';

/* ─── browser_list_tabs ─── */

export const listTabs = {
  schema: {
    name: 'browser_list_tabs',
    description: 'List all open browser tabs with their IDs, URLs, and titles',
    inputSchema: jsonSchema(z.object({})),
  },
  /**
   * Demande à l'extension la liste de tous les onglets ouverts.
   * @param {import('../server.js').Context} ctx
   */
  handle: async (ctx) => {
    const tabs = await ctx.sendExecute('listTabs', {});
    const text = (tabs ?? [])
      .map(t => `[${t.tabId}] ${t.active ? '★ ' : '  '}${t.url ?? '—'}\n    ${t.title ?? ''}`)
      .join('\n');
    return { content: [{ type: 'text', text: text || 'Aucun onglet trouvé.' }] };
  },
};

/* ─── browser_switch_tab ─── */

const SwitchTabSchema = z.object({
  tabId: z.number().int().describe("Numeric ID of the tab to activate"),
});

export const switchTab = {
  schema: {
    name: 'browser_switch_tab',
    description: 'Switch to a specific browser tab by its tab ID',
    inputSchema: jsonSchema(SwitchTabSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ tabId: number }} params
   */
  handle: async (ctx, params) => {
    const { tabId } = SwitchTabSchema.parse(params);
    const result = await ctx.sendExecute('switchTab', { tabId });
    return { content: [{ type: 'text', text: result?.success ? `Switched to tab ${tabId}` : `Failed to switch to tab ${tabId}` }] };
  },
};

/* ─── browser_new_tab ─── */

const NewTabSchema = z.object({
  url: z.string().optional().describe('URL to open (defaults to about:blank)'),
});

export const newTab = {
  schema: {
    name: 'browser_new_tab',
    description: 'Open a new browser tab, optionally navigating to a URL',
    inputSchema: jsonSchema(NewTabSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ url?: string }} params
   */
  handle: async (ctx, params) => {
    const { url } = NewTabSchema.parse(params ?? {});
    const result = await ctx.sendExecute('newTab', { url });
    return { content: [{ type: 'text', text: `Opened new tab with ID ${result?.tabId}${url ? ` at ${url}` : ''}` }] };
  },
};

/* ─── browser_close_tab ─── */

const CloseTabSchema = z.object({
  tabId: z.number().int().describe("Numeric ID of the tab to close"),
});

export const closeTab = {
  schema: {
    name: 'browser_close_tab',
    description: 'Close a browser tab by its tab ID',
    inputSchema: jsonSchema(CloseTabSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ tabId: number }} params
   */
  handle: async (ctx, params) => {
    const { tabId } = CloseTabSchema.parse(params);
    const result = await ctx.sendExecute('closeTab', { tabId });
    return { content: [{ type: 'text', text: result?.success ? `Closed tab ${tabId}` : `Failed to close tab ${tabId}` }] };
  },
};
