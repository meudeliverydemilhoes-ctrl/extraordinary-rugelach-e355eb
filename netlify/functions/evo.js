// Proxy server-side para a Evolution API (evita bloqueio de CORS do navegador).
// Uso: /.netlify/functions/evo?target=<url-da-evolution-encodada>
// Encaminha method, header apikey e body. Restrito ao host da Evolution.

const ALLOWED_HOST = 'evolution-api-production-36e1.up.railway.app';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const qs = event.queryStringParameters || {};
  let target = qs.target || '';
  if (!target) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing target' }) };
  }
  // o CRM manda o target ja encodado; decodifica
  try { target = decodeURIComponent(target); } catch (e) { /* usa como veio */ }

  if (target.indexOf(ALLOWED_HOST) < 0) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'host nao permitido' }) };
  }

  // monta headers de saida (apikey + content-type)
  const out = { 'Content-Type': 'application/json' };
  const h = event.headers || {};
  const ak = h['apikey'] || h['Apikey'] || h['APIKEY'] || h['apiKey'];
  if (ak) out.apikey = ak;

  const method = event.httpMethod || 'GET';
  const init = { method, headers: out };
  if (method !== 'GET' && method !== 'HEAD' && event.body) {
    init.body = event.body;
  }

  try {
    const r = await fetch(target, init);
    const text = await r.text();
    return {
      statusCode: r.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
      body: text
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: String((e && e.message) || e) })
    };
  }
};
