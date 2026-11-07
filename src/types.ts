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
  via?: string; // set when a fallback provider answered
}
