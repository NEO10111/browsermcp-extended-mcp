import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as exports from '../tools/index.js';
const tools = Object.values(exports).filter(t => t?.schema && t?.handle).map(t => t.schema).sort((a, b) => a.name.localeCompare(b.name));
assert.equal(tools.length, 39);
assert.equal(new Set(tools.map(t => t.name)).size, 39);
const examples = {
  browser_navigate: { url: 'https://example.org' }, browser_go_back: {}, browser_go_forward: {}, browser_wait: { time: 1 },
  browser_press_key: { key: 'Enter' }, browser_snapshot: {}, browser_click: { element: 'Save button', ref: 'e1' },
  browser_hover: { element: 'Help link', ref: 'e2' }, browser_type: { element: 'Search field', ref: 'e3', text: 'MCP', submit: false },
  browser_select_option: { element: 'Region', ref: 'e4', values: ['eu'] },
  browser_drag: { startElement: 'Source', startRef: 'e1', endElement: 'Target', endRef: 'e2' },
  browser_screenshot: {}, browser_get_console_logs: {}, execute_script: { code: '(() => ({title: document.title}))()', captureConsole: true },
  browser_list_tabs: {}, browser_switch_tab: { tabId: 123 }, browser_new_tab: { url: 'https://example.org' }, browser_close_tab: { tabId: 123 },
  browser_get_html: { selector: 'main', outerHTML: true }, browser_get_text: { selector: 'h1' },
  browser_execute_in_frame: { frameId: 'checkout', code: 'document.title' }, browser_scroll: { y: 600, behavior: 'smooth' },
  browser_upload_file: { selector: 'input[type=file]', filePath: '/absolute/path/example.txt' },
  browser_get_cookies: { url: 'https://example.org' }, browser_set_cookie: { name: 'theme', value: 'dark', path: '/' },
  browser_delete_cookie: { name: 'theme', path: '/' }, browser_get_storage: { type: 'both' },
  browser_screenshot_element: { selector: 'main' }, browser_screenshot_fullpage: {},
  browser_drag_drop: { sourceSelector: '#source', targetSelector: '#target' }, browser_dialog_handle: { action: 'accept' },
  browser_clipboard_write: { text: 'Example text' }, browser_reload: { hard: true },
  browser_network_start: { tabId: 123, captureBodies: true, maxEntries: 1000 }, browser_network_stop: { tabId: 123 },
  browser_network_list: { tabId: 123, resourceType: 'Fetch', limit: 50 },
  browser_network_detail: { tabId: 123, requestId: '12345.1:1' }, browser_network_clear: { tabId: 123 },
  browser_network_export_har: { tabId: 123, filePath: '/absolute/path/capture.har' },
};
const notes = {
  browser_snapshot: 'Returns a simplified summary of at most 250 visible interactive elements. References are shared and should be regenerated after changes.',
  browser_screenshot_element: 'Returns the element bounding box and a viewport image; it does not crop the image to the element.',
  browser_get_console_logs: 'Reads a shared buffer of logs captured during execute_script calls; continuous page console monitoring is not implemented.',
  execute_script: 'Input is an evaluated expression. Use an IIFE for statements. The world hint is accepted but is not currently enforced.',
  browser_set_cookie: 'Uses document.cookie on the active tab. HttpOnly cannot be set by this implementation.',
  browser_delete_cookie: 'Uses document.cookie on the active tab. The url argument is accepted but not used to select a different cookie origin.',
  browser_press_key: 'Dispatches synthetic DOM key events; native default keyboard behavior is not guaranteed.',
  browser_upload_file: 'Validates a regular file on the MCP server machine and assigns it to the selected file input through CDP. Assignment does not submit a form.',
  browser_reload: 'Reloads the active tab through chrome.tabs.reload. hard requests bypassCache, rather than clearing the entire browser cache.',
};
function type(s) {
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' | ');
  if (s.anyOf) return s.anyOf.map(type).join(' | ');
  if (s.type === 'array') return `${type(s.items || {})}[]`;
  return s.type || 'object';
}
let markdown = '# MCP tool reference\n\nGenerated from the runtime tool schemas with `npm run docs:tools`. Do not edit\nthis file manually. See [LIMITATIONS.md](LIMITATIONS.md) and [NETWORK.md](NETWORK.md)\nfor behavior that a schema alone cannot describe.\n\nThere are **39 tools**. Most non-network tools operate on the active tab.\nAll example tab IDs, request IDs, references, selectors, and paths are illustrative.\n\n## Index\n\n';
for (const t of tools) markdown += `- [\`${t.name}\`](#${t.name.replaceAll('_', '_')})\n`;
for (const t of tools) {
  assert.equal(t.inputSchema.type, 'object');
  const required = t.inputSchema.required || [];
  for (const field of required) assert.ok(field in examples[t.name], `${t.name} example omits ${field}`);
  markdown += `\n## ${t.name}\n\n${t.description}\n`;
  if (notes[t.name]) markdown += `\n${notes[t.name]}\n`;
  const properties = Object.entries(t.inputSchema.properties || {});
  if (properties.length) {
    markdown += '\n| Parameter | Type | Required | Description |\n| --- | --- | --- | --- |\n';
    for (const [name, p] of properties) markdown += `| \`${name}\` | ${type(p).replaceAll('|', '\\|')} | ${required.includes(name) ? 'Yes' : 'No'} | ${(p.description || 'See usage example.').replaceAll('|', '\\|')} |\n`;
  } else markdown += '\nNo parameters.\n';
  markdown += `\n\`\`\`json\n${JSON.stringify({ name: t.name, arguments: examples[t.name] }, null, 2)}\n\`\`\`\n`;
}
const outputs = { 'docs/TOOLS.md': markdown, 'docs/tools.json': JSON.stringify({ tools }, null, 2) + '\n' };
await mkdir('docs', { recursive: true });
for (const [file, content] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) assert.equal(await readFile(file, 'utf8'), content, `${file} is stale; run npm run docs:tools`);
  else await writeFile(file, content);
}
console.log(`Validated and ${process.argv.includes('--check') ? 'checked' : 'generated'} documentation for ${tools.length} tools.`);
