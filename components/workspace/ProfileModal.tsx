'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectButton, useDisconnectWallet } from '@mysten/dapp-kit';
import Icon from '@/components/ui/Icon';
import { SuiDroplet, WalToken } from '@/components/ui/Brand';
import type { IdentityMode } from '@/components/workspace/useIdentity';
import type { Workspace } from '@/components/workspace/useWorkspaces';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: IdentityMode;
  userId: string | null;
  address: string | null;
  shortAddress: string | null;
  displayName: string;
  onChangeName: (name: string) => void;
  pfp: string;
  onChangePfp: (dataUrl: string) => void;
  workspaces: Workspace[];
  activeId: string | null;
  memoryCount: number;
  onOpenMemory: () => void;
}

// Downscale an uploaded image to a small square data URL (keeps localStorage lean).
async function readAvatar(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return dataUrl;
  }
}

export default function ProfileModal({
  open, onClose, mode, userId, address, shortAddress,
  displayName, onChangeName, pfp, onChangePfp, workspaces, activeId, memoryCount, onOpenMemory,
}: Props) {
  const { mutate: disconnect } = useDisconnectWallet();
  const [name, setName] = useState(displayName);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(displayName); }, [displayName, open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const identityValue = mode === 'wallet' ? address : userId;
  const identityShort = mode === 'wallet'
    ? shortAddress
    : (userId?.startsWith('guest-') ? `${userId.slice(0, 10)}…${userId.slice(-4)}` : userId);

  const copy = async () => {
    if (!identityValue) return;
    try { await navigator.clipboard.writeText(identityValue); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { try { onChangePfp(await readAvatar(file)); } catch { /* ignore */ } }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0e0e0e]/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[88vh] flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.5)] overflow-hidden anim-fade-up">
        {/* close */}
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card)]">
          <Icon name="close" size={18} />
        </button>

        <div className="overflow-y-auto">
          {/* identity header */}
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-5 bg-gradient-to-b from-[#6366f1]/8 to-transparent">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-3"
              title="Upload a photo"
            >
              {pfp ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pfp} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className={`w-full h-full flex items-center justify-center ${mode === 'wallet' ? 'grad-bg text-white' : 'bg-[var(--card)] border border-[var(--line)] text-[var(--muted)]'}`}>
                  <Icon name={mode === 'wallet' ? 'wallet' : 'user'} size={30} />
                </span>
              )}
              <span className="absolute inset-0 bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-medium">
                Edit
              </span>
            </button>

            <p className="text-lg font-bold text-[var(--ink)]">{displayName || (mode === 'wallet' ? 'Sui account' : 'Guest')}</p>
            <button onClick={copy} title="Copy" className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors font-mono">
              {mode === 'wallet' ? <SuiDroplet size={12} variant="blue" /> : <Icon name="user" size={12} />}
              {identityShort}
              <Icon name={copied ? 'check' : 'copy'} size={13} className={copied ? 'text-[#22c55e]' : ''} />
            </button>
            <span className={`mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${mode === 'wallet' ? 'bg-[#22c55e]/12 text-[#16a34a]' : 'bg-[#f59e0b]/12 text-[#b45309]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${mode === 'wallet' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
              {mode === 'wallet' ? 'Persistent memory enabled' : 'Guest mode'}
            </span>
          </div>

          <div className="px-5 pb-5 space-y-5">
            {/* edit profile */}
            <section>
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] mb-2">Edit profile</h3>
              <label className="block text-[11px] text-[var(--muted)] mb-1">Display name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => onChangeName(name.trim())}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Add a display name"
                className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[var(--muted)]"
              />
              <p className="text-[11px] text-[var(--faint)] mt-1.5">Photo & name are stored locally on this device.</p>
            </section>

            {/* account */}
            <section>
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-[var(--faint)] mb-2">Account</h3>
              {mode === 'wallet' ? (
                <button
                  onClick={() => disconnect()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--line)] text-[13px] font-medium text-[var(--muted)] hover:text-[#ef4444] hover:border-[#ef4444]/40 transition-colors"
                >
                  <Icon name="logout" size={15} /> Log out (disconnect wallet)
                </button>
              ) : (
                <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 p-3.5">
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed mb-2.5">
                    Connect your Sui wallet to keep persistent, portable memory across devices.
                  </p>
                  <div className="[&_button]:!text-[13px]"><ConnectButton connectText="Connect Sui Wallet" /></div>
                </div>
              )}
            </section>

            {/* memory chats overview */}
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

            {/* memory → opens dedicated popup */}
            <button
              onClick={onOpenMemory}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--muted)] transition-colors"
            >
              <span className="w-8 h-8 rounded-lg grad-bg text-white flex items-center justify-center flex-shrink-0">
                <WalToken size={16} variant="white" />
              </span>
              <span className="text-left flex-1">
                <span className="block text-[13px] font-semibold text-[var(--ink)]">Memory on Walrus</span>
                <span className="block text-[11px] text-[var(--muted)]">{memoryCount} stored in this chat</span>
              </span>
              <Icon name="arrow-right" size={15} className="text-[var(--faint)] flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
