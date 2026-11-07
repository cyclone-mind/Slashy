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
  assert.deepEqual(parseDelta('openai', '{"choices":[{"delta":{"content":"hi","reasoning_content":"r"}}]}'), {
    text: 'hi',
    reasoning: 'r',
  });
  assert.deepEqual(parseDelta('anthropic', '{"type":"content_block_delta","delta":{"type":"text_delta","text":"x"}}'), {
    text: 'x',
  });
  assert.equal(parseDelta('openai', '[DONE]'), 'done');
  assert.throws(() => parseDelta('openai', '{"error":{"message":"bad key"}}'), /bad key/);
});

test('endpoint', () => {
  assert.equal(endpoint({ protocol: 'openai', baseUrl: 'https://x/v1/' }), 'https://x/v1/chat/completions');
  assert.equal(endpoint({ protocol: 'anthropic', baseUrl: 'https://a' }), 'https://a/v1/messages');
});
