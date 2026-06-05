'use client';

import { ConnectButton } from '@mysten/dapp-kit';
import { SuiDroplet } from '@/components/ui/Brand';
import type { IdentityMode } from '@/components/workspace/useIdentity';

/* Account / status area: guest badge + warning, or connected-wallet indicator.
   The actual connect flow uses dapp-kit's native ConnectButton (Sui wallets). */
export default function AccountPanel({ mode, shortAddress }: { mode: IdentityMode; shortAddress: string | null }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] overflow-hidden">
      <div className="px-3.5 py-2.5">
        {mode === 'wallet' ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[12px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <SuiDroplet size={12} variant="blue" />
                <span className="font-mono">{shortAddress}</span>
              </p>
              <p className="text-[10.5px] text-[#16a34a]">Persistent memory enabled</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-[#f59e0b] flex-shrink-0" />
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-[var(--ink)]">Guest mode</p>
              <p className="text-[10.5px] text-[var(--muted)] mt-0.5">
                Your memory may not be saved permanently. Connect your Sui wallet to keep persistent memory.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-[var(--line)] p-2 bg-[var(--card)] flex justify-center [&_button]:!text-[13px]">
        <ConnectButton connectText="Connect Sui Wallet" />
      </div>
    </div>
  );
}
