import { parseDelta, sseParser, type Delta } from './core';
import { buildRequest, type Wire } from './features';
import type { Provider } from './types';

export type { Wire as WireMessage };

/** Stream a chat completion from any supported provider (Chat Completions, Responses, or Anthropic Messages). */
export async function streamChat(
  p: Provider,
  model: string,
  system: string,
  messages: Wire[],
  opts: { search: boolean; think: boolean },
  onDelta: (d: Delta) => void,
  signal: AbortSignal,
): Promise<void> {
  const req = buildRequest(p, model, system, messages, opts);
  const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 400)}`);
  if (!res.body) throw new Error('Empty response body');

  const feed = sseParser();
  const dec = new TextDecoder();
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    for (const payload of feed(dec.decode(value, { stream: true }))) {
      const d = parseDelta(req.style, payload);
      if (d === 'done') return;
      if (d) onDelta(d);
    }
  }
}
