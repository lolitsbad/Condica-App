// Vercel Serverless Function.
// Keeps ANTHROPIC_API_KEY on the server — never exposed to the browser.
// Deploy with the env var ANTHROPIC_API_KEY set in your Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY nu este setată pe server.' });
    return;
  }

  const { kind, system, messages } = req.body || {};
  if (!system || !messages) {
    res.status(400).json({ error: 'Lipsesc "system" sau "messages" din cerere.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: errText });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('\n');
    res.status(200).json({ text, kind: kind || 'generic' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
