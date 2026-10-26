// BrowserMCP Extended: modified standalone distribution; see NOTICE.
import { z } from 'zod';
import { jsonSchema } from './schema.js';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const tab = { tabId: z.number().int().positive().optional().describe('Tab to capture or inspect (active tab by default).') };
function tool(name, description, action, shape) {
  const schema = z.object({ ...tab, ...shape });
  return {
    schema: { name, description, inputSchema: jsonSchema(schema) },
    async handle(ctx, args) {
      const params = schema.parse(args ?? {});
      const { filePath, ...payload } = params;
      const result = await ctx.sendExecute('networkCapture', { ...payload, action });
      if (filePath) {
        const path = resolve(filePath);
        await writeFile(path, JSON.stringify(result, null, 2), { flag: 'wx' });
        return { content: [{ type: 'text', text: JSON.stringify({ filePath: path, entries: result.log.entries.length }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  };
}
export const networkStart = tool('browser_network_start', 'Start network capture on a tab. Captures future HTTP requests, responses, failures and WebSocket messages. Reload the page afterwards to capture initial loading. Starting an already active capture preserves it; starting a stopped capture resets its buffer.', 'start', {
  captureBodies: z.boolean().optional().describe('Collect response bodies (default: true). Text is capped at 262144 characters per response, with 8388608 characters shared by response bodies and WebSocket frames.'),
  maxEntries: z.number().int().min(1).max(5000).optional().describe('Maximum retained requests (1000 by default). Oldest requests are evicted.'),
});
export const networkStop = tool('browser_network_stop', 'Stop capture and release the debugger. Recorded requests and captured bodies remain available until clear, restart or extension reload.', 'stop', {});
export const networkList = tool('browser_network_list', 'List captured requests with IDs, URLs, methods, statuses, durations and failures. Supports filters and pagination. Use the returned id in browser_network_detail.', 'list', {
  url: z.string().optional().describe('URL substring filter'),
  method: z.string().optional().describe('HTTP method filter'),
  status: z.number().int().min(100).max(599).optional().describe('HTTP status filter'),
  resourceType: z.string().optional().describe('Resource type filter, e.g. Fetch, XHR, Document, WebSocket'),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export const networkDetail = tool('browser_network_detail', 'Read a captured request including headers, query URL, POST data, response body, timing, errors and WebSocket frames. Bodies can be unavailable or truncated; see bodyError and truncated fields.', 'detail', {
  requestId: z.string().min(1).describe('Exact id returned by browser_network_list'),
});
export const networkClear = tool('browser_network_clear', 'Clear the captured network buffer without stopping an active capture.', 'clear', {});
export const networkExportHar = tool('browser_network_export_har', 'Export captured traffic as HAR 1.2. Returns HAR JSON, or writes a new file on the MCP server machine if filePath is supplied. Existing files are not overwritten. Timing phases are aggregated; unavailable fields use HAR sentinel values.', 'exportHar', {
  filePath: z.string().min(1).optional().describe('Optional output .har file path on the MCP server machine'),
});
