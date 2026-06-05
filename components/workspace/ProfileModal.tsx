'use client';

import { useEffect, useState } from 'react';
import { ConnectButton, useDisconnectWallet } from '@mysten/dapp-kit';
import Icon from '@/components/ui/Icon';
import { SuiDroplet, WalToken } from '@/components/ui/Brand';
import SidebarMemory from '@/components/workspace/SidebarMemory';
import type { IdentityMode } from '@/components/workspace/useIdentity';
import type { Workspace } from '@/components/workspace/useWorkspaces';
import type { BlobMetadata } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: IdentityMode;
  userId: string | null;
  address: string | null;
  shortAddress: string | null;
  displayName: string;
  onChangeName: (name: string) => void;
  workspaces: Workspace[];
  activeId: string | null;
  blobs: BlobMetadata[];
  selectedBlobId: string | null;
  isBlobsLoading: boolean;
  onSelectBlob: (id: string) => void;
}

/* Profile / settings popup. Guest vs wallet identity, local display name,
   workspaces overview, and the relocated memory explorer (Walrus memories). */
export default function ProfileModal({
  open, onClose, mode, userId, address, shortAddress,
  displayName, onChangeName, workspaces, activeId, blobs, selectedBlobId, isBlobsLoading, onSelectBlob,
}: Props) {
  const { mutate: disconnect } = useDisconnectWallet();
  const [name, setName] = useState(displayName);
  useEffect(() => { setName(displayName); }, [displayName, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const guestShort = userId?.startsWith('guest-') ? `${userId.slice(0, 12)}…${userId.slice(-4)}` : userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0e0e0e]/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[86vh] flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.5)] overflow-hidden anim-fade-up">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--line)]">
          <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'wallet' ? 'grad-bg text-white' : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)]'}`}>
            <Icon name={mode === 'wallet' ? 'wallet' : 'user'} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--ink)] truncate">{displayName || (mode === 'wallet' ? 'Sui account' : 'Guest')}</p>
            <p className="text-[12px] text-[var(--muted)] font-mono truncate">{mode === 'wallet' ? shortAddress : guestShort}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card)]">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* account / status */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] mb-2">Account</h3>
            {mode === 'wallet' ? (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <SuiDroplet size={14} variant="blue" />
                  <span className="font-mono text-[var(--ink)] break-all">{address}</span>
                </div>
                <p className="text-[12px] text-[#16a34a] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Connected · persistent memory enabled
                </p>
                <button
                  onClick={() => disconnect()}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] hover:text-[#ef4444] transition-colors"
                >
                  <Icon name="logout" size={14} /> Disconnect wallet
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 p-3.5">
                <p className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Guest mode
                </p>
                <p className="text-[12px] text-[var(--muted)] mt-1 leading-relaxed">
                  Memory and chats may not persist across devices. Connect your Sui wallet to enable persistent, portable memory.
                </p>
                <div className="mt-2.5 [&_button]:!text-[13px]"><ConnectButton connectText="Connect Sui Wallet" /></div>
              </div>
            )}
          </section>

          {/* display name */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] mb-2">Display name</h3>
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => onChangeName(name.trim())}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Add a display name (local)"
                className="flex-1 bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[var(--muted)]"
              />
            </div>
          </section>

          {/* workspaces overview */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] mb-2">Memory chats ({workspaces.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {workspaces.map(w => (
                <span key={w.id} className={`text-[12px] px-2.5 py-1 rounded-full border ${w.id === activeId ? 'border-[var(--ink)] text-[var(--ink)] font-semibold' : 'border-[var(--line)] text-[var(--muted)]'}`}>
                  {w.name}
                </span>
              ))}
            </div>
          </section>

          {/* stored memories (relocated from the sidebar drawer) */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <WalToken size={13} variant="color" />
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)]">Stored memory · Walrus</h3>
            </div>
            <SidebarMemory blobs={blobs} selectedBlobId={selectedBlobId} onSelect={onSelectBlob} isLoading={isBlobsLoading} />
          </section>
        </div>
      </div>
    </div>
  );
}
