import { endpoint } from './core.ts';
import type { Provider } from './types';

export type Kind = 'anthropic' | 'openai' | 'openrouter' | 'deepseek' | 'qwen' | 'zhipu' | 'gemini' | 'other';
export type ApiStyle = 'chat' | 'responses' | 'messages';
/** native: the provider searches server-side; deepseek: its separate search endpoint; firecrawl: generic client-side fallback */
export type SearchMode = 'native' | 'deepseek' | 'firecrawl';

export interface Wire {
  role: 'user' | 'assistant';
  content: string;
}

export function kindOf(p: Pick<Provider, 'protocol' | 'baseUrl'>): Kind {
  if (p.protocol === 'anthropic') return 'anthropic';
  const u = p.baseUrl.toLowerCase();
  if (u.includes('api.openai.com')) return 'openai';
  if (u.includes('openrouter.ai')) return 'openrouter';
  if (u.includes('api.deepseek.com')) return 'deepseek';
  if (u.includes('dashscope')) return 'qwen';
  if (u.includes('bigmodel.cn')) return 'zhipu';
  if (u.includes('generativelanguage.googleapis.com')) return 'gemini';
  return 'other';
}

export function searchMode(k: Kind): SearchMode {
  if (k === 'anthropic' || k === 'openai' || k === 'openrouter' || k === 'qwen' || k === 'zhipu') return 'native';
  return k === 'deepseek' ? 'deepseek' : 'firecrawl';
}

const OPENAI_REASONING = /^(o\d|gpt-5)/;
/** Newer Claude models use adaptive thinking; older ones take a token budget. */
const claudeAdaptive = (m: string) => /claude-(?:fable|opus|sonnet|haiku)-([5-9]|\d{2})/.test(m) || /4-6/.test(m);

export interface Req {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  style: ApiStyle;
}

/** Build the streaming request for a provider, adding native web-search / thinking switches when asked for. */
export function buildRequest(
  p: Provider,
  model: string,
  system: string,
  messages: Wire[],
  opts: { search: boolean; think: boolean },
): Req {
  const k = kindOf(p);
  const native = opts.search && searchMode(k) === 'native';
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (k === 'anthropic') {
    headers['x-api-key'] = p.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    const body: Record<string, unknown> = { model, system, messages, max_tokens: opts.think ? 16000 : 8192, stream: true };
    if (native) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
    if (opts.think)
      body.thinking = claudeAdaptive(model)
        ? { type: 'adaptive', display: 'summarized' }
        : { type: 'enabled', budget_tokens: 4096 };
    return { url: endpoint(p), headers, body, style: 'messages' };
  }

  if (p.apiKey) headers.authorization = `Bearer ${p.apiKey}`;
  const base = p.baseUrl.replace(/\/+$/, '');

  const reasoningModel = OPENAI_REASONING.test(model);
  if (k === 'openai' && (native || (opts.think && reasoningModel))) {
    const body: Record<string, unknown> = { model, instructions: system, input: messages, stream: true };
    if (native) body.tools = [{ type: 'web_search' }];
    if (opts.think && reasoningModel) body.reasoning = { summary: 'auto' }; // effort: vendor default
    return { url: `${base}/responses`, headers, body, style: 'responses' };
  }

  const body: Record<string, unknown> = { model, messages: [{ role: 'system', content: system }, ...messages], stream: true };
  if (k === 'openrouter') {
    if (native) body.plugins = [{ id: 'web' }];
    if (opts.think) body.reasoning = { enabled: true };
  } else if (k === 'qwen') {
    if (native) body.enable_search = true;
    if (opts.think) body.enable_thinking = true;
  } else if (k === 'zhipu') {
    if (native) body.tools = [{ type: 'web_search', web_search: { enable: true, search_engine: 'search_std' } }];
    if (opts.think) body.thinking = { type: 'enabled' };
  } else if (k === 'deepseek') {
    if (opts.think) body.thinking = { type: 'enabled' };
  } else if (k === 'gemini') {
    if (opts.think) body.reasoning_effort = 'medium';
  } else if (k === 'openai' && opts.think && reasoningModel) {
    body.reasoning_effort = 'medium';
  }
  return { url: endpoint(p), headers, body, style: 'chat' };
}

export interface Hit {
  title: string;
  url: string;
  snippet: string;
}

/** Client-side search for providers without native search. Throws on HTTP errors. */
export async function clientSearch(
  mode: 'deepseek' | 'firecrawl',
  p: Provider,
  query: string,
  firecrawlKey: string | undefined,
  signal: AbortSignal,
): Promise<Hit[]> {
  if (mode === 'deepseek') {
    const r = await fetch(`${new URL(p.baseUrl).origin}/v1/tools/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({ query, count: 5, need_content: false }),
      signal,
    });
    if (!r.ok) throw new Error(`DeepSeek search ${r.status}`);
    const j = await r.json();
    return (j.results ?? []).map((x: any) => ({ title: x.title, url: x.url, snippet: x.summary || x.snippet || '' }));
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (firecrawlKey) headers.authorization = `Bearer ${firecrawlKey}`;
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, limit: 5 }),
    signal,
  });
  if (!r.ok) throw new Error(`Firecrawl search ${r.status}${r.status === 403 || r.status === 401 || r.status === 429 ? ': add a Firecrawl API key in Models' : ''}`);
  const j = await r.json();
  return (j.data?.web ?? []).map((x: any) => ({ title: x.title, url: x.url, snippet: x.description ?? '' }));
}

export function formatHits(query: string, hits: Hit[]): string {
  if (!hits.length) return '';
  const rows = hits.map((h, i) => `[${i + 1}] ${h.title} (${h.url})\n${h.snippet}`.trim());
  return `<web_search query="${query}">\n${rows.join('\n\n')}\n</web_search>\nUse these web results where relevant and cite sources as markdown links.`;
}

/** What to search for: what the user typed, else the selection, else the page title. */
export function searchQuery(text: string, selection: string, title: string): string {
  return (text.trim() || selection.trim() || title.trim()).replace(/\s+/g, ' ').slice(0, 200);
}
