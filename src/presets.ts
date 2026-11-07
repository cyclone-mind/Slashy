import type { Provider, Skill } from './types';

export type Preset = Omit<Provider, 'id' | 'apiKey'>;

export const PRESETS: Preset[] = [
  { name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { name: 'OpenAI', protocol: 'openai', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o'] },
  { name: 'Anthropic', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'] },
  { name: 'Gemini', protocol: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
  { name: 'OpenRouter', protocol: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: ['openai/gpt-4o-mini'] },
  { name: 'Moonshot (Kimi)', protocol: 'openai', baseUrl: 'https://api.moonshot.cn/v1', models: ['kimi-k2-0905-preview'] },
  { name: 'Zhipu (GLM)', protocol: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4.5-flash'] },
  { name: 'Qwen (Bailian)', protocol: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-max'] },
  { name: 'SiliconFlow', protocol: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', models: ['Qwen/Qwen2.5-72B-Instruct'] },
  { name: 'Ollama (local)', protocol: 'openai', baseUrl: 'http://localhost:11434/v1', models: ['qwen2.5:7b'] },
  { name: 'Custom', protocol: 'openai', baseUrl: '', models: [] },
];

const s = (id: string, name: string, description: string, prompt: string): Skill => ({
  id,
  name,
  description,
  prompt,
  enabled: true,
  builtin: true,
});

export const BUILTIN_SKILLS: Skill[] = [
  s(
    'summarize',
    'Summarize',
    'Key points of the page or selection',
    'Act as an efficient information analyst. Summarize the content: a one-sentence gist, then the key points as a short list. Reply in the language the user writes in; if they write nothing, match the content.',
  ),
  s(
    'explain',
    'Explain',
    'Explain the selection in plain language',
    "Explain the selected text (or, with no selection, the page's main idea) in simple, plain language. Define jargon, give one concrete example, and keep it short.",
  ),
  s(
    'translate',
    'Translate',
    'Translate to Chinese / English',
    'Translate the selected text. If it is mostly Chinese, translate to English; otherwise translate to Simplified Chinese. Output only the translation, preserving formatting.',
  ),
  s(
    'polish',
    'Polish',
    'Improve wording, keep the meaning',
    "Act as a professional copy editor. Polish and optimize the selected text: fix grammar, tighten wording, keep the author's voice and meaning. Output the revised text, then a brief list of what changed.",
  ),
  s(
    'sentence-study',
    'Sentence study',
    'Break down a sentence: structure, vocabulary',
    '## Task\n1. Quote the original sentence and cite the source URL.\n2. Translate it into natural Chinese.\n3. Analyze the structure: main clause, subordinate clauses, grammar points.\n4. Explain notable expressions and vocabulary worth remembering.\n5. Add cultural or background notes if relevant.\n\nOutput in Markdown.',
  ),
];
