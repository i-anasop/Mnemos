'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import type { Workspace } from '@/components/workspace/useWorkspaces';

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
}

/* Compact active-workspace selector with inline "new workspace". */
export default function WorkspaceSwitcher({ workspaces, activeId, onSwitch, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const active = workspaces.find(w => w.id === activeId) ?? null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName(''); setCreating(false); setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-2.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--muted)] transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full grad-bg flex-shrink-0" />
        <span className="text-[13px] font-semibold text-[var(--ink)] truncate flex-1 text-left">
          {active?.name ?? 'Workspace'}
        </span>
        <Icon name="arrow-right" size={13} className={`text-[var(--faint)] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-2.5 right-2.5 mt-1.5 z-30 rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.3)] overflow-hidden anim-fade-up">
          <div className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-[var(--faint)]">Workspaces</div>
          <div className="max-h-52 overflow-y-auto">
            {workspaces.map(w => (
              <button
                key={w.id}
                onClick={() => { onSwitch(w.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  w.id === activeId ? 'bg-[var(--paper)]' : 'hover:bg-[var(--paper)]'
                }`}
              >
                <Icon name="layers" size={14} className={w.id === activeId ? 'text-[#6366f1]' : 'text-[var(--muted)]'} />
                <span className="text-[13px] flex-1 truncate text-[var(--ink)]">{w.name}</span>
                {w.id === activeId && <Icon name="check" size={13} className="text-[#22c55e]" />}
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--line)]">
            {creating ? (
              <div className="flex items-center gap-1.5 p-2">
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setCreating(false); setName(''); } }}
                  placeholder="Workspace name"
                  className="flex-1 min-w-0 bg-[var(--paper)] border border-[var(--line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--muted)]"
                />
                <button onClick={submit} className="px-2.5 py-1.5 rounded-lg bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold">Add</button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--paper)] transition-colors text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <Icon name="plus" size={15} />
                <span className="text-[13px] font-medium">New workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
