'use client';

import { useCallback, useEffect, useState } from 'react';

/* Per-user workspaces (memory spaces). Each has its own memory context, scoped
   server-side by user_id + workspace_id. The list/active selection lives in
   localStorage keyed by user_id — simple and hackathon-realistic; the engine
   only needs the ids. */

export interface Workspace {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const listKey = (userId: string) => `mnemos-workspaces:${userId}`;
const activeKey = (userId: string) => `mnemos-active-ws:${userId}`;

function readList(userId: string): Workspace[] {
  try {
    return JSON.parse(localStorage.getItem(listKey(userId)) || '[]') as Workspace[];
  } catch {
    return [];
  }
}

function makeWorkspace(userId: string, name: string): Workspace {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: name.trim() || 'New workspace', user_id: userId, created_at: now, updated_at: now };
}

export interface WorkspacesState {
  workspaces: Workspace[];
  activeId: string | null;
  active: Workspace | null;
  createWorkspace: (name: string) => Workspace | null;
  switchWorkspace: (id: string) => void;
}

export function useWorkspaces(userId: string | null): WorkspacesState {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load (and seed a default) whenever the user changes.
  useEffect(() => {
    if (!userId) { setWorkspaces([]); setActiveId(null); return; }
    let list = readList(userId);
    if (list.length === 0) {
      list = [makeWorkspace(userId, 'Personal Memory')];
      try { localStorage.setItem(listKey(userId), JSON.stringify(list)); } catch { /* ignore */ }
    }
    setWorkspaces(list);
    let active: string | null = null;
    try { active = localStorage.getItem(activeKey(userId)); } catch { /* ignore */ }
    setActiveId(active && list.some(w => w.id === active) ? active : list[0].id);
  }, [userId]);

  const switchWorkspace = useCallback((id: string) => {
    setActiveId(id);
    if (userId) { try { localStorage.setItem(activeKey(userId), id); } catch { /* ignore */ } }
  }, [userId]);

  const createWorkspace = useCallback((name: string): Workspace | null => {
    if (!userId) return null;
    const ws = makeWorkspace(userId, name);
    const list = [...readList(userId), ws];
    setWorkspaces(list);
    try {
      localStorage.setItem(listKey(userId), JSON.stringify(list));
      localStorage.setItem(activeKey(userId), ws.id);
    } catch { /* ignore */ }
    setActiveId(ws.id);
    return ws;
  }, [userId]);

  const active = workspaces.find(w => w.id === activeId) ?? null;
  return { workspaces, activeId, active, createWorkspace, switchWorkspace };
}
