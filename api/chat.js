// /api/chat.js
export const config = { runtime: 'edge' };               // run fast at Vercel Edge

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  const { prompt, model = 'gpt-4o', memoryKey, textFile, image } = await req.json();
  if (!prompt)  return resp({ error: 'Prompt required' }, 400);

  const kvURL   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const apiKey  = process.env.OPENAI_API_KEY;

  // ---------- 1. load memory (cached text) ----------
  let memoryText = '';
  if (memoryKey && kvURL && kvToken) {
    const memRes = await fetch(`${kvURL}/get/${memoryKey}`, { headers: { Authorization: `Bearer ${kvToken}` }});
    if (memRes.ok) memoryText = await memRes.text();
  }

  // ---------- 2. build messages ----------
  const messages = [{ role: 'user', content: prompt + (memoryText ? `\n\n---\n\n${memoryText}` : '') }];

  if (image) {                          // image is base64 sent from client
    messages.push({ type: 'image_url', image_url: { url: image }});
  }

  // ---------- 3. call OpenAI ----------
  const opRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages })
  });
  const data = await opRes.json();
  if (data.error) return resp({ error: data.error.message }, 500);

  // ---------- 4. persist new text file (if any) ----------
  if (textFile && kvURL && kvToken && memoryKey) {
    await fetch(`${kvURL}/set/${memoryKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'text/plain' },
      body: textFile
    });
  }

  return resp({ response: data.choices[0].message.content.trim() }, 200);
}

function resp(obj, status=200) {
  return new Response(JSON.stringify(obj), { status, headers:{ 'Content-Type':'application/json' }});
}
