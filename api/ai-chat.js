// Vercel Serverless Function — AI Chat Proxy
// Normalizes OpenAI, Anthropic, and Google Gemini APIs into one SSE stream format

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, apiKey, model, messages, stream } = req.body;

  if (!provider || !apiKey || !messages?.length) {
    return res.status(400).json({ error: 'Missing required fields: provider, apiKey, messages' });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    switch (provider) {
      case 'openai':
        return await handleOpenAI(res, { apiKey, model: model || 'gpt-4o-mini', messages, stream });
      case 'anthropic':
        return await handleAnthropic(res, { apiKey, model: model || 'claude-sonnet-4-20250514', messages, stream });
      case 'gemini':
        return await handleGemini(res, { apiKey, model: model || 'gemini-2.0-flash', messages, stream });
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
  } catch (err) {
    console.error('AI proxy error:', err);
    if (stream && res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function handleOpenAI(res, { apiKey, model, messages, stream }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: !!stream, max_tokens: 2048 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `OpenAI API error: ${response.status}`;
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.status(response.status).json({ error: msg });
  }

  if (!stream) {
    const data = await response.json();
    return res.json({ content: data.choices?.[0]?.message?.content || '' });
  }

  // Stream SSE — OpenAI already uses SSE format
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      } catch {}
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function handleAnthropic(res, { apiKey, model, messages, stream }) {
  // Extract system message
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const body = {
    model,
    max_tokens: 2048,
    messages: chatMessages,
    stream: !!stream,
  };
  if (systemMsg) body.system = systemMsg.content;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Anthropic API error: ${response.status}`;
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.status(response.status).json({ error: msg });
  }

  if (!stream) {
    const data = await response.json();
    const content = data.content?.map(c => c.text).join('') || '';
    return res.json({ content });
  }

  // Stream SSE — Anthropic uses content_block_delta events
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
        } else if (parsed.type === 'message_stop') {
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      } catch {}
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

// ─── Google Gemini ───────────────────────────────────────────────────────────

async function handleGemini(res, { apiKey, model, messages, stream }) {
  // Convert messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }
  body.generationConfig = { maxOutputTokens: 2048 };

  const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}${stream ? '&alt=sse' : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini API error: ${response.status}`;
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.status(response.status).json({ error: msg });
  }

  if (!stream) {
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return res.json({ content });
  }

  // Stream SSE — Gemini with alt=sse returns SSE with JSON chunks
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      } catch {}
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
