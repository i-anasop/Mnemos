'use client';

import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalToken } from '@/components/ui/Brand';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onNew: () => void;
  onOpenMemory: () => void;
  memoryCount: number;
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

export default function Sidebar({ open, onToggle, onNew, onOpenMemory, memoryCount }: SidebarProps) {
  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0e0e0e]/30 backdrop-blur-[2px]" onClick={onToggle} />
      )}

      <aside
        className={`fixed md:static z-40 h-full flex-shrink-0 bg-[var(--paper)] border-r border-[var(--line)] flex flex-col transition-[width,transform] duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${open ? 'w-64' : 'md:w-[68px]'}`}
      >
        {/* brand + collapse */}
        <div className={`flex items-center h-[60px] px-3 ${open ? 'justify-between' : 'md:justify-center'}`}>
          <Link href="/" className={`flex items-center gap-2.5 ${open ? '' : 'md:hidden'}`}>
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

        {/* primary actions */}
        <div className="px-2.5 mt-2 space-y-1">
          <button
            onClick={onNew}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity"
          >
            <Icon name="bolt" size={18} className="flex-shrink-0" />
            {open && <span className="text-sm font-semibold">New session</span>}
          </button>
        </div>

        <nav className="px-2.5 mt-3 space-y-0.5">
          {open ? (
            <NavItem icon="layers" label="Memory on Walrus" onClick={onOpenMemory} badge={memoryCount} />
          ) : (
            <button
              onClick={onOpenMemory}
              aria-label="Memory on Walrus"
              className="group w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-[var(--card)] transition-colors relative"
            >
              <Icon name="layers" size={18} className="text-[var(--muted)] group-hover:text-[var(--ink)]" />
              {memoryCount > 0 && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full grad-bg" />
              )}
            </button>
          )}
        </nav>

        {/* footer — Powered by (visual) + theme toggle */}
        <div className="mt-auto p-2.5 border-t border-[var(--line)]">
          {open ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--faint)]">Powered by</span>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-center justify-center" title="Walrus"><WalToken size={16} variant="color" /></span>
                  <span className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-center justify-center" title="Sui"><SuiDroplet size={15} variant="blue" /></span>
                  <span className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-center justify-center text-[#a855f7]" title="Voyage"><Icon name="brain" size={15} /></span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-center justify-center" title="Powered by Walrus"><WalToken size={16} variant="color" /></span>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
