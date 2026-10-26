import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, cp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { WebSocketServer } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
test('real Chromium extension captures HTTP, redirects, WebSocket and exports HAR', { timeout: 60000 }, async () => {
  const folder = await mkdtemp(join(tmpdir(), 'browsermcp-network-'));
  const extension = join(folder, 'extension');
  const server = http.createServer(async (req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { Location: '/api' }); res.end(); return; }
    if (req.url === '/missing') { res.writeHead(404); res.end('missing'); return; }
    if (req.url === '/api' || req.url === '/echo') {
      let body = ''; for await (const chunk of req) body += chunk;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Network-Test', 'captured');
      res.end(JSON.stringify({ ok: true, method: req.method, body })); return;
    }
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Network fixture</title><h1>Network fixture</h1>');
  });
  const wss = new WebSocketServer({ server });
  wss.on('connection', socket => socket.on('message', data => socket.send(data.toString())));
  let browser;
  const client = new Client({ name: 'real-browser-network-test', version: '1.0' });
  let browserLog = '';
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const port = await freePort();
    let extensionSource = process.env.BROWSERMCP_EXTENSION_PATH;
    if (!extensionSource) {
      for (const candidate of ['../browsermcp-extended-extension', '../extension']) {
        try { await access(resolve(candidate, 'manifest.json')); extensionSource = candidate; break; } catch {}
      }
    }
    assert.ok(extensionSource, 'Set BROWSERMCP_EXTENSION_PATH to the companion extension checkout');
    await cp(resolve(extensionSource), extension, { recursive: true, filter: source => !['node_modules', '.git'].includes(source.split('/').at(-1)) });
    const apiPath = join(extension, 'background/execute-script-api.js');
    await writeFile(apiPath, (await readFile(apiPath, 'utf8')).replace('let WS_PORT = 9877;', `let WS_PORT = ${port};`));
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('server.js'), '--execute-port', String(port)], stderr: 'pipe' }));
    browser = spawn(process.env.CHROMIUM || '/usr/bin/chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-component-update', `--user-data-dir=${join(folder, 'profile')}`, `--disable-extensions-except=${extension}`, `--load-extension=${extension}`, base], { stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', data => { browserLog = (browserLog + data).slice(-5000); });
    const call = async (name, args = {}) => {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
      return result.content[0].type === 'text' ? result.content[0].text : result.content[0];
    };
    let tabs;
    for (let attempt = 0; attempt < 80; attempt++) {
      try { tabs = await call('browser_list_tabs'); if (tabs.includes(base)) break; } catch {}
      await pause(100);
    }
    assert.ok(tabs?.includes(base), `Extension did not connect. ${browserLog}`);
    const match = tabs.match(/^\[(\d+)\].*Network fixture/m) || tabs.match(/^\[(\d+)\]/m);
    const tabId = Number(match[1]);
    await call('browser_switch_tab', { tabId });
    const start = JSON.parse(await call('browser_network_start', { tabId }));
    assert.equal(start.capturing, true);
    await call('browser_reload', { hard: true });
    await pause(300);
    await call('execute_script', { code: `(async () => { await fetch('/api'); await fetch('/echo', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({test: 42})}); await fetch('/redirect'); await fetch('/missing'); await new Promise((resolve, reject) => {const ws = new WebSocket(${JSON.stringify(base.replace('http:', 'ws:'))}); ws.onopen = () => ws.send('network-test'); ws.onmessage = () => {ws.close(); resolve();}; ws.onerror = reject;}); return true; })()` });
    const screenshot = await call('browser_screenshot_fullpage');
    assert.equal(screenshot.type, 'image');
    let listed;
    for (let attempt = 0; attempt < 30; attempt++) {
      listed = JSON.parse(await call('browser_network_list', { tabId }));
      if (listed.requests.filter(r => r.url.includes('/api') || r.url.includes('/echo') || r.url.includes('/missing')).every(r => r.finished) && listed.requests.length >= 6) break;
      await pause(100);
    }
    assert.equal(listed.capturing, true, 'screenshot must not detach network capture');
    assert.ok(listed.requests.some(r => r.status === 302));
    assert.ok(listed.requests.some(r => r.status === 404));
    const post = JSON.parse(await call('browser_network_list', { tabId, method: 'POST', url: '/echo', status: 200 }));
    assert.equal(post.total, 1);
    const detail = JSON.parse(await call('browser_network_detail', { tabId, requestId: post.requests[0].id }));
    assert.equal(detail.postData, '{"test":42}');
    assert.equal(JSON.parse(detail.responseBody.body).body, '{"test":42}');
    assert.equal(detail.response.headers['X-Network-Test'] || detail.response.headers['x-network-test'], 'captured');
    const wsEntry = listed.requests.find(r => r.type === 'WebSocket');
    assert.ok(wsEntry);
    const wsDetail = JSON.parse(await call('browser_network_detail', { tabId, requestId: wsEntry.id }));
    assert.ok(wsDetail.frames.some(f => f.direction === 'received' && f.data === 'network-test'));
    await call('browser_network_stop', { tabId });
    const path = join(folder, 'capture.har');
    await call('browser_network_export_har', { tabId, filePath: path });
    const har = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(har.log.version, '1.2');
    assert.ok(har.log.entries.some(e => e.request.method === 'POST' && e.response.content.text.includes('test')));
    await call('browser_network_clear', { tabId });
    assert.equal(JSON.parse(await call('browser_network_list', { tabId })).total, 0);
  } finally {
    if (browser && browser.exitCode == null) {
      const exited = new Promise(resolve => browser.once('exit', resolve));
      browser.kill('SIGTERM');
      await Promise.race([exited, pause(3000)]);
      if (browser.exitCode == null) { browser.kill('SIGKILL'); await exited; }
    }
    await client.close();
    for (const socket of wss.clients) socket.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
    await rm(folder, { recursive: true, force: true });
  }
});
