'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MnemosLogo } from '@/components/ui/Logo';
import ChatList from '@/components/workspace/ChatList';
import type { IdentityMode } from '@/components/workspace/useIdentity';
import type { Workspace } from '@/components/workspace/useWorkspaces';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  workspaces: Workspace[];
  activeId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDeleteWorkspace: (id: string) => void;
  mode: IdentityMode;
  shortAddress: string | null;
  displayName: string;
  onOpenProfile: () => void;
}

export default function Sidebar({
  open, onToggle, onNewChat,
  workspaces, activeId, onSwitchWorkspace, onRenameWorkspace, onDeleteWorkspace,
  mode, shortAddress, displayName, onOpenProfile,
}: SidebarProps) {
  const expanded = open;
  const identityLabel = mode === 'wallet' ? (shortAddress ?? 'Sui account') : 'Guest mode';

  return (
    <>
      {/* mobile overlay */}
      {expanded && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0e0e0e]/30 backdrop-blur-[2px]" onClick={onToggle} />
      )}

      <aside
        className={`fixed md:static z-40 h-full flex-shrink-0 bg-[var(--paper)] border-r border-[var(--line)] flex flex-col transition-[width,transform] duration-300 ${
          expanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${expanded ? 'w-72' : 'md:w-[68px]'}`}
      >
        {/* brand + collapse */}
        <div className={`flex items-center h-[60px] px-3 flex-shrink-0 ${expanded ? 'justify-between' : 'md:justify-center'}`}>
          <Link href="/" className={`flex items-center gap-2.5 ${expanded ? '' : 'md:hidden'}`}>
            <MnemosLogo size={28} />
            <span className="text-lg font-bold tracking-tight">Mnemos</span>
          </Link>
          <button
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card)] transition-colors"
          >
            <Icon name="layers" size={18} />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-2.5 mt-1 flex-shrink-0">
          <button
            onClick={onNewChat}
            aria-label="New chat"
            className={`group w-full flex items-center gap-3 rounded-xl bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity ${expanded ? 'px-3 py-2.5' : 'md:justify-center px-3 py-2.5'}`}
          >
            <Icon name="plus" size={18} className="flex-shrink-0" />
            {expanded && <span className="text-sm font-semibold">New Chat</span>}
          </button>
        </div>

        {/* Memory Chats list */}
        <div className="px-2.5 mt-4 flex flex-col min-h-0 flex-1">
          {expanded && (
            <p className="px-1.5 mb-1.5 text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] flex-shrink-0">Memory Chats</p>
          )}
          {expanded ? (
            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 pb-2">
              <ChatList
                workspaces={workspaces}
                activeId={activeId}
                onSwitch={onSwitchWorkspace}
                onRename={onRenameWorkspace}
                onDelete={onDeleteWorkspace}
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center gap-1.5 pt-1">
              {workspaces.slice(0, 6).map(w => (
                <button
                  key={w.id}
                  onClick={() => onSwitchWorkspace(w.id)}
                  title={w.name}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${w.id === activeId ? 'bg-[var(--card)] text-[#6366f1]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
                >
                  <Icon name="sparkle" size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile footer */}
        <div className="p-2.5 flex-shrink-0 border-t border-[var(--line)]">
          {expanded ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenProfile}
                className="group flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[var(--card)] transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'wallet' ? 'grad-bg text-white' : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)]'}`}>
                  <Icon name={mode === 'wallet' ? 'wallet' : 'user'} size={16} />
                </span>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">{displayName || (mode === 'wallet' ? 'Sui account' : 'Guest')}</span>
                  <span className="block text-[11px] text-[var(--muted)] font-mono truncate">{identityLabel}</span>
                </span>
                <Icon name="settings" size={15} className="text-[var(--faint)] group-hover:text-[var(--ink)] transition-colors flex-shrink-0" />
              </button>
              <ThemeToggle />
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center gap-2">
              <button
                onClick={onOpenProfile}
                aria-label="Profile"
                className={`w-9 h-9 rounded-full flex items-center justify-center ${mode === 'wallet' ? 'grad-bg text-white' : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)]'}`}
              >
                <Icon name={mode === 'wallet' ? 'wallet' : 'user'} size={16} />
              </button>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
