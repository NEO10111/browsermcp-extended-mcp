// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/network.js — Nouveaux tools MCP de gestion réseau/cookies/storage
 *
 * Tools exposés :
 *   browser_get_cookies    — récupérer les cookies pour une URL
 *   browser_set_cookie     — créer ou modifier un cookie
 *   browser_delete_cookie  — supprimer un cookie
 *   browser_get_storage    — lire localStorage et/ou sessionStorage
 */

import { z } from 'zod';
import { jsonSchema } from './schema.js';

/* ─── browser_get_cookies ─── */

const GetCookiesSchema = z.object({
  url: z.string().describe('URL whose cookies should be read'),
});

export const getCookies = {
  schema: {
    name: 'browser_get_cookies',
    description: 'Get all cookies for a specific URL',
    inputSchema: jsonSchema(GetCookiesSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ url: string }} params
   */
  handle: async (ctx, params) => {
    const { url } = GetCookiesSchema.parse(params);
    const cookies = await ctx.sendExecute('getCookies', { url });
    if (!Array.isArray(cookies)) {
      return { content: [{ type: 'text', text: 'Erreur : impossible de récupérer les cookies.' }], isError: true };
    }
    const text = cookies.length === 0
      ? 'Aucun cookie trouvé.'
      : cookies.map(c => `${c.name}=${c.value}  [domain:${c.domain}${c.httpOnly ? ', httpOnly' : ''}${c.secure ? ', secure' : ''}]`).join('\n');
    return { content: [{ type: 'text', text }] };
  },
};

/* ─── browser_set_cookie ─── */

const SetCookieSchema = z.object({
  name:     z.string().describe('Cookie name'),
  value:    z.string().describe('Cookie value'),
  domain:   z.string().optional().describe('Cookie domain, e.g. .example.com'),
  path:     z.string().optional().describe('Cookie path (defaults to /)'),
  secure:   z.boolean().optional().describe('Secure cookie (HTTPS only)'),
  httpOnly: z.boolean().optional().describe('HttpOnly flag (currently not supported by the document.cookie setter)'),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional().describe('SameSite policy'),
  expires:  z.number().optional().describe('Expiry as a Unix timestamp in seconds'),
});

export const setCookie = {
  schema: {
    name: 'browser_set_cookie',
    description: 'Set or update a browser cookie',
    inputSchema: jsonSchema(SetCookieSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {Object} params
   */
  handle: async (ctx, params) => {
    const p = SetCookieSchema.parse(params);

    // Utiliser execute_script pour définir le cookie via document.cookie
    // (alternative sans CDP, pour les cookies non-httpOnly)
    let cookieStr = `${p.name}=${p.value}`;
    if (p.domain)   cookieStr += `; domain=${p.domain}`;
    if (p.path)     cookieStr += `; path=${p.path}`;
    else             cookieStr += '; path=/';
    if (p.secure)   cookieStr += '; secure';
    if (p.sameSite) cookieStr += `; samesite=${p.sameSite}`;
    if (p.expires)  cookieStr += `; expires=${new Date(p.expires * 1000).toUTCString()}`;

    const code = `document.cookie = ${JSON.stringify(cookieStr)}; 'ok'`;
    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Cookie "${p.name}" défini.` }] };
  },
};

/* ─── browser_delete_cookie ─── */

const DeleteCookieSchema = z.object({
  name: z.string().describe('Name of the cookie to delete'),
  url:  z.string().optional().describe('Cookie URL (accepted for compatibility; deletion uses the active page)'),
  path: z.string().optional().describe('Cookie path (defaults to /)'),
});

export const deleteCookie = {
  schema: {
    name: 'browser_delete_cookie',
    description: 'Delete a specific browser cookie by name',
    inputSchema: jsonSchema(DeleteCookieSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ name: string, url?: string, path?: string }} params
   */
  handle: async (ctx, params) => {
    const { name, path } = DeleteCookieSchema.parse(params);

    // Supprimer via document.cookie en mettant une date d'expiration passée
    const code = `
      document.cookie = ${JSON.stringify(name)} + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path ?? '/'}';
      'ok'
    `;
    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Cookie "${name}" supprimé.` }] };
  },
};

/* ─── browser_get_storage ─── */

const GetStorageSchema = z.object({
  type: z.enum(['local', 'session', 'both']).optional()
    .describe('Storage to read: local, session, or both (default: both)'),
});

export const getStorage = {
  schema: {
    name: 'browser_get_storage',
    description: 'Read localStorage and/or sessionStorage of the active tab',
    inputSchema: jsonSchema(GetStorageSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ type?: 'local'|'session'|'both' }} params
   */
  handle: async (ctx, params) => {
    const { type } = GetStorageSchema.parse(params ?? {});
    const storageType = type ?? 'both';

    const result = await ctx.sendExecute('getStorage', { type: storageType });
    if (!result || typeof result !== 'object') {
      return { content: [{ type: 'text', text: 'Erreur : impossible de lire le storage.' }], isError: true };
    }

    const lines = [];
    if (storageType === 'local' || storageType === 'both') {
      lines.push('=== localStorage ===');
      const entries = Object.entries(result.local ?? {});
      lines.push(entries.length ? entries.map(([k, v]) => `  ${k}: ${v}`).join('\n') : '  (vide)');
    }
    if (storageType === 'session' || storageType === 'both') {
      lines.push('=== sessionStorage ===');
      const entries = Object.entries(result.session ?? {});
      lines.push(entries.length ? entries.map(([k, v]) => `  ${k}: ${v}`).join('\n') : '  (vide)');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
