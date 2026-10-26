import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import WebSocket from 'ws';

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function connectSocket(port) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      return socket;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error('WebSocket server did not start');
}

test('MCP tools use the single local socket', { timeout: 10000 }, async () => {
  const port = await freePort();
  const transport = new StdioClientTransport({ command: process.execPath, args: ['server.js', '--execute-port', String(port)], cwd: process.cwd(), stderr: 'pipe' });
  const client = new Client({ name: 'integration-test', version: '1.0.0' });
  let socket;
  try {
    await client.connect(transport);
    assert.equal(client.getServerVersion().name, 'BrowserMCP Extended');
    socket = await connectSocket(port);
    socket.on('message', data => {
      const message = JSON.parse(data.toString());
      if (!message.id) return;
      const results = {
        listTabs: [{ tabId: 9, title: 'Example', url: 'https://example.com', active: true }],
        browser_navigate: true,
        getUrl: 'https://example.com',
        getTitle: 'Example',
        browser_snapshot: '- button "OK" [ref=e1]',
        setFileInputFiles: { success: true },
        networkCapture: { tabId: 9, capturing: true, count: 0 },
      };
      socket.send(JSON.stringify({ type: 'messageResponse', payload: { requestId: message.id, result: results[message.type] } }));
    });
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 39);
    const capture = await client.callTool({ name: 'browser_network_start', arguments: { tabId: 9 } });
    assert.equal(JSON.parse(capture.content[0].text).capturing, true);
    const tabs = await client.callTool({ name: 'browser_list_tabs', arguments: {} });
    assert.match(tabs.content[0].text, /example.com/);
    const nav = await client.callTool({ name: 'browser_navigate', arguments: { url: 'https://example.com' } });
    assert.match(nav.content[0].text, /Page Snapshot/);
    const upload = await client.callTool({ name: 'browser_upload_file', arguments: { selector: '#file', filePath: 'package.json' } });
    assert.match(upload.content[0].text, /Fichier déposé/);
  } finally {
    socket?.close();
    await client.close();
  }
});

test('occupied port stays owned by its current process', { timeout: 5000 }, async () => {
  const { spawn } = await import('node:child_process');
  const listener = net.createServer();
  const connections = new Set();
  listener.on('connection', socket => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  try {
    const child = spawn(process.execPath, ['server.js', '--execute-port', String(port)], { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] });
    const exitCode = await new Promise((resolve, reject) => {
      child.once('exit', resolve);
      child.once('error', reject);
    });
    assert.notEqual(exitCode, 0);
    assert.equal(listener.listening, true);
  } finally {
    for (const socket of connections) socket.destroy();
    await new Promise(resolve => listener.close(resolve));
  }
});

test('two MCP clients share one browser socket and expose all tools', { timeout: 10000 }, async () => {
  const port = await freePort();
  const firstTransport = new StdioClientTransport({ command: process.execPath, args: ['server.js', '--execute-port', String(port)], cwd: process.cwd(), stderr: 'pipe' });
  const secondTransport = new StdioClientTransport({ command: process.execPath, args: ['server.js', '--execute-port', String(port)], cwd: process.cwd(), stderr: 'pipe' });
  const first = new Client({ name: 'first-client', version: '1.0.0' });
  const second = new Client({ name: 'second-client', version: '1.0.0' });
  let socket;
  try {
    await first.connect(firstTransport);
    await second.connect(secondTransport);
    socket = await connectSocket(port);
    socket.on('message', data => {
      const message = JSON.parse(data.toString());
      if (message.type === 'listTabs') {
        socket.send(JSON.stringify({ type: 'messageResponse', payload: { requestId: message.id, result: [{ tabId: 9, title: 'Shared', url: 'https://example.com', active: true }] } }));
      }
    });
    assert.equal((await first.listTools()).tools.length, 39);
    assert.equal((await second.listTools()).tools.length, 39);
    const result = await second.callTool({ name: 'browser_list_tabs', arguments: {} });
    assert.match(result.content[0].text, /Shared/);
    await first.close();
    socket = await connectSocket(port);
    socket.on('message', data => {
      const message = JSON.parse(data.toString());
      if (message.type === 'listTabs') {
        socket.send(JSON.stringify({ type: 'messageResponse', payload: { requestId: message.id, result: [{ tabId: 10, title: 'Rejoined', url: 'https://example.com', active: true }] } }));
      }
    });
    const afterFailover = await second.callTool({ name: 'browser_list_tabs', arguments: {} });
    assert.match(afterFailover.content[0].text, /Rejoined/);
  } finally {
    socket?.close();
    await second.close();
    await first.close();
  }
});
