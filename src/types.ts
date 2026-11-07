export type Protocol = 'openai' | 'anthropic';

export interface Provider {
  id: string;
  name: string;
  protocol: Protocol;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface Settings {
  providers: Provider[];
  activeProviderId: string | null;
  activeModel: string | null;
  skills: Skill[];
  /** Try the other providers (in list order) if the active one fails before streaming. Default on. */
  fallback?: boolean;
  /** Composer toggles; both default off. */
  webSearch?: boolean;
  thinking?: boolean;
  /** Optional. Used for web search on providers without a native one (works without a key at a low rate limit). */
  firecrawlKey?: string;
}

export interface PageContext {
  title: string;
  url: string;
  selection: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  skill?: string; // skill name shown as a chip
  context?: { title: string; url: string; selection: string };
  error?: string;
  web?: string; // how web search was done for this answer
  via?: string; // set when a fallback provider answered
}
