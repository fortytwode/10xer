import test from 'node:test';

// Synthetic issuer configuration for in-memory transports only.
process.env.ACCOUNT_SERVICE_ORIGIN = 'https://10xer-web-production.up.railway.app';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import axios from 'axios';
import { UniversalFacebookAdsServer } from '../src/universal-server.js';
import { getAccountFacebookToken } from '../src/auth/account-key.js';

const toolName = 'facebook_list_ad_accounts';
const toolMessage = { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: toolName, arguments: {} } };
const tokenUrl = 'https://10xer-web-production.up.railway.app/mcp-api/facebook_token';

function fixtureProviders(t) {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, tokenUrl);
    assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.keys(options.headers).sort(), ['Accept', 'Authorization']);
    const key = options.headers.Authorization.split(' ')[1];
    if (!['fixture-a', 'fixture-b'].includes(key)) return new Response(null, { status: 401 });
    return Response.json({ success: true, facebook_access_token: 'meta-' + key });
  });
  const oldAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async config => {
    const token = config.params?.access_token || config.headers.Authorization?.replace(/^Bearer /, '');
    assert.ok(['meta-fixture-a', 'meta-fixture-b'].includes(token));
    const owner = token.endsWith('-a') ? 'owner-a' : 'owner-b';
    if (config.url === '/me') return { data: { id: owner }, status: 200 };
    assert.equal(config.url, '/' + owner + '/adaccounts');
    return { data: { data: [{ id: owner }] }, status: 200 };
  };
  t.after(() => { axios.defaults.adapter = oldAdapter; });
}

// Invoke the registered handlers and native SDK transport against memory streams.
class Result extends EventEmitter {
  statusCode = 200;
  status(code) { this.statusCode = code; return this; }
  json(data) { this.value = data; return this; }
  writeHead(code) { this.status(code); this.headersSent = true; return this; }
  write(data) { this.emit('chunk', data); return true; }
  end() { return this; }
}

function invoke(server, method, path, { key, body, query = {}, params = {}, response = new Result() } = {}) {
  const req = {
    body, params, query, headers: { 'content-type': 'application/json' },
    get: name => name.toLowerCase() === 'authorization' && key ? 'Bearer ' + key : undefined,
  };
  return (async () => {
    for (const { route } of server.apiServer._router.stack) {
      if (route?.path !== path || !route.methods[method]) continue;
      let next = false;
      await route.stack[0].handle(req, response, () => { next = true; });
      if (!next) return response;
    }
    throw new Error('Missing route ' + path);
  })();
}

test('account credential stays on the fixed account endpoint and provider failures are generic', async () => {
  let called = false;
  await assert.rejects(getAccountFacebookToken('', () => { called = true; }), { status: 401 });
  assert.equal(called, false);
  for (const status of [302, 401, 403, 404, 503]) {
    await assert.rejects(getAccountFacebookToken('fixture-a', async (url, options) => {
      assert.equal(url, tokenUrl);
      assert.equal(options.redirect, 'error');
      return new Response(null, { status });
    }), error => [401, 403, 502].includes(error.status) && !error.message.includes('fixture-a'));
  }
});

test('REST, OpenAI, Gemini, test manifest and direct MCP authenticate each caller', async t => {
  fixtureProviders(t);
  const server = new UniversalFacebookAdsServer();
  const rows = [
    ['/tools/:name', {}, { name: toolName }],
    ['/openai/functions', { function_call: { name: toolName, arguments: {} } }],
    ['/gemini/functions', { function_call: { name: toolName, args: {} } }],
    ['/test-manifest/:variant', toolMessage, { variant: 'mcp' }],
    ['/mcp', toolMessage],
  ];
  for (const [path, body, params] of rows) {
    assert.equal((await invoke(server, 'post', path, { body, params })).statusCode, 401);
    const [one, two] = await Promise.all(['fixture-a', 'fixture-b'].map(key =>
      invoke(server, 'post', path, { key, body, params })));
    assert.equal(one.statusCode, 200);
    assert.equal(two.statusCode, 200);
    const first = JSON.stringify(one.value);
    const second = JSON.stringify(two.value);
    assert.match(first, /owner-a/);
    assert.doesNotMatch(first, /owner-b|fixture-a/);
    assert.match(second, /owner-b/);
    assert.doesNotMatch(second, /owner-a|fixture-b/);
  }
});

test('native SSE connects, binds each message to its owner, and releases the stream on close', async t => {
  fixtureProviders(t);
  const server = new UniversalFacebookAdsServer();
  for (const endpoint of ['/mcp', '/mcp/sse']) {
    const stream = new Result();
    const initialEvent = once(stream, 'chunk');
    await invoke(server, 'get', endpoint, { key: 'fixture-a', response: stream });
    const [event] = await initialEvent;
    const relative = event.split('data: ')[1].trim();
    const session = new URL(relative, 'https://fixture.invalid');
    assert.equal(session.pathname, endpoint);
    const query = { sessionId: session.searchParams.get('sessionId') };
    assert.equal(server.sseSessions.size, 1);
    for (const [key, expected] of [[undefined, 401], ['fixture-b', 404]]) {
      const reply = await invoke(server, 'post', endpoint, { key, query, body: toolMessage });
      assert.equal(reply.statusCode, expected);
    }
    const nextEvent = once(stream, 'chunk', { signal: AbortSignal.timeout(3000) });
    const accepted = await invoke(server, 'post', endpoint, { key: 'fixture-a', query, body: toolMessage });
    assert.equal(accepted.statusCode, 202);
    const [output] = await nextEvent;
    assert.match(output, /owner-a/);
    assert.doesNotMatch(output, /owner-b|fixture-a/);
    stream.emit('close');
    assert.equal(server.sseSessions.size, 0);
  }
});

test('stdio uses the configured local account while hosted calls still require a caller credential', async t => {
  fixtureProviders(t);
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const previous = process.env.API_KEY;
  process.env.API_KEY = 'fixture-b';
  t.after(() => {
    if (previous === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = previous;
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const connect = Server.prototype.connect;
  t.mock.method(Server.prototype, 'connect', function () { return connect.call(this, serverTransport); });
  const app = new UniversalFacebookAdsServer();
  await app.startMCP();
  const client = new Client({ name: 'offline-test', version: '1' });
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: toolName, arguments: {} });
    assert.match(result.content[0].text, /owner-b/);
    const anonymous = await invoke(app, 'post', '/tools/:name', { params: { name: toolName }, body: {} });
    assert.equal(anonymous.statusCode, 401);
  } finally {
    await client.close();
  }
});
