const https = require('https');

const ZAPIKEY  = '1003.8f0da447a3c4a002abce3cdb11b48c8c.e62123d416ecdadfb7e4fbd009aa6805';
const ZOHO_URL = 'https://www.zohoapis.eu/crm/v7/functions/get_consent_data/actions/execute';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function zohoGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Bad JSON from Zoho: ' + raw.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const contactId = (event.queryStringParameters || {}).contact_id || '';
  if (!contactId) {
    return { statusCode: 400, headers: CORS,
             body: JSON.stringify({ status: 'error', message: 'contact_id is required' }) };
  }

  try {
    const url  = `${ZOHO_URL}?auth_type=apikey&zapikey=${ZAPIKEY}&contact_id=${encodeURIComponent(contactId)}`;
    const json = await zohoGet(url);
    const data = json.details || json;
    return { statusCode: 200,
             headers: { ...CORS, 'Content-Type': 'application/json' },
             body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: CORS,
             body: JSON.stringify({ status: 'error', message: err.message }) };
  }
};
