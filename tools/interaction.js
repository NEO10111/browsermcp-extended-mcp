// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/interaction.js — Nouveaux tools MCP d'interaction avancée
 *
 * Tools exposés :
 *   browser_drag_drop       — glisser-déposer entre deux sélecteurs CSS
 *   browser_dialog_handle   — accepter/rejeter une boîte de dialogue JS
 *   browser_clipboard_write — écrire du texte dans le presse-papiers
 *   browser_reload          — recharger la page (normal ou hard)
 */

import { z } from 'zod';
import { jsonSchema } from './schema.js';

/* ─── browser_drag_drop ─── */

const DragDropSchema = z.object({
  sourceSelector: z.string().describe("CSS selector of the drag source"),
  targetSelector: z.string().describe("CSS selector of the drop target"),
});

export const dragDrop = {
  schema: {
    name: 'browser_drag_drop',
    description: 'Perform a drag-and-drop operation between two elements identified by CSS selectors',
    inputSchema: jsonSchema(DragDropSchema),
  },
  /**
   * Simule un drag & drop via des événements DOM synthétiques (mousedown, mousemove, mouseup, dragstart, drop, dragend).
   * @param {import('../server.js').Context} ctx
   * @param {{ sourceSelector: string, targetSelector: string }} params
   */
  handle: async (ctx, params) => {
    const { sourceSelector, targetSelector } = DragDropSchema.parse(params);

    const code = `
      (() => {
        const src = document.querySelector(${JSON.stringify(sourceSelector)});
        const tgt = document.querySelector(${JSON.stringify(targetSelector)});
        if (!src) return 'Source introuvable : ${sourceSelector}';
        if (!tgt) return 'Cible introuvable : ${targetSelector}';

        // Coordonnées des éléments
        const srcRect = src.getBoundingClientRect();
        const tgtRect = tgt.getBoundingClientRect();
        const srcX = srcRect.left + srcRect.width  / 2;
        const srcY = srcRect.top  + srcRect.height / 2;
        const tgtX = tgtRect.left + tgtRect.width  / 2;
        const tgtY = tgtRect.top  + tgtRect.height / 2;

        // Créer et dispatcher les événements
        const dt = new DataTransfer();
        const fireEv = (el, name, x, y, extra = {}) => {
          el.dispatchEvent(new MouseEvent(name,    { bubbles: true, cancelable: true, clientX: x, clientY: y, ...extra }));
          el.dispatchEvent(new DragEvent(name,     { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt, ...extra }));
        };

        src.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: srcX, clientY: srcY }));
        src.dispatchEvent(new DragEvent('dragstart',  { bubbles: true, cancelable: true, clientX: srcX, clientY: srcY, dataTransfer: dt }));
        tgt.dispatchEvent(new DragEvent('dragover',   { bubbles: true, cancelable: true, clientX: tgtX, clientY: tgtY, dataTransfer: dt }));
        tgt.dispatchEvent(new DragEvent('drop',       { bubbles: true, cancelable: true, clientX: tgtX, clientY: tgtY, dataTransfer: dt }));
        src.dispatchEvent(new DragEvent('dragend',    { bubbles: true, cancelable: true, clientX: tgtX, clientY: tgtY, dataTransfer: dt }));
        tgt.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, clientX: tgtX, clientY: tgtY }));

        return 'ok';
      })()
    `;

    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    const msg = result?.value;
    if (msg !== 'ok') {
      return { content: [{ type: 'text', text: msg ?? 'Erreur inconnue' }], isError: true };
    }
    return { content: [{ type: 'text', text: `Drag & drop effectué de "${sourceSelector}" vers "${targetSelector}"` }] };
  },
};

/* ─── browser_dialog_handle ─── */

const DialogHandleSchema = z.object({
  action:     z.enum(['accept', 'dismiss']).describe('Dialog action: accept or dismiss'),
  promptText: z.string().optional().describe('Text to enter in a prompt dialog'),
});

export const dialogHandle = {
  schema: {
    name: 'browser_dialog_handle',
    description: 'Handle a JavaScript dialog (alert, confirm, or prompt) by accepting or dismissing it',
    inputSchema: jsonSchema(DialogHandleSchema),
  },
  /**
   * Délègue au handler CDP de l'extension (Page.handleJavaScriptDialog).
   * @param {import('../server.js').Context} ctx
   * @param {{ action: string, promptText?: string }} params
   */
  handle: async (ctx, params) => {
    const { action, promptText } = DialogHandleSchema.parse(params);
    const result = await ctx.sendExecute('handleDialog', { action, promptText });
    if (result?.success === false) {
      return { content: [{ type: 'text', text: 'Erreur lors de la gestion de la boîte de dialogue.' }], isError: true };
    }
    return { content: [{ type: 'text', text: `Boîte de dialogue ${action === 'accept' ? 'acceptée' : 'rejetée'}.` }] };
  },
};

/* ─── browser_clipboard_write ─── */

const ClipboardWriteSchema = z.object({
  text: z.string().describe('Text to write to the clipboard'),
});

export const clipboardWrite = {
  schema: {
    name: 'browser_clipboard_write',
    description: 'Write text to the browser clipboard',
    inputSchema: jsonSchema(ClipboardWriteSchema),
  },
  /**
   * Utilise navigator.clipboard.writeText() via execute_script (nécessite le focus de la page).
   * @param {import('../server.js').Context} ctx
   * @param {{ text: string }} params
   */
  handle: async (ctx, params) => {
    const { text } = ClipboardWriteSchema.parse(params);

    const code = `
      (async () => {
        try {
          await navigator.clipboard.writeText(${JSON.stringify(text)});
          return 'ok';
        } catch (e) {
          // Fallback : créer un textarea temporaire
          const ta = document.createElement('textarea');
          ta.value = ${JSON.stringify(text)};
          ta.style.position = 'fixed';
          ta.style.opacity  = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          return 'ok-fallback';
        }
      })()
    `;

    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Presse-papiers mis à jour (${text.length} caractères).` }] };
  },
};

/* ─── browser_reload ─── */

const ReloadSchema = z.object({
  hard: z.boolean().optional().describe('Bypass the cache when reloading (default: false)'),
});

export const reload = {
  schema: {
    name: 'browser_reload',
    description: 'Reload the current browser page, optionally with a hard refresh (cache bypass)',
    inputSchema: jsonSchema(ReloadSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ hard?: boolean }} params
   */
  handle: async (ctx, params) => {
    const { hard } = ReloadSchema.parse(params ?? {});

    await ctx.sendExecute('reload', { hard: !!hard });
    return { content: [{ type: 'text', text: `Page reloaded${hard ? ' (cache bypassed)' : ''}.` }] };
  },
};
