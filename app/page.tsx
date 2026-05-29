import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import Mascot from '@/components/ui/Mascot';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalrusLogotype, WalToken } from '@/components/ui/Brand';

/* ─── Floating Walrus blob receipt ──────────────────────────────────────── */
function Receipt({ id, label, tone = 'mono', className = '', delay = 0 }: { id: string; label: string; tone?: 'mono' | 'match'; className?: string; delay?: number }) {
  return (
    <div className={`anim-float ${className}`} style={{ animationDelay: `${delay}s` }}>
      <div className="bg-white border-[1.5px] border-[#0e0e0e] rounded-2xl px-3.5 py-2.5 shadow-float">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${tone === 'match' ? 'grad-bg' : 'bg-[#22c55e]'}`} />
          <p className={`text-[10px] font-mono ${tone === 'match' ? 'text-[#06b6d4] font-bold' : 'text-[#06b6d4]'}`}>{id}</p>
        </div>
        <p className="text-xs font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Big poster card (Ask / Store / Return) ────────────────────────────── */
function StepCard({
  n, title, kicker, fill, children, delay,
}: { n: string; title: string; kicker: string; fill: string; children: React.ReactNode; delay: number }) {
  return (
    <div
      className="relative border-[1.5px] border-[#0e0e0e] rounded-[1.75rem] p-7 sm:p-8 min-h-[320px] flex flex-col overflow-hidden shadow-card transition-transform hover:-translate-y-1 anim-fade-up"
      style={{ background: fill, animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono font-bold text-[#0e0e0e]/40">{n}</span>
        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#0e0e0e]/45">Step</span>
      </div>
      <h3 className="display text-[2.8rem] sm:text-[3.2rem] mt-5">{title}</h3>
      <p className="text-[15px] font-medium text-[#3a3a35] mt-2 max-w-[14rem]">{kicker}</p>
      <div className="mt-auto pt-8 flex justify-end items-end">{children}</div>
    </div>
  );
}

const PROOF: { icon: IconName; label: string }[] = [
  { icon: 'database',  label: 'Stored on Walrus' },
  { icon: 'restart',   label: 'Survives restart' },
  { icon: 'target',    label: 'Retrieved by meaning' },
  { icon: 'lightbulb', label: 'Explains why' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#f6f5f1] text-[#0e0e0e] overflow-x-hidden">
      {/* ─── Pill nav ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 px-5 sm:px-8 py-4 flex items-center justify-between backdrop-blur-md bg-[#f6f5f1]/70">
        <Link href="/" className="w-11 h-11 rounded-full border-[1.5px] border-[#0e0e0e] flex items-center justify-center bg-white hover:shadow-float transition-shadow">
          <MnemosLogo size={24} />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="#how" className="hidden sm:inline-flex pill pill-ghost text-sm px-4 py-2.5">How it works</Link>
          <Link href="#proof" className="hidden sm:inline-flex pill pill-ghost text-sm px-4 py-2.5">Proof</Link>
          <Link href="/workspace" className="pill pill-ink text-sm px-5 py-2.5">
            Launch Engine
            <Icon name="arrow-right" size={15} className="text-white" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative z-20 max-w-3xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 text-center">
          <div className="inline-flex items-center gap-2 pill chip-glass text-[12px] px-3.5 py-1.5 mb-8 anim-fade-up">
            <span className="w-1.5 h-1.5 rounded-full grad-bg" />
            Persistent memory for AI agents
          </div>

          <h1 className="display text-[3.6rem] sm:text-[6.5rem] mb-7 anim-fade-up">
            AI memory
            <br />
            <span className="grad-text">that survives.</span>
          </h1>

          <p className="max-w-md mx-auto text-lg text-[#4a4a45] mb-9 anim-fade-up" style={{ animationDelay: '0.1s' }}>
            Durable, verifiable memory — powered by Walrus.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 anim-fade-up" style={{ animationDelay: '0.15s' }}>
            <Link href="/workspace" className="pill pill-ink text-base px-8 py-4">
              Launch Engine
              <Icon name="arrow-right" size={16} className="text-white" />
            </Link>
            <Link href="#proof" className="pill pill-ghost text-base px-7 py-4">
              See Memory Proof
            </Link>
          </div>
        </div>

        {/* mascot + floating receipts */}
        <div className="relative h-[260px] sm:h-[380px] mt-6 flex justify-center items-start overflow-hidden">
          <div className="bloom-band bottom-0 h-[260px] sm:h-[340px]" />
          <Receipt id="blob_0x9f3a…" label="Stored on Walrus" className="hidden sm:block absolute left-[14%] top-6 rotate-[-6deg] z-20" delay={0.6} />
          <Receipt id="94% match" label="Memory recalled" tone="match" className="hidden sm:block absolute right-[14%] top-16 rotate-[5deg] z-20" delay={1.4} />
          <Mascot
            pose="salute"
            priority
            alt="Mnemos — Walrus mascot"
            className="relative z-10 w-auto h-[440px] sm:h-[600px] drop-shadow-[0_24px_50px_rgba(99,102,241,0.28)]"
          />
        </div>
      </section>

      {/* ─── Built on strip ──────────────────────────────────────────────── */}
      <section className="border-y border-[#e6e4dc] bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-center gap-8 sm:gap-16 flex-wrap">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#9a9a93]">Built on</span>
          <WalrusLogotype height={22} variant="black" />
          <div className="flex items-center gap-2.5">
            <SuiDroplet size={22} variant="blue" />
            <span className="text-xl font-bold tracking-tight">Sui</span>
          </div>
          <div className="flex items-center gap-2">
            <WalToken size={22} variant="color" />
            <span className="text-lg font-bold">WAL</span>
          </div>
        </div>
      </section>

      {/* ─── Poster cards ────────────────────────────────────────────────── */}
      <section id="how" className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32 w-full">
        <h2 className="display text-4xl sm:text-6xl text-center mb-16">How it remembers.</h2>

        <div className="grid md:grid-cols-3 gap-5">
          <StepCard n="01" title="Ask" kicker="It recalls what it already knows." fill="var(--lavender)" delay={0}>
            <span className="w-16 h-16 rounded-2xl bg-white border-[1.5px] border-[#0e0e0e] flex items-center justify-center">
              <Icon name="search" size={30} />
            </span>
          </StepCard>

          <StepCard n="02" title="Store" kicker="New insight becomes a Walrus blob." fill="var(--mint)" delay={0.08}>
            <div className="flex items-end gap-2">
              <span className="w-10 h-10 storage-block bg-white" />
              <span className="w-10 h-14 storage-block bg-[#06b6d4]" />
              <span className="w-10 h-9 storage-block bg-[#6366f1]" />
            </div>
          </StepCard>

          <StepCard n="03" title="Return" kicker="Next session resumes, smarter." fill="var(--sky)" delay={0.16}>
            <span className="w-16 h-16 rounded-2xl bg-white border-[1.5px] border-[#0e0e0e] flex items-center justify-center">
              <MnemosLogo size={36} />
            </span>
          </StepCard>
        </div>
      </section>

      {/* ─── Proof ───────────────────────────────────────────────────────── */}
      <section id="proof" className="border-t border-[#e6e4dc] bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <h2 className="display text-4xl sm:text-6xl mb-4">
            Most AI forgets.
            <br />
            <span className="grad-text">Mnemos remembers.</span>
          </h2>
          <p className="text-[#9a9a93] mb-12">Kill the server — memory comes back from Walrus.</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {PROOF.map((p, i) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-2.5 pill border-[1.5px] border-[#0e0e0e] bg-white text-[15px] font-semibold px-5 py-3 shadow-float anim-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="w-7 h-7 rounded-full grad-bg flex items-center justify-center">
                  <Icon name={p.icon} size={15} className="text-white" />
                </span>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 sm:py-28">
        <div className="relative max-w-6xl mx-auto rounded-[2.5rem] overflow-hidden border-[1.5px] border-[#0e0e0e] bg-white px-8 py-20 sm:py-28 text-center">
          <div className="bloom-band -bottom-10 h-56 opacity-80" />
          <div className="relative z-10">
            <h2 className="display text-4xl sm:text-7xl mb-8">
              Build agents
              <br />
              <span className="grad-text">that remember.</span>
            </h2>
            <Link href="/workspace" className="pill pill-ink text-base px-8 py-4">
              Launch Engine
              <Icon name="arrow-right" size={16} className="text-white" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e6e4dc] px-5 sm:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MnemosLogo size={24} />
            <span className="font-bold">Mnemos</span>
          </div>
          <p className="text-xs text-[#9a9a93]">
            Built on <span className="text-[#06b6d4] font-medium">Walrus</span> · <span className="text-[#6366f1] font-medium">Sui</span> · Sui Overflow 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
