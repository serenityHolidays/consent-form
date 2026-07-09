// Protected endpoint — generates a secure consent form URL for a given contact_id.
// Called by Zoho CRM (or manually) to build links to include in emails.
// Requires: ?contact_id=XXX&admin_key=YOUR_ADMIN_KEY

const BASE_URL = 'https://consent-form-1vb.pages.dev/consent';

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

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const params    = new URL(request.url).searchParams;
  const adminKey  = params.get('admin_key') || '';
  const contactId = params.get('contact_id') || '';

  // Check admin key
  if (adminKey !== env.ADMIN_KEY) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!contactId) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'contact_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = await generateHmac(contactId, env.HMAC_SECRET);
  const url   = `${BASE_URL}?contact_id=${encodeURIComponent(contactId)}&token=${token}`;

  return new Response(
    JSON.stringify({ status: 'success', contact_id: contactId, token, url }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
