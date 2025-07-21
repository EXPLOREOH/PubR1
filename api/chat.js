export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model = "gpt-4o" } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not set' });
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await openaiRes.json();
    if (data.error) throw new Error(data.error.message);

    res.status(200).json({ response: data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
