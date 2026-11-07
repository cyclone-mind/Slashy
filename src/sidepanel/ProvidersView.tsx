import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { PRESETS } from '../presets';
import { uid, type useSettings } from '../store';
import type { Provider, Settings } from '../types';
import { Header } from './SkillsView';

interface Props {
  settings: Settings;
  update: ReturnType<typeof useSettings>[1];
  onBack: () => void;
}

export function ProvidersView({ settings, update, onBack }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const edit = settings.providers.find(p => p.id === editId);

  const save = (p: Provider) => update(s => ({ ...s, providers: s.providers.map(x => (x.id === p.id ? p : x)) }));
  const activate = (p: Provider) => update(s => ({ ...s, activeProviderId: p.id, activeModel: p.models[0] ?? null }));
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
        <Header title={edit.name} onBack={() => setEditId(null)} />
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
          <p className="note">Keys stay in this browser (chrome.storage.local) and are sent only to the Base URL above.</p>
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
            {settings.providers.map(p => (
              <li key={p.id}>
                <button className="row-main" onClick={() => setEditId(p.id)}>
                  <b>
                    {p.name} {p.id === settings.activeProviderId && <em className="badge">Active</em>}
                  </b>
                  <span>{p.apiKey ? p.models.join(', ') || 'No models' : 'API key missing'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
