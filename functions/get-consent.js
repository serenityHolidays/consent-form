const ZAPIKEY  = '1003.8f0da447a3c4a002abce3cdb11b48c8c.e62123d416ecdadfb7e4fbd009aa6805';
const ZOHO_URL = 'https://www.zohoapis.eu/crm/v7/functions/get_consent_data/actions/execute';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: CORS });
  }

  const contactId = new URL(request.url).searchParams.get('contact_id') || '';
  if (!contactId) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'contact_id is required' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url  = `${ZOHO_URL}?auth_type=apikey&zapikey=${ZAPIKEY}&contact_id=${encodeURIComponent(contactId)}`;
    const res  = await fetch(url);
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
