import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUserContent, endpoint, filterSkills, parseDelta, slashQuery, sseParser } from './core.ts';

const sk = (name: string, description = '') => ({ id: name, name, description, prompt: '', enabled: true });

test('slashQuery only matches a bare leading slash word', () => {
  assert.equal(slashQuery('/'), '');
  assert.equal(slashQuery('/tra'), 'tra');
  assert.equal(slashQuery('hi /tra'), null);
  assert.equal(slashQuery('/tra nslate'), null);
});

test('filterSkills ranks name hits before description hits and drops disabled', () => {
  const skills = [sk('Polish', 'translate tone'), sk('Translate'), { ...sk('Trash'), enabled: false }];
  assert.deepEqual(filterSkills(skills, 'trans').map(s => s.name), ['Translate', 'Polish']);
  assert.equal(filterSkills(skills, '').length, 2);
});

test('buildUserContent prefers selection, falls back to page, omits when neither', () => {
  const ctx = { title: 'T', url: 'u', selection: 'sel', text: 'page' };
  assert.match(buildUserContent('q', ctx, true), /<selection>\nsel/);
  assert.doesNotMatch(buildUserContent('q', ctx, true), /<page>/);
  assert.match(buildUserContent('', { ...ctx, selection: '' }, true), /<page>\npage/);
  assert.equal(buildUserContent('q', { ...ctx, selection: '' }, false), 'q');
});

test('sseParser handles split chunks', () => {
  const p = sseParser();
  assert.deepEqual(p('data: {"a"'), []);
  assert.deepEqual(p(':1}\n\ndata: [DONE]\n'), ['{"a":1}', '[DONE]']);
});

test('parseDelta openai + anthropic', () => {
  assert.deepEqual(parseDelta('chat', '{"choices":[{"delta":{"content":"hi","reasoning_content":"r"}}]}'), {
    text: 'hi',
    reasoning: 'r',
  });
  assert.deepEqual(parseDelta('messages', '{"type":"content_block_delta","delta":{"type":"text_delta","text":"x"}}'), {
    text: 'x',
  });
  assert.equal(parseDelta('chat', '[DONE]'), 'done');
  assert.throws(() => parseDelta('chat', '{"error":{"message":"bad key"}}'), /bad key/);
});

test('endpoint', () => {
  assert.equal(endpoint({ protocol: 'openai', baseUrl: 'https://x/v1/' }), 'https://x/v1/chat/completions');
  assert.equal(endpoint({ protocol: 'anthropic', baseUrl: 'https://a' }), 'https://a/v1/messages');
});

import { fillPrompt, providerChain, unwrapFence } from './core.ts';

test('unwrapFence strips an outer markdown fence, closed or still streaming', () => {
  assert.equal(unwrapFence('```markdown\n## A\n\ntext\n```'), '## A\n\ntext');
  assert.equal(unwrapFence('```markdown\n## A\ntex'), '## A\ntex');
  assert.equal(unwrapFence('```ts\ncode\n```'), '```ts\ncode\n```');
  assert.equal(unwrapFence('plain **md**'), 'plain **md**');
});

test('fillPrompt replaces placeholders', () => {
  const ctx = { title: 'T', url: 'U', selection: 'S', text: '' };
  assert.equal(fillPrompt('translate {selection} from {{url}}', ctx), 'translate S from U');
  assert.equal(fillPrompt('x {selection}', null), 'x the page content');
});

test('providerChain: active first, then list order, skipping keyless remote providers', () => {
  const p = (id: string, apiKey: string, baseUrl = 'https://x') => ({ id, name: id, protocol: 'openai' as const, baseUrl, apiKey, models: [id + '-m'] });
  const s = { providers: [p('a', 'k'), p('b', ''), p('c', 'k'), p('d', '', 'http://localhost:11434/v1')], activeProviderId: 'c', activeModel: 'c-m' };
  assert.deepEqual(providerChain(s).map(x => x.provider.id), ['c', 'a', 'd']);
  assert.deepEqual(providerChain(s, false).map(x => x.provider.id), ['c']);
});

import { buildRequest, clientSearch, formatHits, kindOf, searchMode, searchQuery } from './features.ts';

const prov = (baseUrl: string, protocol: 'openai' | 'anthropic' = 'openai') => ({ id: 'x', name: 'x', protocol, baseUrl, apiKey: 'k', models: ['m'] });
const msgs = [{ role: 'user' as const, content: 'hi' }];

test('kindOf / searchMode', () => {
  assert.equal(kindOf(prov('https://api.deepseek.com/v1')), 'deepseek');
  assert.equal(kindOf(prov('https://api.anthropic.com', 'anthropic')), 'anthropic');
  assert.equal(kindOf(prov('http://localhost:11434/v1')), 'other');
  assert.equal(searchMode('openrouter'), 'native');
  assert.equal(searchMode('deepseek'), 'deepseek');
  assert.equal(searchMode('other'), 'firecrawl');
});

test('buildRequest: defaults add nothing', () => {
  for (const p of [prov('https://api.openai.com/v1'), prov('https://openrouter.ai/api/v1'), prov('https://api.anthropic.com', 'anthropic')]) {
    const r = buildRequest(p, 'gpt-4o-mini', 's', msgs, { search: false, think: false });
    assert.equal(r.body.tools, undefined);
    assert.equal(r.body.thinking, undefined);
    assert.equal(r.body.reasoning, undefined);
    assert.equal(r.body.plugins, undefined);
  }
  assert.equal(buildRequest(prov('https://api.openai.com/v1'), 'gpt-4o-mini', 's', msgs, { search: false, think: false }).style, 'chat');
});

test('buildRequest: native search per vendor', () => {
  const on = { search: true, think: false };
  const oa = buildRequest(prov('https://api.openai.com/v1'), 'gpt-4o-mini', 's', msgs, on);
  assert.equal(oa.style, 'responses');
  assert.equal(oa.url, 'https://api.openai.com/v1/responses');
  assert.deepEqual(oa.body.tools, [{ type: 'web_search' }]);
  assert.equal((buildRequest(prov('https://openrouter.ai/api/v1'), 'm', 's', msgs, on).body.plugins as any)[0].id, 'web');
  assert.equal((buildRequest(prov('https://api.anthropic.com', 'anthropic'), 'claude-sonnet-4-5', 's', msgs, on).body.tools as any)[0].name, 'web_search');
  assert.equal(buildRequest(prov('https://dashscope.aliyuncs.com/compatible-mode/v1'), 'qwen-plus', 's', msgs, on).body.enable_search, true);
  // no native search: body untouched, caller does client-side search
  assert.equal(buildRequest(prov('https://api.deepseek.com/v1'), 'deepseek-chat', 's', msgs, on).body.tools, undefined);
});

test('buildRequest: thinking per vendor', () => {
  const on = { search: false, think: true };
  assert.deepEqual(buildRequest(prov('https://api.anthropic.com', 'anthropic'), 'claude-haiku-4-5', 's', msgs, on).body.thinking, { type: 'enabled', budget_tokens: 4096 });
  assert.equal((buildRequest(prov('https://api.anthropic.com', 'anthropic'), 'claude-opus-5-5', 's', msgs, on).body.thinking as any).type, 'adaptive');
  assert.deepEqual(buildRequest(prov('https://api.deepseek.com/v1'), 'deepseek-chat', 's', msgs, on).body.thinking, { type: 'enabled' });
  assert.deepEqual(buildRequest(prov('https://openrouter.ai/api/v1'), 'm', 's', msgs, on).body.reasoning, { enabled: true });
  // OpenAI: only reasoning models get a reasoning block; others stay on chat completions untouched
  assert.equal(buildRequest(prov('https://api.openai.com/v1'), 'gpt-4o-mini', 's', msgs, on).style, 'chat');
  assert.deepEqual(buildRequest(prov('https://api.openai.com/v1'), 'gpt-5-mini', 's', msgs, on).body.reasoning, { summary: 'auto' });
});

test('responses stream parsing + search helpers', () => {
  assert.deepEqual(parseDelta('responses', '{"type":"response.output_text.delta","delta":"a"}'), { text: 'a' });
  assert.deepEqual(parseDelta('responses', '{"type":"response.reasoning_summary_text.delta","delta":"r"}'), { reasoning: 'r' });
  assert.equal(parseDelta('responses', '{"type":"response.completed"}'), 'done');
  assert.throws(() => parseDelta('responses', '{"type":"response.failed","response":{"error":{"message":"nope"}}}'), /nope/);
  assert.equal(searchQuery('', '  sel  text ', 'T'), 'sel text');
  assert.equal(searchQuery('', '', 'Title'), 'Title');
  assert.match(formatHits('q', [{ title: 'A', url: 'u', snippet: 's' }]), /\[1\] A \(u\)/);
  assert.equal(formatHits('q', []), '');
});

test('clientSearch maps Firecrawl and DeepSeek responses and sends the key', async () => {
  const calls: { url: string; auth?: string }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    calls.push({ url, auth: init.headers.authorization });
    const body = url.includes('firecrawl')
      ? { data: { web: [{ title: 'T', url: 'U', description: 'D' }] } }
      : { results: [{ title: 'T2', url: 'U2', summary: 'S2', snippet: 'x' }] };
    return { ok: true, json: async () => body } as Response;
  }) as any;
  try {
    const ac = new AbortController();
    assert.deepEqual(await clientSearch('firecrawl', prov('http://x'), 'q', 'fc-key', ac.signal), [{ title: 'T', url: 'U', snippet: 'D' }]);
    assert.deepEqual(await clientSearch('deepseek', prov('https://api.deepseek.com/v1'), 'q', undefined, ac.signal), [{ title: 'T2', url: 'U2', snippet: 'S2' }]);
    assert.equal(calls[0].auth, 'Bearer fc-key');
    assert.equal(calls[1].url, 'https://api.deepseek.com/v1/tools/search');
  } finally {
    globalThis.fetch = real;
  }
});
