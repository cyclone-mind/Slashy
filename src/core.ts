import type { ChatMessage, PageContext, Provider, Skill } from './types';

export const MAX_PAGE_CHARS = 30000;

/** Filter skills for the slash menu: enabled only, match on name/description, name hits first. */
export function filterSkills(skills: Skill[], query: string): Skill[] {
  const q = query.trim().toLowerCase();
  const on = skills.filter(s => s.enabled);
  if (!q) return on;
  const hit = (s: Skill, f: 'name' | 'description') => s[f].toLowerCase().includes(q);
  return [...on.filter(s => hit(s, 'name')), ...on.filter(s => !hit(s, 'name') && hit(s, 'description'))];
}

/** Returns the slash query if the input is a bare "/word" at the start, else null. */
export function slashQuery(input: string): string | null {
  const m = /^\/(\S*)$/.exec(input);
  return m ? m[1] : null;
}

/** The context block sent with each user turn. Selection wins over the full page. */
export function buildUserContent(text: string, ctx: PageContext | null, usePage: boolean): string {
  const parts: string[] = [];
  if (ctx && (ctx.selection || usePage)) {
    parts.push(`Source: ${ctx.title} <${ctx.url}>`);
    if (ctx.selection) parts.push(`<selection>\n${ctx.selection}\n</selection>`);
    else parts.push(`<page>\n${ctx.text.slice(0, MAX_PAGE_CHARS)}\n</page>`);
  }
  if (text.trim()) parts.push(text.trim());
  return parts.join('\n\n');
}

export function toWire(history: ChatMessage[]) {
  return history.filter(m => !m.error && m.content).map(m => ({ role: m.role, content: m.content }));
}

/** Incremental SSE parser: feed chunks, get complete `data:` payloads. */
export function sseParser() {
  let buf = '';
  return (chunk: string): string[] => {
    buf += chunk;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    return lines
      .filter(l => l.startsWith('data:'))
      .map(l => l.slice(5).trim())
      .filter(Boolean);
  };
}

export interface Delta {
  text?: string;
  reasoning?: string;
}

export function parseDelta(protocol: Provider['protocol'], payload: string): Delta | 'done' | null {
  if (payload === '[DONE]') return 'done';
  let j: any;
  try {
    j = JSON.parse(payload);
  } catch {
    return null;
  }
  if (j.error) throw new Error(j.error.message ?? JSON.stringify(j.error));
  if (protocol === 'openai') {
    const d = j.choices?.[0]?.delta;
    if (!d) return null;
    return { text: d.content || undefined, reasoning: d.reasoning_content || d.reasoning || undefined };
  }
  if (j.type === 'message_stop') return 'done';
  if (j.type === 'content_block_delta') {
    if (j.delta?.type === 'text_delta') return { text: j.delta.text };
    if (j.delta?.type === 'thinking_delta') return { reasoning: j.delta.thinking };
  }
  return null;
}

export function endpoint(p: Pick<Provider, 'protocol' | 'baseUrl'>): string {
  const base = p.baseUrl.replace(/\/+$/, '');
  return p.protocol === 'anthropic' ? `${base}/v1/messages` : `${base}/chat/completions`;
}
