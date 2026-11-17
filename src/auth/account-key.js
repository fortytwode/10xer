const TOKEN_URL = 'https://10xer-web-production.up.railway.app/mcp-api/facebook_token';

function authError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateAccountKey(key) {
  if (typeof key !== 'string' || !/^[\x21-\x7e]+$/.test(key) || key.length > 4096) {
    throw authError(401, 'A 10xer account API key is required.');
  }
  return key;
}

export function parseAccountBearer(header) {
  const match = typeof header === 'string' && /^Bearer ([^\s]+)$/i.exec(header);
  return validateAccountKey(match && match[1]);
}

export async function getAccountFacebookToken(accountKey, fetchImpl = globalThis.fetch) {
  const key = validateAccountKey(accountKey);
  if (process.env.ACCOUNT_SERVICE_ORIGIN !== new URL(TOKEN_URL).origin) {
    throw authError(503, 'Configure the verified 10xer dashboard origin before using an account key.');
  }
  return requestAccountToken(TOKEN_URL, key, fetchImpl);
}

// The local testing bundle uses the original development backend on loopback.
export function getDesktopFacebookToken(accountKey, sseUrl, fetchImpl = globalThis.fetch) {
  if (sseUrl === 'http://localhost:8000/mcp-api/sse') {
    return requestAccountToken('http://localhost:8000/mcp-api/facebook_token', accountKey, fetchImpl);
  }
  if (sseUrl && sseUrl !== 'https://10xer-web-production.up.railway.app/mcp-api/sse') {
    throw authError(400, 'Unknown desktop account service.');
  }
  return getAccountFacebookToken(accountKey, fetchImpl);
}

async function requestAccountToken(endpoint, accountKey, fetchImpl) {
  const key = validateAccountKey(accountKey);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw authError(502, 'The 10xer account service is unavailable.');
  }
  if (response.status === 401 || response.status === 403) {
    throw authError(401, 'The 10xer account API key was declined.');
  }
  if (response.status === 404) throw authError(403, 'Connect Facebook on your 10xer Integrations page.');
  if (!response.ok) throw authError(502, 'The 10xer account service is unavailable.');
  const data = await response.json().catch(() => null);
  if (!data?.success || typeof data.facebook_access_token !== 'string' || !data.facebook_access_token.trim()) {
    throw authError(502, 'The 10xer account service returned an invalid response.');
  }
  return data.facebook_access_token;
}
