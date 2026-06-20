// Webhook do Evolution -> Supabase (captura de mensagens 24h, server-side)
// Recebe o evento messages.upsert e grava (upsert idempotente) na tabela crm_messages.
const SB_URL = 'https://hxhilzxlptldnazvrkao.supabase.co';
const SB_KEY = 'sb_publishable_AAgpl0EIUB3ekX5fZC4kqA_-ZwYvKys';

function getText(m) {
  if (!m) return '';
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage && m.extendedTextMessage.text) return m.extendedTextMessage.text;
  if (m.imageMessage) return m.imageMessage.caption || '[imagem]';
  if (m.videoMessage) return m.videoMessage.caption || '[vídeo]';
  if (m.documentMessage) return m.documentMessage.caption || m.documentMessage.fileName || '[documento]';
  if (m.audioMessage) return '[áudio]';
  if (m.stickerMessage) return '[figurinha]';
  if (m.locationMessage) return '[localização]';
  if (m.contactMessage) return '[contato]';
  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200, body: 'bad json' }; }

  const d = body.data || {};
  if (!d || !d.key || !d.key.id) return { statusCode: 200, body: 'no message' };

  const row = {
    wa_id: d.key.id,
    instance: body.instance || '',
    remote_jid: d.key.remoteJid || '',
    from_me: !!d.key.fromMe,
    push_name: d.pushName || '',
    msg_type: d.messageType || '',
    text: getText(d.message),
    ts: d.messageTimestamp ? Number(d.messageTimestamp) : Math.floor(Date.now() / 1000),
    raw: d
  };

  try {
    const r = await fetch(SB_URL + '/rest/v1/crm_messages?on_conflict=wa_id', {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) {
      const t = await r.text();
      return { statusCode: 200, body: 'supabase err ' + r.status + ' ' + t.slice(0, 200) };
    }
    return { statusCode: 200, body: 'saved' };
  } catch (e) {
    return { statusCode: 200, body: 'fetch err ' + String(e).slice(0, 200) };
  }
};
