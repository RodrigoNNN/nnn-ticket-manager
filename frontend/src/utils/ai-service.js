// AI Service — handles communication with the /api/ai-chat proxy

/**
 * Stream AI response as an async generator yielding content tokens.
 * @param {{ provider: string, apiKey: string, model: string }} settings
 * @param {{ role: string, content: string }[]} messages
 * @yields {string} content token
 */
export async function* streamAiResponse(settings, messages) {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    let msg = `API error: ${response.status}`;
    try {
      const err = await response.json();
      msg = err.error || msg;
    } catch {}
    throw new Error(msg);
  }

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

      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) yield parsed.content;
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }
}

/**
 * Send a non-streaming AI message. Returns the full response text.
 */
export async function sendAiMessage(settings, messages) {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    let msg = `API error: ${response.status}`;
    try {
      const err = await response.json();
      msg = err.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  return data.content;
}

/**
 * Validate an API key by sending a minimal test request.
 * @returns {{ success: boolean, error?: string }}
 */
export async function testApiKey(settings) {
  try {
    const content = await sendAiMessage(settings, [
      { role: 'system', content: 'Reply with exactly: OK' },
      { role: 'user', content: 'Test' },
    ]);
    return { success: !!content };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
