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
}
