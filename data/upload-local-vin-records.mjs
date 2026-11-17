const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const LOCAL_VIN_UPLOAD_PATH = '/api/v1/local-vin-access';
const DEV_SESSION_PATH = '/api/v1/dev/session';

function normalizeApiBaseUrl(value) {
  return String(value || DEFAULT_API_BASE_URL).trim().replace(/\/$/, '');
}

function apiBaseUrlFromEnvironment() {
  const environment = typeof process === 'undefined' ? {} : process.env;
  return normalizeApiBaseUrl(
    environment.BACKEND_API_BASE_URL ?? environment.VITE_BACKEND_API_BASE_URL,
  );
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseError(response, body) {
  const detail = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  return new Error(`Spring Boot API ${response.status}: ${detail || response.statusText}`);
}

function sessionCookieFromResponse(response) {
  const setCookie = response.headers.get('set-cookie');
  return setCookie?.split(';', 1)[0] ?? null;
}

export async function createSpringDevSession(userId, options = {}) {
  if (!userId || !String(userId).trim()) {
    throw new Error('A Neon user UUID is required to create the Spring development session.');
  }

  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? apiBaseUrlFromEnvironment());
  const response = await fetch(`${apiBaseUrl}${DEV_SESSION_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: String(userId).trim() }),
  });
  const body = await readResponseBody(response);

  if (!response.ok) throw responseError(response, body);

  return {
    apiBaseUrl,
    session: body,
    cookie: sessionCookieFromResponse(response),
  };
}

export async function uploadLocalVinRecords(records, options = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('At least one parsed VIN record is required for upload.');
  }

  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? apiBaseUrlFromEnvironment());
  let sessionCookie = options.sessionCookie ?? null;

  if (!sessionCookie && options.sessionUserId) {
    const devSession = await createSpringDevSession(options.sessionUserId, { apiBaseUrl });
    sessionCookie = devSession.cookie;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (sessionCookie) headers.Cookie = sessionCookie;

  const response = await fetch(`${apiBaseUrl}${LOCAL_VIN_UPLOAD_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ records }),
  });
  const body = await readResponseBody(response);

  if (!response.ok) throw responseError(response, body);
  if (!body || typeof body.insertedCount !== 'number') {
    throw new Error('Spring Boot upload response did not contain insertedCount.');
  }

  return {
    apiBaseUrl,
    path: LOCAL_VIN_UPLOAD_PATH,
    insertedCount: body.insertedCount,
  };
}
