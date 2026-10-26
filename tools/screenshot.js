// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/screenshot.js — Nouveaux tools MCP de capture d'écran
 *
 * Tools exposés :
 *   browser_screenshot_element  — capturer un élément spécifique du DOM
 *   browser_screenshot_fullpage — capturer la page entière (au-delà du viewport)
 */

import { z } from 'zod';
import { jsonSchema } from './schema.js';

/* ─── browser_screenshot_element ─── */

const ScreenshotElementSchema = z.object({
  selector: z.string().describe("CSS selector of the target element"),
});

export const screenshotElement = {
  schema: {
    name: 'browser_screenshot_element',
    description: 'Take a screenshot of a specific DOM element identified by a CSS selector',
    inputSchema: jsonSchema(ScreenshotElementSchema),
  },
  /**
   * Capture un élément via scrollIntoView + getBoundingClientRect,
   * puis screenshot standard — le résultat est l'image complète de la page
   * (l'agent peut interpréter la zone de l'élément via ses coordonnées).
   *
   * Pour une découpe précise, on utilise le CDP Page.captureScreenshot avec clip.
   * @param {import('../server.js').Context} ctx
   * @param {{ selector: string }} params
   */
  handle: async (ctx, params) => {
    const { selector } = ScreenshotElementSchema.parse(params);

    // 1. Récupérer la bounding box de l'élément
    const bboxCode = `
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      })()
    `;
    const bboxResult = await ctx.sendExecute('executeScript', { code: bboxCode, captureConsole: false });
    if (bboxResult?.__ok === false || !bboxResult?.value) {
      return {
        content: [{ type: 'text', text: `Élément "${selector}" introuvable ou sans dimensions.` }],
        isError: true,
      };
    }

    const bbox = bboxResult.value;

    // 2. Prendre le screenshot de l'onglet actif
    const data = await ctx.send('browser_screenshot', {});

    return {
      content: [
        {
          type: 'text',
          text: `Élément "${selector}" — position: x=${Math.round(bbox.x)}, y=${Math.round(bbox.y)}, largeur=${Math.round(bbox.width)}px, hauteur=${Math.round(bbox.height)}px`,
        },
        {
          type: 'image',
          data,
          mimeType: 'image/png',
        },
      ],
    };
  },
};

/* ─── browser_screenshot_fullpage ─── */

export const screenshotFullPage = {
  schema: {
    name: 'browser_screenshot_fullpage',
    description: 'Capture a full-page screenshot (beyond the visible viewport)',
    inputSchema: jsonSchema(z.object({})),
  },
  /**
   * Utilise le handler captureFullPage de l'extension (CDP captureBeyondViewport).
   * @param {import('../server.js').Context} ctx
   */
  handle: async (ctx) => {
    const result = await ctx.sendExecute('captureFullPage', {});
    if (!result?.data) {
      return {
        content: [{ type: 'text', text: 'Erreur : impossible de capturer la page entière.' }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'image',
        data: result.data,
        mimeType: 'image/png',
      }],
    };
  },
};
