// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/dom.js — Nouveaux tools MCP de manipulation du DOM
 *
 * Tools exposés :
 *   browser_get_html         — récupérer le HTML d'un sélecteur ou de la page
 *   browser_get_text         — récupérer le texte pur d'un sélecteur ou de la page
 *   browser_execute_in_frame — exécuter du code dans une iframe spécifique
 *   browser_scroll           — faire défiler la page ou un élément
 *   browser_upload_file      — uploader un fichier via un input[type=file]
 */

import { z } from 'zod';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { jsonSchema } from './schema.js';

/* ─── browser_get_html ─── */

const GetHtmlSchema = z.object({
  selector: z.string().optional().describe('Target CSS selector (whole page by default)'),
  outerHTML: z.boolean().optional().describe('Return outerHTML instead of innerHTML (default: false)'),
});

export const getHtml = {
  schema: {
    name: 'browser_get_html',
    description: 'Get the HTML content of the page or a specific element',
    inputSchema: jsonSchema(GetHtmlSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ selector?: string, outerHTML?: boolean }} params
   */
  handle: async (ctx, params) => {
    const { selector, outerHTML } = GetHtmlSchema.parse(params ?? {});

    // Code JS injecté dans la page via execute_script
    let code;
    if (selector) {
      code = outerHTML
        ? `document.querySelector(${JSON.stringify(selector)})?.outerHTML ?? 'Sélecteur introuvable'`
        : `document.querySelector(${JSON.stringify(selector)})?.innerHTML ?? 'Sélecteur introuvable'`;
    } else {
      code = `document.documentElement.outerHTML`;
    }

    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: result?.value ?? '' }] };
  },
};

/* ─── browser_get_text ─── */

const GetTextSchema = z.object({
  selector: z.string().optional().describe('Target CSS selector (whole page by default)'),
});

export const getText = {
  schema: {
    name: 'browser_get_text',
    description: 'Get the plain text content of the page or a specific element',
    inputSchema: jsonSchema(GetTextSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ selector?: string }} params
   */
  handle: async (ctx, params) => {
    const { selector } = GetTextSchema.parse(params ?? {});

    const code = selector
      ? `document.querySelector(${JSON.stringify(selector)})?.innerText ?? 'Sélecteur introuvable'`
      : `document.body.innerText`;

    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: result?.value ?? '' }] };
  },
};

/* ─── browser_execute_in_frame ─── */

const ExecuteInFrameSchema = z.object({
  frameId: z.string().describe('Target frame ID, HTML id attribute, or name'),
  code:    z.string().describe('JavaScript expression to evaluate in the frame'),
});

export const executeInFrame = {
  schema: {
    name: 'browser_execute_in_frame',
    description: 'Execute JavaScript code inside a specific iframe',
    inputSchema: jsonSchema(ExecuteInFrameSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ frameId: string, code: string }} params
   */
  handle: async (ctx, params) => {
    const { frameId, code } = ExecuteInFrameSchema.parse(params);
    const result = await ctx.sendExecute('executeInFrame', { frameId, code });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result?.value ?? result) }] };
  },
};

/* ─── browser_scroll ─── */

const ScrollSchema = z.object({
  x:        z.number().optional().describe('Horizontal scroll position in pixels (default: 0)'),
  y:        z.number().optional().describe('Vertical scroll position in pixels'),
  selector: z.string().optional().describe("CSS selector to scroll into view (takes priority over x/y)"),
  behavior: z.enum(['smooth', 'instant', 'auto']).optional().describe('Scroll behavior'),
});

export const scroll = {
  schema: {
    name: 'browser_scroll',
    description: 'Scroll the page or a specific element to given coordinates or into view',
    inputSchema: jsonSchema(ScrollSchema),
  },
  /**
   * @param {import('../server.js').Context} ctx
   * @param {{ x?: number, y?: number, selector?: string, behavior?: string }} params
   */
  handle: async (ctx, params) => {
    const { x, y, selector, behavior } = ScrollSchema.parse(params ?? {});

    let code;
    if (selector) {
      // Faire défiler l'élément dans la vue
      code = `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ behavior: ${JSON.stringify(behavior ?? 'smooth')} })`;
    } else {
      // Défilement de la page
      code = `window.scrollTo({ left: ${x ?? 0}, top: ${y ?? 0}, behavior: ${JSON.stringify(behavior ?? 'smooth')} })`;
    }

    const result = await ctx.sendExecute('executeScript', { code, captureConsole: false });
    if (result?.__ok === false) {
      return { content: [{ type: 'text', text: `Erreur : ${result.error?.message}` }], isError: true };
    }
    return { content: [{ type: 'text', text: selector ? `Scrolled to element "${selector}"` : `Scrolled to (${x ?? 0}, ${y ?? 0})` }] };
  },
};

/* ─── browser_upload_file ─── */

const UploadFileSchema = z.object({
  selector: z.string().describe("CSS selector of an input[type=file] element"),
  filePath: z.string().describe('Absolute or relative local path of the file to upload'),
});

export const uploadFile = {
  schema: {
    name: 'browser_upload_file',
    description: 'Upload a file to a file input element on the page',
    inputSchema: jsonSchema(UploadFileSchema),
  },
  /**
   * Note : Cette opération utilise le CDP setFileInputFiles.
   * Elle nécessite que l'élément soit un input[type=file] accessible.
   * @param {import('../server.js').Context} ctx
   * @param {{ selector: string, filePath: string }} params
   */
  handle: async (ctx, params) => {
    const { selector, filePath } = UploadFileSchema.parse(params);

    const absolutePath = resolve(filePath);
    const file = await stat(absolutePath);
    if (!file.isFile()) throw new Error(`Fichier invalide : ${absolutePath}`);
    const result = await ctx.sendExecute('setFileInputFiles', { selector, filePath: absolutePath });
    if (!result?.success) throw new Error('Le dépôt du fichier a échoué');
    return { content: [{ type: 'text', text: `Fichier déposé dans "${selector}" : ${absolutePath}` }] };
  },
};
