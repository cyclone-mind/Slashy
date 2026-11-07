import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { PRESETS } from '../presets';
import { uid, type useSettings } from '../store';
import type { Provider, Settings } from '../types';
import { Header, useFlash } from './SkillsView';

interface Props {
  settings: Settings;
  update: ReturnType<typeof useSettings>[1];
  onBack: () => void;
}

export function ProvidersView({ settings, update, onBack }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const edit = settings.providers.find(p => p.id === editId);

  const [saved, flash] = useFlash();
  const save = (p: Provider) => {
    update(s => ({ ...s, providers: s.providers.map(x => (x.id === p.id ? p : x)) }));
    flash();
  };
  const activate = (p: Provider) => update(s => ({ ...s, activeProviderId: p.id, activeModel: p.models[0] ?? null }));
  const move = (i: number, d: -1 | 1) =>
    update(s => {
      const providers = [...s.providers];
      [providers[i], providers[i + d]] = [providers[i + d], providers[i]];
      return { ...s, providers };
    });
  const addFrom = (i: number) => {
    const p: Provider = { ...PRESETS[i], id: uid(), apiKey: '' };
    update(s => ({
      ...s,
      providers: [...s.providers, p],
      activeProviderId: s.activeProviderId ?? p.id,
      activeModel: s.activeProviderId ? s.activeModel : (p.models[0] ?? null),
    }));
    setPicking(false);
    setEditId(p.id);
  };
  const remove = (p: Provider) => {
    update(s => {
      const providers = s.providers.filter(x => x.id !== p.id);
      const gone = s.activeProviderId === p.id;
      return { ...s, providers, activeProviderId: gone ? (providers[0]?.id ?? null) : s.activeProviderId, activeModel: gone ? (providers[0]?.models[0] ?? null) : s.activeModel };
    });
    setEditId(null);
  };

  if (edit)
    return (
      <div className="app">
        <Header title={edit.name} onBack={() => setEditId(null)} saved={saved} />
        <main className="scroll form">
          <label>
            Name
            <input value={edit.name} onChange={e => save({ ...edit, name: e.target.value })} />
          </label>
          <label>
            API format
            <select value={edit.protocol} onChange={e => save({ ...edit, protocol: e.target.value as Provider['protocol'] })}>
              <option value="openai">OpenAI-compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label>
            Base URL
            <input value={edit.baseUrl} placeholder="https://api.example.com/v1" onChange={e => save({ ...edit, baseUrl: e.target.value })} />
          </label>
          <label>
            API key
            <input type="password" autoComplete="off" value={edit.apiKey} placeholder="sk-…" onChange={e => save({ ...edit, apiKey: e.target.value })} />
          </label>
          <label>
            Models <small>one per line</small>
            <textarea
              rows={4}
              value={edit.models.join('\n')}
              onChange={e => save({ ...edit, models: e.target.value.split('\n').map(m => m.trim()).filter(Boolean) })}
            />
          </label>
          <p className="note">Changes save automatically. Keys stay in this browser (chrome.storage.local) and are sent only to the Base URL above.</p>
          <div className="actions">
            <button className="ghost" onClick={() => (activate(edit), setEditId(null))}>
              <Check size={14} /> Use this provider
            </button>
            <span className="spacer" />
            <button className="danger" onClick={() => remove(edit)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </main>
      </div>
    );

  return (
    <div className="app">
      <Header title="Models" onBack={onBack} />
      <main className="scroll">
        {settings.providers.length > 0 && (
          <ul className="list">
            {settings.providers.map((p, i) => (
              <li key={p.id}>
                <button className="row-main" onClick={() => setEditId(p.id)}>
                  <b>
                    {p.name} {p.id === settings.activeProviderId && <em className="badge">Active</em>}
                  </b>
                  <span>{p.apiKey ? p.models.join(', ') || 'No models' : 'API key missing'}</span>
                </button>
                <span className="order">
                  <button className="icon" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={14} />
                  </button>
                  <button className="icon" aria-label={`Move ${p.name} down`} disabled={i === settings.providers.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {settings.providers.length > 1 && (
          <label className="fallback">
            <input type="checkbox" checked={settings.fallback !== false} onChange={e => update(s => ({ ...s, fallback: e.target.checked }))} />
            <span>
              <b>Fall back automatically</b>
              If the Active provider fails before answering, try the others top to bottom, using each one's first model.
            </span>
          </label>
        )}
        <div className="form websearch">
          <label>
            Firecrawl API key <small>optional</small>
            <input
              type="password"
              autoComplete="off"
              value={settings.firecrawlKey ?? ''}
              placeholder="fc-…"
              onChange={e => update(s => ({ ...s, firecrawlKey: e.target.value }))}
            />
          </label>
          <p className="note">
            Web search (the Search toggle) is native for Anthropic, OpenAI, OpenRouter, Qwen and GLM, and uses DeepSeek's own search endpoint for DeepSeek. Other providers use Firecrawl, which works without a key at a low rate limit.
          </p>
        </div>
        {picking ? (
          <ul className="list presets" aria-label="Choose a provider">
            {PRESETS.map((p, i) => (
              <li key={p.name}>
                <button className="row-main" onClick={() => addFrom(i)}>
                  <b>{p.name}</b>
                  <span>{p.baseUrl || 'Any OpenAI-compatible endpoint'}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button className="add" onClick={() => setPicking(true)}>
            <Plus size={15} /> Add provider
          </button>
        )}
      </main>
    </div>
  );
}
