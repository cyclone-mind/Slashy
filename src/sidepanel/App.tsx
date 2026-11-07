import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, ChevronRight, Eraser, FileText, Settings2, Slash, Square, TextSelect, X, Zap } from 'lucide-react';
import { buildUserContent, filterSkills, slashQuery, toWire } from '../core';
import { streamChat } from '../llm';
import { readActivePage } from '../page';
import { uid, useSettings } from '../store';
import type { ChatMessage, PageContext, Skill } from '../types';
import { ProvidersView } from './ProvidersView';
import { SkillsView } from './SkillsView';

type View = 'chat' | 'skills' | 'providers';

const GENERIC = 'You are Slashy, a concise assistant embedded in the browser. Use Markdown. Answer in the language the user writes in.';

export function App() {
  const [settings, update] = useSettings();
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [skill, setSkill] = useState<Skill | null>(null);
  const [ctx, setCtx] = useState<PageContext | null>(null);
  const [usePage, setUsePage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshCtx = useCallback(() => void readActivePage().then(setCtx), []);
  useEffect(() => {
    refreshCtx();
    const onMsg = (m: { type?: string }) => m.type === 'slashy:selection' && refreshCtx();
    chrome.runtime.onMessage.addListener(onMsg);
    chrome.tabs.onActivated.addListener(refreshCtx);
    const onUpd = (_: number, c: chrome.tabs.TabChangeInfo) => c.status === 'complete' && refreshCtx();
    chrome.tabs.onUpdated.addListener(onUpd);
    return () => {
      chrome.runtime.onMessage.removeListener(onMsg);
      chrome.tabs.onActivated.removeListener(refreshCtx);
      chrome.tabs.onUpdated.removeListener(onUpd);
    };
  }, [refreshCtx]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const sq = skill ? null : slashQuery(input);
  const menu = useMemo(() => (sq === null || !settings ? [] : filterSkills(settings.skills, sq)), [sq, settings]);
  useEffect(() => {
    setMenuIdx(0);
  }, [sq]);

  const provider = settings?.providers.find(p => p.id === settings.activeProviderId) ?? null;
  const model = settings?.activeModel ?? provider?.models[0] ?? null;

  const send = useCallback(
    async (text: string, sk: Skill | null) => {
      if (busy || !settings) return;
      if (!provider || !model) return setView('providers');
      if (!text.trim() && !sk) return;
      const fresh = (await readActivePage()) ?? ctx;
      const content = buildUserContent(text, fresh, usePage);
      const user: ChatMessage = {
        id: uid(),
        role: 'user',
        content: content || sk?.name || '',
        skill: sk?.name,
        context: fresh && (fresh.selection || usePage) ? { title: fresh.title, url: fresh.url, selection: fresh.selection } : undefined,
      };
      const reply: ChatMessage = { id: uid(), role: 'assistant', content: '' };
      const history = [...messages, user];
      setMessages([...history, reply]);
      setInput('');
      setSkill(null);
      setBusy(true);
      const ac = (abort.current = new AbortController());
      const patch = (f: (m: ChatMessage) => ChatMessage) =>
        setMessages(ms => ms.map(m => (m.id === reply.id ? f(m) : m)));
      try {
        await streamChat(
          provider,
          model,
          sk?.prompt ?? GENERIC,
          toWire(history),
          d => patch(m => ({ ...m, content: m.content + (d.text ?? ''), reasoning: (m.reasoning ?? '') + (d.reasoning ?? '') || undefined })),
          ac.signal,
        );
      } catch (e) {
        if (!ac.signal.aborted) patch(m => ({ ...m, error: e instanceof Error ? e.message : String(e) }));
      } finally {
        setBusy(false);
      }
    },
    [busy, settings, provider, model, ctx, usePage, messages],
  );

  const pick = (s: Skill) => {
    setSkill(s);
    setInput('');
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (menu.length && sq !== null) {
      if (e.key === 'ArrowDown') (e.preventDefault(), setMenuIdx(i => (i + 1) % menu.length));
      else if (e.key === 'ArrowUp') (e.preventDefault(), setMenuIdx(i => (i - 1 + menu.length) % menu.length));
      else if (e.key === 'Enter' || e.key === 'Tab') (e.preventDefault(), pick(menu[menuIdx]));
      else if (e.key === 'Escape') setInput('');
      return;
    }
    if (e.key === 'Backspace' && !input && skill) setSkill(null);
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input, skill);
    }
  };

  if (!settings) return null;
  if (view === 'skills') return <SkillsView settings={settings} update={update} onBack={() => setView('chat')} />;
  if (view === 'providers') return <ProvidersView settings={settings} update={update} onBack={() => setView('chat')} />;

  const quick = settings.skills.filter(s => s.enabled).slice(0, 5);

  return (
    <div className="app">
      <header className="bar">
        <span className="brand">
          <Slash size={15} strokeWidth={2.5} aria-hidden /> Slashy
        </span>
        <span className="spacer" />
        <button className="icon" title="New chat" aria-label="New chat" disabled={!messages.length} onClick={() => (abort.current?.abort(), setMessages([]))}>
          <Eraser size={16} />
        </button>
        <button className="icon" title="Skills" aria-label="Manage skills" onClick={() => setView('skills')}>
          <Zap size={16} />
        </button>
        <button className="icon" title="Models" aria-label="Model providers" onClick={() => setView('providers')}>
          <Settings2 size={16} />
        </button>
      </header>

      <main className="scroll">
        {!messages.length && (
          <section className="empty">
            {!provider && (
              <button className="notice" onClick={() => setView('providers')}>
                Add a model provider to start <ChevronRight size={14} />
              </button>
            )}
            <p className="hint">
              Select text on the page, then type <kbd>/</kbd> to run a skill on it.
            </p>
            <ul className="quick">
              {quick.map(s => (
                <li key={s.id}>
                  <button onClick={() => void send('', s)}>
                    <b>{s.name}</b>
                    <span>{s.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {messages.map(m => (
          <Message key={m.id} m={m} streaming={busy && m === messages[messages.length - 1]} />
        ))}
        <div ref={endRef} />
      </main>

      <footer className="composer">
        {menu.length > 0 && (
          <ul className="menu" role="listbox" aria-label="Skills">
            {menu.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === menuIdx}>
                <button className={i === menuIdx ? 'on' : ''} onMouseEnter={() => setMenuIdx(i)} onMouseDown={e => (e.preventDefault(), pick(s))}>
                  <b>{s.name}</b>
                  <span>{s.description}</span>
                </button>
              </li>
            ))}
            <li className="manage">
              <button onMouseDown={e => (e.preventDefault(), setView('skills'))}>
                <Zap size={13} /> Create and manage skills
              </button>
            </li>
          </ul>
        )}
        <ContextBar ctx={ctx} usePage={usePage} setUsePage={setUsePage} />
        <div className="box">
          {skill && (
            <span className="chip">
              {skill.name}
              <button aria-label={`Remove ${skill.name}`} onClick={() => setSkill(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            placeholder={skill ? 'Add details, or press Enter to run' : 'Ask about this page, or type / for skills'}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            aria-label="Message"
          />
          <div className="row">
            <ModelPicker settings={settings} update={update} onAdd={() => setView('providers')} />
            <span className="spacer" />
            {busy ? (
              <button className="send stop" aria-label="Stop" onClick={() => abort.current?.abort()}>
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button className="send" aria-label="Send" disabled={!input.trim() && !skill} onClick={() => void send(input, skill)}>
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContextBar({ ctx, usePage, setUsePage }: { ctx: PageContext | null; usePage: boolean; setUsePage: (v: boolean) => void }) {
  if (!ctx) return <div className="ctx muted">This page can't be read. Open a regular website.</div>;
  if (ctx.selection)
    return (
      <div className="ctx sel" title={ctx.selection}>
        <TextSelect size={13} aria-hidden />
        <span className="clip">{ctx.selection.replace(/\s+/g, ' ')}</span>
      </div>
    );
  return (
    <div className="ctx">
      <FileText size={13} aria-hidden />
      <span className="clip">{ctx.title || ctx.url}</span>
      <label className="toggle">
        <input type="checkbox" checked={usePage} onChange={e => setUsePage(e.target.checked)} />
        <span>Use page</span>
      </label>
    </div>
  );
}

function ModelPicker({ settings, update, onAdd }: { settings: import('../types').Settings; update: ReturnType<typeof useSettings>[1]; onAdd: () => void }) {
  const opts = settings.providers.flatMap(p => p.models.map(m => ({ key: `${p.id}|${m}`, label: `${m}`, p: p.name })));
  if (!opts.length)
    return (
      <button className="model" onClick={onAdd}>
        Add model
      </button>
    );
  const cur = `${settings.activeProviderId}|${settings.activeModel ?? settings.providers.find(p => p.id === settings.activeProviderId)?.models[0]}`;
  return (
    <select
      className="model"
      aria-label="Model"
      value={cur}
      onChange={e => {
        const [pid, ...rest] = e.target.value.split('|');
        update(s => ({ ...s, activeProviderId: pid, activeModel: rest.join('|') }));
      }}>
      {opts.map(o => (
        <option key={o.key} value={o.key}>
          {o.label} · {o.p}
        </option>
      ))}
    </select>
  );
}

function Message({ m, streaming }: { m: ChatMessage; streaming: boolean }) {
  if (m.role === 'user')
    return (
      <div className="msg user">
        {m.skill && <span className="chip static">{m.skill}</span>}
        {m.context?.selection && <blockquote className="quote">{m.context.selection.slice(0, 280)}</blockquote>}
        {!m.context?.selection && m.context && <div className="src">{m.context.title}</div>}
        <UserText m={m} />
      </div>
    );
  return (
    <div className="msg bot">
      {m.reasoning && (
        <details className="think" open={streaming && !m.content}>
          <summary>{streaming && !m.content ? 'Thinking…' : 'Thought process'}</summary>
          <p>{m.reasoning}</p>
        </details>
      )}
      {m.content && (
        <div className="md">
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
      )}
      {streaming && !m.content && !m.reasoning && <div className="dots" aria-label="Loading"><i /><i /><i /></div>}
      {m.error && <div className="err">{m.error}</div>}
    </div>
  );
}

/** Show only what the user typed, not the injected page/selection block. */
function UserText({ m }: { m: ChatMessage }) {
  const typed = m.content.replace(/^Source:.*\n\n/, '').replace(/<(selection|page)>[\s\S]*?<\/\1>\n?\n?/, '').trim();
  return typed ? <p>{typed}</p> : null;
}
