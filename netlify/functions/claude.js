// Proxy seguro para a API da Anthropic (Claude).
// A chave fica guardada na variável de ambiente ANTHROPIC_API_KEY do Netlify,
// nunca no navegador. O CRM chama /.netlify/functions/claude com o mesmo corpo
// que mandaria pra Anthropic; aqui a gente só adiciona a chave e repassa.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'method not allowed' };
  }
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY nao configurada no Netlify (Site settings > Environment variables).' } })
    };
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: event.body
    });
    const text = await r.text();
    return {
      statusCode: r.status,
      headers: { 'content-type': 'application/json' },
      body: text
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: { message: 'proxy err ' + String(e).slice(0, 200) } })
    };
  }
};
