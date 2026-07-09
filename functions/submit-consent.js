const ZAPIKEY  = '1003.8f0da447a3c4a002abce3cdb11b48c8c.e62123d416ecdadfb7e4fbd009aa6805';
const ZOHO_URL = 'https://www.zohoapis.eu/crm/v7/functions/submit_consent/actions/execute';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function generateHmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  try {
    const body      = await request.json();
    const contactId = body.contact_id || '';
    const token     = body.token || '';

    if (!contactId) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'contact_id is required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Verify HMAC token
    const expectedToken = await generateHmac(contactId, env.HMAC_SECRET);
    if (token !== expectedToken) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid or missing token' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Remove token from body before forwarding to Zoho
    const { token: _t, ...zohoBody } = body;

    const params = new URLSearchParams({ auth_type: 'apikey', zapikey: ZAPIKEY });
    Object.keys(zohoBody).forEach(k => params.set(k, zohoBody[k]));
    const url = `${ZOHO_URL}?${params.toString()}`;

    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(zohoBody),
    });
    const json = await res.json();

    let data;
    if (json.details && json.details.output) {
      try { data = JSON.parse(json.details.output); } catch (e) { data = json.details; }
    } else {
      data = json.details || json;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: 'error', message: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
}
