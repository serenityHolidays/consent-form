// Bulk token generation endpoint.
// POST with JSON body: { "admin_key": "...", "contact_ids": ["id1", "id2", ...] }
// Returns: { "status": "success", "results": [{ "contact_id": "...", "token": "...", "url": "..." }, ...] }

const BASE_URL   = 'https://consent-form-1vb.pages.dev/consent';
const CHUNK_SIZE = 5000;

async function getHmacKey(secret) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
}

async function signId(key, contactId) {
  const encoder  = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(contactId));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try { body = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const adminKey   = body.admin_key   || '';
  const contactIds = body.contact_ids || [];

  if (adminKey !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ status: 'error', message: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return new Response(JSON.stringify({ status: 'error', message: 'contact_ids must be a non-empty array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const key     = await getHmacKey(env.HMAC_SECRET);
    const results = await Promise.all(
      contactIds.map(async function(id) {
        const token = await signId(key, String(id));
        return {
          contact_id: id,
          token:      token,
          url:        `${BASE_URL}?contact_id=${encodeURIComponent(id)}&token=${token}`
        };
      })
    );

    return new Response(JSON.stringify({ status: 'success', count: results.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
