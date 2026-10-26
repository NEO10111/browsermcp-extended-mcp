// BrowserMCP Extended: modified standalone distribution; see NOTICE.
/**
 * tools/navigate.js — Tools MCP de navigation (repris de l'original)
 *
 * Contient les tools existants issus du serveur BrowserMCP original :
 *   browser_navigate, browser_go_back, browser_go_forward,
 *   browser_wait, browser_press_key, browser_snapshot,
 *   browser_click, browser_hover, browser_type, browser_select_option,
 *   browser_screenshot, browser_get_console_logs, execute_script
 *
 * Chaque tool suit la forme : { schema: { name, description, inputSchema }, handle: async (ctx, params) => ... }
 */

import { z } from 'zod';
import { jsonSchema } from './schema.js';

/* ─── Utilitaire : capture de snapshot ARIA ─── */

/**
 * Capture le snapshot d'accessibilité de la page courante.
 * @param {import('../server.js').Context} ctx
 * @param {string} [status] - Texte de statut à préfixer
 */
async function captureAriaSnapshot(ctx, status = '') {
  const url      = await ctx.send('getUrl',          undefined);
  const title    = await ctx.send('getTitle',         undefined);
  const snapshot = await ctx.send('browser_snapshot', {});
  return {
    content: [{
      type: 'text',
      text: `${status ? status + '\n' : ''}
- Page URL: ${url}
- Page Title: ${title}
- Page Snapshot
\`\`\`yaml
${snapshot}
\`\`\`
`,
    }],
  };
}

/* ─── browser_navigate ─── */

const NavigateSchema = z.object({
  url: z.string().describe("HTTP(S) URL to navigate to"),
});

export const navigate = {
  schema: {
    name: 'browser_navigate',
    description: 'Navigate to a URL',
    inputSchema: jsonSchema(NavigateSchema),
  },
  handle: async (ctx, params) => {
    const { url } = NavigateSchema.parse(params);
    await ctx.send('browser_navigate', { url });
    return captureAriaSnapshot(ctx, `Navigated to ${url}`);
  },
};

/* ─── browser_go_back ─── */

export const goBack = {
  schema: {
    name: 'browser_go_back',
    description: 'Go back to the previous page',
    inputSchema: jsonSchema(z.object({})),
  },
  handle: async (ctx) => {
    await ctx.send('browser_go_back', {});
    return captureAriaSnapshot(ctx, 'Navigated back');
  },
};

/* ─── browser_go_forward ─── */

export const goForward = {
  schema: {
    name: 'browser_go_forward',
    description: 'Go forward to the next page',
    inputSchema: jsonSchema(z.object({})),
  },
  handle: async (ctx) => {
    await ctx.send('browser_go_forward', {});
    return captureAriaSnapshot(ctx, 'Navigated forward');
  },
};

/* ─── browser_wait ─── */

const WaitSchema = z.object({
  time: z.number().describe("Wait duration in seconds"),
});

export const wait = {
  schema: {
    name: 'browser_wait',
    description: 'Wait for a specified time in seconds',
    inputSchema: jsonSchema(WaitSchema),
  },
  handle: async (ctx, params) => {
    const { time } = WaitSchema.parse(params);
    await ctx.send('browser_wait', { time }, { timeoutMs: Math.max(30_000, (time + 5) * 1000) });
    return { content: [{ type: 'text', text: `Waited for ${time} seconds` }] };
  },
};

/* ─── browser_press_key ─── */

const PressKeySchema = z.object({
  key: z.string().describe('Key name, e.g. ArrowLeft, Enter, a'),
});

export const pressKey = {
  schema: {
    name: 'browser_press_key',
    description: 'Press a key on the keyboard',
    inputSchema: jsonSchema(PressKeySchema),
  },
  handle: async (ctx, params) => {
    const { key } = PressKeySchema.parse(params);
    await ctx.send('browser_press_key', { key });
    return { content: [{ type: 'text', text: `Pressed key ${key}` }] };
  },
};

/* ─── browser_snapshot ─── */

export const snapshot = {
  schema: {
    name: 'browser_snapshot',
    description: 'Capture accessibility snapshot of the current page. Use this for getting references to elements to interact with.',
    inputSchema: jsonSchema(z.object({})),
  },
  handle: async (ctx) => captureAriaSnapshot(ctx),
};

/* ─── Schéma commun Element (ref + description lisible) ─── */
const ElementSchema = z.object({
  element: z.string().describe("Human-readable element description"),
  ref:     z.string().describe("Exact element reference from the latest snapshot"),
});

/* ─── browser_click ─── */

export const click = {
  schema: {
    name: 'browser_click',
    description: 'Perform click on a web page',
    inputSchema: jsonSchema(ElementSchema),
  },
  handle: async (ctx, params) => {
    const p = ElementSchema.parse(params);
    await ctx.send('browser_click', p);
    const snap = await captureAriaSnapshot(ctx);
    return { content: [{ type: 'text', text: `Clicked "${p.element}"` }, ...snap.content] };
  },
};

/* ─── browser_hover ─── */

export const hover = {
  schema: {
    name: 'browser_hover',
    description: 'Hover over element on page',
    inputSchema: jsonSchema(ElementSchema),
  },
  handle: async (ctx, params) => {
    const p = ElementSchema.parse(params);
    await ctx.send('browser_hover', p);
    const snap = await captureAriaSnapshot(ctx);
    return { content: [{ type: 'text', text: `Hovered over "${p.element}"` }, ...snap.content] };
  },
};

/* ─── browser_type ─── */

const TypeSchema = ElementSchema.extend({
  text:   z.string().describe('Text to enter'),
  submit: z.boolean().describe('Submit the associated form after typing'),
});

export const type = {
  schema: {
    name: 'browser_type',
    description: 'Type text into editable element',
    inputSchema: jsonSchema(TypeSchema),
  },
  handle: async (ctx, params) => {
    const p = TypeSchema.parse(params);
    await ctx.send('browser_type', p);
    const snap = await captureAriaSnapshot(ctx);
    return { content: [{ type: 'text', text: `Typed "${p.text}" into "${p.element}"` }, ...snap.content] };
  },
};

/* ─── browser_select_option ─── */

const SelectSchema = ElementSchema.extend({
  values: z.array(z.string()).describe('Option values to select'),
});

export const selectOption = {
  schema: {
    name: 'browser_select_option',
    description: 'Select an option in a dropdown',
    inputSchema: jsonSchema(SelectSchema),
  },
  handle: async (ctx, params) => {
    const p = SelectSchema.parse(params);
    await ctx.send('browser_select_option', p);
    const snap = await captureAriaSnapshot(ctx);
    return { content: [{ type: 'text', text: `Selected option in "${p.element}"` }, ...snap.content] };
  },
};

/* ─── browser_drag ─── */

const DragSchema = z.object({
  startElement: z.string().describe('Human-readable source description'),
  startRef:     z.string().describe('Source reference from the latest snapshot'),
  endElement:   z.string().describe('Human-readable target description'),
  endRef:       z.string().describe('Target reference from the latest snapshot'),
});

export const drag = {
  schema: {
    name: 'browser_drag',
    description: 'Perform drag and drop between two elements',
    inputSchema: jsonSchema(DragSchema),
  },
  handle: async (ctx, params) => {
    const p = DragSchema.parse(params);
    await ctx.send('browser_drag', p);
    const snap = await captureAriaSnapshot(ctx);
    return { content: [{ type: 'text', text: `Dragged "${p.startElement}" to "${p.endElement}"` }, ...snap.content] };
  },
};

/* ─── browser_screenshot ─── */

export const screenshot = {
  schema: {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: jsonSchema(z.object({})),
  },
  handle: async (ctx) => {
    const data = await ctx.send('browser_screenshot', {});
    return { content: [{ type: 'image', data, mimeType: 'image/png' }] };
  },
};

/* ─── browser_get_console_logs ─── */

export const getConsoleLogs = {
  schema: {
    name: 'browser_get_console_logs',
    description: 'Get the console logs from the browser',
    inputSchema: jsonSchema(z.object({})),
  },
  handle: async (ctx) => {
    const logs = await ctx.send('browser_get_console_logs', {});
    const text = (logs ?? []).map(l => JSON.stringify(l)).join('\n');
    return { content: [{ type: 'text', text }] };
  },
};

/* ─── execute_script ─── */

const ExecScriptSchema = z.object({
  code:           z.string().describe('JavaScript expression to evaluate'),
  world:          z.enum(['ISOLATED', 'MAIN']).optional().describe("Execution world hint (currently accepted but not enforced)"),
  timeoutMs:      z.number().optional().describe('Timeout in milliseconds'),
  captureConsole: z.boolean().optional().describe('Capture console output during evaluation'),
});

export const executeScript = {
  schema: {
    name: 'execute_script',
    description: 'Execute arbitrary JavaScript code in the active browser tab and return the result',
    inputSchema: jsonSchema(ExecScriptSchema),
  },
  handle: async (ctx, params) => {
    const p = ExecScriptSchema.parse(params);
    if (!ctx.executeWs) {
      return {
        content: [{ type: 'text', text: 'No execute script connection. Make sure BrowserMCP Extended is loaded and active.' }],
        isError: true,
      };
    }
    const result = await ctx.sendExecute('executeScript', p);
    if (result?.__ok === false) {
      return {
        content: [{ type: 'text', text: `Script execution error: ${result.error?.message ?? 'Unknown error'}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result?.value ?? result) }] };
  },
};
