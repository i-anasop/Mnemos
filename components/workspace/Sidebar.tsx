'use client';

import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalToken } from '@/components/ui/Brand';
import SidebarMemory from '@/components/workspace/SidebarMemory';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';
import AccountPanel from '@/components/workspace/AccountPanel';
import type { IdentityMode } from '@/components/workspace/useIdentity';
import type { Workspace } from '@/components/workspace/useWorkspaces';
import type { BlobMetadata } from '@/types';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onNew: () => void;
  onOpenMemory: () => void;
  memoryCount: number;
  // memory panel (list only — detail renders in the main area)
  showMemory: boolean;
  onCloseMemory: () => void;
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  onSelectBlob: (id: string) => void;
  isBlobsLoading: boolean;
  // identity + workspaces
  mode: IdentityMode;
  shortAddress: string | null;
  workspaces: Workspace[];
  activeId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string) => void;
}

function NavItem({
  icon, label, onClick, badge,
}: { icon: IconName; label: string; onClick?: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--ink)] hover:bg-[var(--card)] transition-colors"
    >
      <Icon name={icon} size={18} className="text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors flex-shrink-0" />
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[10px] leading-none">{badge}</span>
      )}
    </button>
  );
}

export default function Sidebar({
  open, onToggle, onNew, onOpenMemory, memoryCount,
  showMemory, onCloseMemory, blobs, selectedBlobId, onSelectBlob, isBlobsLoading,
  mode, shortAddress, workspaces, activeId, onSwitchWorkspace, onCreateWorkspace,
}: SidebarProps) {
  // When showing memory, force the sidebar to its expanded width.
  const expanded = open || showMemory;

  return (
    <>
      {/* mobile overlay */}
      {expanded && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0e0e0e]/30 backdrop-blur-[2px]" onClick={showMemory ? onCloseMemory : onToggle} />
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

        {/* active workspace selector */}
        {expanded && (
          <div className="mt-1 mb-1 flex-shrink-0">
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeId={activeId}
              onSwitch={onSwitchWorkspace}
              onCreate={onCreateWorkspace}
            />
          </div>
        )}

        {/* primary actions */}
        <div className="px-2.5 mt-1.5 space-y-1 flex-shrink-0">
          <button
            onClick={onNew}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity"
          >
            <Icon name="bolt" size={18} className="flex-shrink-0" />
            {expanded && <span className="text-sm font-semibold">New session</span>}
          </button>
        </div>

        {/* Memory — expands inline below this row */}
        <div className="px-2.5 mt-3 flex flex-col min-h-0 flex-1">
          {expanded ? (
            <button
              onClick={showMemory ? onCloseMemory : onOpenMemory}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors flex-shrink-0 ${
                showMemory ? 'bg-[var(--card)] text-[var(--ink)]' : 'text-[var(--ink)] hover:bg-[var(--card)]'
              }`}
            >
              <Icon name="layers" size={18} className={showMemory ? 'text-[#6366f1]' : 'text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors flex-shrink-0'} />
              <span className="text-sm font-medium flex-1 text-left">Memory on Walrus</span>
              {memoryCount > 0 && !showMemory && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[10px] leading-none">{memoryCount}</span>
              )}
              <Icon name="arrow-right" size={14} className={`text-[var(--faint)] transition-transform ${showMemory ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <button
              onClick={onOpenMemory}
              aria-label="Memory on Walrus"
              className="group w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-[var(--card)] transition-colors relative flex-shrink-0"
            >
              <Icon name="layers" size={18} className="text-[var(--muted)] group-hover:text-[var(--ink)]" />
              {memoryCount > 0 && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full grad-bg" />
              )}
            </button>
          )}

          {/* inline expanding memory list (list only — detail opens in main area) */}
          {expanded && showMemory && (
            <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-0.5 pb-2">
              <SidebarMemory
                blobs={blobs}
                selectedBlobId={selectedBlobId}
                onSelect={onSelectBlob}
                isLoading={isBlobsLoading}
              />
            </div>
          )}
        </div>

        {/* footer — account + live status card + theme toggle */}
        <div className="p-2.5 flex-shrink-0 space-y-2">
          {expanded && <AccountPanel mode={mode} shortAddress={shortAddress} />}
          {expanded ? (
            <div className="rounded-2xl border border-[var(--line)] overflow-hidden">
              {/* status header */}
              <div className="relative flex items-center gap-2.5 px-3.5 py-3 bg-gradient-to-br from-[#06b6d4]/12 via-[#6366f1]/10 to-[#a855f7]/12">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                </span>
                <div className="leading-tight min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">Memory live</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">on Walrus testnet</p>
                </div>
                <WalToken size={20} variant="color" className="ml-auto flex-shrink-0" />
              </div>
              {/* ecosystem + toggle */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--line)] bg-[var(--card)]">
                <div className="flex items-center gap-2.5">
                  <span title="Walrus"><WalToken size={16} variant="color" /></span>
                  <span title="Sui"><SuiDroplet size={15} variant="blue" /></span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center gap-2.5 py-1">
              <span className="relative flex h-2.5 w-2.5" title="Memory live on Walrus">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              </span>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
