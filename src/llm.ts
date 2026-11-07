import { endpoint, parseDelta, sseParser, type Delta } from './core';
import type { Provider } from './types';

export interface WireMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Stream a chat completion from any OpenAI-compatible or Anthropic provider. */
export async function streamChat(
  p: Provider,
  model: string,
  system: string,
  messages: WireMessage[],
  onDelta: (d: Delta) => void,
  signal: AbortSignal,
): Promise<void> {
  const anthropic = p.protocol === 'anthropic';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (anthropic) {
    headers['x-api-key'] = p.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (p.apiKey) {
    headers.authorization = `Bearer ${p.apiKey}`;
  }
  const body = anthropic
    ? { model, system, messages, max_tokens: 8192, stream: true }
    : { model, messages: [{ role: 'system', content: system }, ...messages], stream: true };

  const res = await fetch(endpoint(p), { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 400)}`);
  if (!res.body) throw new Error('Empty response body');

  const feed = sseParser();
  const dec = new TextDecoder();
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    for (const payload of feed(dec.decode(value, { stream: true }))) {
      const d = parseDelta(p.protocol, payload);
      if (d === 'done') return;
      if (d) onDelta(d);
    }
  }
}
