import test from 'node:test';

// Synthetic issuer configuration for in-memory transports only.
process.env.ACCOUNT_SERVICE_ORIGIN = 'https://10xer-web-production.up.railway.app';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FacebookAPIClient } from '../src/utils/facebook-api.js';
import { getDesktopFacebookToken } from '../src/auth/account-key.js';

test('Desktop obtains an account token only from its configured first-party or local service', async () => {
  const cases = [
    [undefined, 'https://10xer-web-production.up.railway.app/mcp-api/facebook_token'],
    ['http://localhost:8000/mcp-api/sse', 'http://localhost:8000/mcp-api/facebook_token'],
  ];
  for (const [setting, endpoint] of cases) {
    const mock = async (url, options) => {
      assert.equal(url, endpoint);
      assert.equal(options.headers.Authorization, 'Bearer fixture-account');
      assert.equal(options.redirect, 'error');
      return { ok: true, json: async () => ({ success: true, facebook_access_token: 'fixture-meta' }) };
    };
    assert.equal(await getDesktopFacebookToken('fixture-account', setting, mock), 'fixture-meta');
  }
  assert.throws(() => getDesktopFacebookToken('fixture-account', 'https://example.test'), /Unknown desktop/);
});

test('Desktop passes the operator key only through its secret environment field', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url)));
  assert.equal(config.user_config.api_key.sensitive, true);
  assert.deepEqual(config.server.mcp_config.args, ['${__dirname}/src/index.js']);
  assert.equal(config.server.mcp_config.env.API_KEY, '${user_config.api_key}');
});

test('Graph preserves its page cursor and authorizes using the current account', async () => {
  const api = new FacebookAPIClient('fixture-account');
  let count = 0;
  api.client.get = async (url, options) => {
    count++;
    assert.equal(url, 'https://graph.facebook.com/v23.0/me/accounts?after=fixture');
    assert.equal(options.headers.Authorization, 'Bearer fixture-account');
    assert.equal(options.maxRedirects, 0);
    return { data: { data: [] } };
  };
  assert.deepEqual(await api.makeRequestFromFullURL(
    'https://graph.facebook.com/v23.0/me/accounts?after=fixture&access_token=fixture-page'), { data: [] });
  await assert.rejects(api.makeRequestFromFullURL('https://example.test/page'), /Graph pagination/);
  assert.equal(count, 1);
});

test('Remote exchange waits for an explicitly configured issuer', async () => {
  const configured = process.env.ACCOUNT_SERVICE_ORIGIN;
  delete process.env.ACCOUNT_SERVICE_ORIGIN;
  try {
    await assert.rejects(getDesktopFacebookToken('fixture-account', undefined, () => assert.fail('no transport')),
      { status: 503 });
  } finally {
    process.env.ACCOUNT_SERVICE_ORIGIN = configured;
  }
});

test('Normal account resource paths use the configured Graph transport', async () => {
  const client = new FacebookAPIClient('fixture-token');
  assert.equal(client.client.defaults.maxRedirects, 0);
  client.client.request = async config => {
    assert.equal(config.url, '/act_123/insights');
    assert.equal(config.params.access_token, 'fixture-token');
    return { data: [] };
  };
  assert.deepEqual(await client.makeRequest('/act_123/insights'), []);
  await assert.rejects(client.makeRequest('https://example.test/resource'), /relative Graph/);
});
