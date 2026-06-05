'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import type { Workspace } from '@/components/workspace/useWorkspaces';

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

/* The list of memory chats (workspaces). Each row is a separate memory context.
   Active row highlighted; hover reveals rename / delete. GPT-style simplicity. */
export default function ChatList({ workspaces, activeId, onSwitch, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startRename = (w: Workspace) => { setEditingId(w.id); setDraft(w.name); };
  const commit = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null); setDraft('');
  };

  return (
    <div className="space-y-0.5">
      {workspaces.map(w => {
        const active = w.id === activeId;
        if (editingId === w.id) {
          return (
            <div key={w.id} className="flex items-center gap-1 px-1.5 py-1">
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditingId(null); setDraft(''); } }}
                onBlur={commit}
                className="flex-1 min-w-0 bg-[var(--paper)] border border-[var(--muted)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none"
              />
            </div>
          );
        }
        return (
          <div
            key={w.id}
            className={`group relative flex items-center gap-2.5 rounded-xl pl-3 pr-2 py-2 cursor-pointer transition-colors ${
              active ? 'bg-[var(--card)] border border-[var(--line)]' : 'border border-transparent hover:bg-[var(--card)]'
            }`}
            onClick={() => onSwitch(w.id)}
          >
            <Icon name="sparkle" size={14} className={active ? 'text-[#6366f1] flex-shrink-0' : 'text-[var(--faint)] flex-shrink-0'} />
            <span className={`text-[13px] flex-1 truncate ${active ? 'font-semibold text-[var(--ink)]' : 'text-[var(--muted)] group-hover:text-[var(--ink)]'}`}>
              {w.name}
            </span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); startRename(w); }}
                aria-label="Rename chat"
                className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--faint)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
              >
                <Icon name="pencil" size={13} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); if (confirm(`Delete chat "${w.name}"? Its local transcript is removed.`)) onDelete(w.id); }}
                aria-label="Delete chat"
                className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--faint)] hover:text-[#ef4444] hover:bg-[var(--paper)]"
              >
                <Icon name="trash" size={13} />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
