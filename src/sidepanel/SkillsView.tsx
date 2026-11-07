import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { uid, type useSettings } from '../store';
import type { Settings, Skill } from '../types';
import { BUILTIN_SKILLS } from '../presets';

interface Props {
  settings: Settings;
  update: ReturnType<typeof useSettings>[1];
  onBack: () => void;
}

export function SkillsView({ settings, update, onBack }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const edit = settings.skills.find(s => s.id === editId);

  const save = (s: Skill) => update(st => ({ ...st, skills: st.skills.map(x => (x.id === s.id ? s : x)) }));
  const add = () => {
    const s: Skill = { id: uid(), name: 'New skill', description: '', prompt: '', enabled: true };
    update(st => ({ ...st, skills: [...st.skills, s] }));
    setEditId(s.id);
  };
  const remove = (id: string) => {
    update(st => ({ ...st, skills: st.skills.filter(x => x.id !== id) }));
    setEditId(null);
  };

  if (edit)
    return (
      <div className="app">
        <Header title={edit.builtin ? 'Skill' : 'Edit skill'} onBack={() => setEditId(null)} />
        <main className="scroll form">
          <label>
            Name
            <input value={edit.name} onChange={e => save({ ...edit, name: e.target.value })} />
          </label>
          <label>
            Description
            <input value={edit.description} onChange={e => save({ ...edit, description: e.target.value })} />
          </label>
          <label>
            Prompt
            <textarea
              rows={12}
              value={edit.prompt}
              placeholder="What should the model do with the selected text or page?"
              onChange={e => save({ ...edit, prompt: e.target.value })}
            />
          </label>
          <div className="actions">
            {edit.builtin && (
              <button
                className="ghost"
                onClick={() => {
                  const orig = BUILTIN_SKILLS.find(b => b.id === edit.id);
                  if (orig) save({ ...orig, enabled: edit.enabled });
                }}>
                Reset to default
              </button>
            )}
            <span className="spacer" />
            <button className="danger" onClick={() => remove(edit.id)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </main>
      </div>
    );

  return (
    <div className="app">
      <Header title="Skills" onBack={onBack} />
      <main className="scroll">
        <ul className="list">
          {settings.skills.map(s => (
            <li key={s.id}>
              <button className="row-main" onClick={() => setEditId(s.id)}>
                <b>{s.name}</b>
                <span>{s.description || 'No description'}</span>
              </button>
              <label className="switch" title={s.enabled ? 'Shown in / menu' : 'Hidden from / menu'}>
                <input type="checkbox" checked={s.enabled} aria-label={`Enable ${s.name}`} onChange={e => save({ ...s, enabled: e.target.checked })} />
                <i />
              </label>
            </li>
          ))}
        </ul>
        <button className="add" onClick={add}>
          <Plus size={15} /> Create skill
        </button>
      </main>
    </div>
  );
}

export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="bar">
      <button className="icon" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={16} />
      </button>
      <h1>{title}</h1>
    </header>
  );
}
