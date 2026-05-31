import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import Mascot from '@/components/ui/Mascot';
import Reveal from '@/components/ui/Reveal';
import SectionNav from '@/components/ui/SectionNav';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalrusLogotype, WalToken } from '@/components/ui/Brand';

/* ─── Big poster card (Ask / Store / Return) ────────────────────────────── */
function StepCard({
  n, title, kicker, fill, children,
}: { n: string; title: string; kicker: string; fill: string; children: React.ReactNode }) {
  return (
    <div
      className="force-ink group relative border-2 border-[#0e0e0e] rounded-[2rem] p-8 sm:p-9 min-h-[360px] flex flex-col overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-22px_rgba(14,14,14,0.4)]"
      style={{ background: fill }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono font-bold text-[#0e0e0e]/40">{n}</span>
        <span className="text-xs font-bold tracking-widest uppercase text-[#0e0e0e]/45">Step</span>
      </div>
      <h3 className="display text-[3.4rem] sm:text-[3.8rem] mt-6 font-bold text-[#0e0e0e]">{title}</h3>
      <p className="text-base font-medium text-[#3a3a35] mt-2.5 max-w-[15rem]">{kicker}</p>
      <div className="mt-auto pt-8 flex justify-end items-end">{children}</div>
    </div>
  );
}

const PROOF: { icon: IconName; label: string; sub: string }[] = [
  { icon: 'database',  label: 'Stored on Walrus',     sub: 'Public blob IDs' },
  { icon: 'restart',   label: 'Survives restart',     sub: 'Index rehydrates' },
  { icon: 'target',    label: 'Retrieved by meaning', sub: 'Cosine similarity' },
  { icon: 'lightbulb', label: 'Explains why',         sub: 'Score + reason' },
];

export default function LandingPage() {
  return (
    <>
      {/* ─── Floating pill header ─────────────────────────────────────────── */}
      <div className="fixed top-4 sm:top-5 inset-x-0 z-50 px-4 sm:px-8">
        <nav className="max-w-[80rem] mx-auto flex items-center gap-4 rounded-full border border-[var(--line)] bg-[var(--card)]/75 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.22)] pl-5 pr-2.5 sm:pl-7 sm:pr-3 py-2.5">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2.5 group">
              <MnemosLogo size={30} className="group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold tracking-tight">Mnemos</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-9 justify-center">
            <a href="#how" className="group relative text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
              How it works
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 group-hover:w-full grad-bg rounded-full transition-all duration-300" />
            </a>
            <a href="#proof" className="group relative text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
              Proof
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 group-hover:w-full grad-bg rounded-full transition-all duration-300" />
            </a>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            <ThemeToggle />
            <Link href="/workspace" className="pill pill-ink text-[15px] font-semibold px-5 py-2.5">
              Launch Engine
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </nav>
      </div>

      <SectionNav />

      {/* ─── Snap-scroll container ────────────────────────────────────────── */}
      <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[var(--paper)] text-[var(--ink)]">
        {/* ── Section 1 — Hero ── */}
        <section id="hero" className="snap-start snap-always relative h-screen flex flex-col items-center overflow-hidden px-6 sm:px-16 lg:px-28 pt-28 sm:pt-32">
          <div className="bloom bloom-violet w-[560px] h-[560px] -top-24 -left-24" />
          <div className="bloom bloom-teal w-[660px] h-[660px] -top-32 right-[-16rem]" />

          <Reveal className="relative z-20 text-center max-w-5xl flex-shrink-0">
            <div className="inline-flex items-center gap-2 pill chip-glass text-[13px] font-semibold px-4 py-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full grad-bg" />
              Persistent memory for AI agents
            </div>

            <h1 className="display text-[3.1rem] leading-[0.9] sm:text-[5.6rem] font-bold mb-4">
              AI memory
              <br />
              <span className="grad-text">that survives.</span>
            </h1>

            <p className="max-w-lg mx-auto text-base sm:text-xl font-medium text-[var(--muted)] mb-7">
              Durable, verifiable memory — powered by Walrus.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/workspace" className="group pill pill-ink text-base font-semibold px-8 py-3.5">
                Launch Engine
                <Icon name="arrow-right" size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#proof" className="pill pill-ghost text-base font-semibold px-7 py-3.5">
                See Memory Proof
              </a>
            </div>
          </Reveal>

          {/* mascot — big, cropped to ~the teeth, edge fades out */}
          <div className="relative flex-1 min-h-0 mt-1 w-full flex justify-center items-start overflow-hidden">
            <div className="bloom-band bottom-0 h-[240px] sm:h-[340px]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[740px] h-[560px] halo opacity-95" />
            <Mascot
              pose="primary"
              priority
              alt="Mnemos mascot"
              className="relative z-10 w-auto h-[1080px] sm:h-[1420px] mask-fade-b drop-shadow-[0_24px_60px_rgba(99,102,241,0.28)]"
            />
          </div>

          {/* scroll cue */}
          <a
            href="#how"
            aria-label="Scroll to how it works"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-11 h-11 rounded-full border border-[var(--line)] bg-[var(--card)]/70 backdrop-blur flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors anim-bob"
          >
            <Icon name="arrow-right" size={18} className="rotate-90" />
          </a>
        </section>

        {/* ── Section 2 — How it remembers ── */}
        <section id="how" className="snap-start snap-always relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 sm:px-16 lg:px-28 py-28">
          {/* richer backdrop */}
          <div className="absolute inset-0 noise-grid opacity-50" />
          <div className="bloom bloom-violet w-[460px] h-[460px] -top-10 -left-16 opacity-35" />
          <div className="bloom bloom-teal w-[520px] h-[520px] top-20 -right-24 opacity-35" />
          <div className="bloom bloom-mint w-[420px] h-[420px] bottom-0 left-1/4 opacity-30" />
          <span className="absolute left-[12%] top-[24%] w-2 h-2 rounded-full grad-bg opacity-60 anim-float" />
          <span className="absolute right-[14%] top-[30%] w-1.5 h-1.5 rounded-full bg-[#a855f7] opacity-50 anim-float" style={{ animationDelay: '1s' }} />
          <span className="absolute left-[20%] bottom-[22%] w-1.5 h-1.5 rounded-full bg-[#06b6d4] opacity-50 anim-float" style={{ animationDelay: '1.6s' }} />

          <Reveal className="relative z-10 text-center mb-14">
            <p className="text-sm font-bold tracking-widest uppercase text-[var(--faint)] mb-4">How it works</p>
            <h2 className="display text-5xl sm:text-7xl font-bold">How it remembers.</h2>
          </Reveal>

          <div className="relative z-10 grid md:grid-cols-3 gap-6 w-full max-w-6xl">
            <Reveal delay={0}>
              <StepCard n="01" title="Ask" kicker="It recalls what it already knows." fill="var(--lavender)">
                <span className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-white border-2 border-[#0e0e0e] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon name="search" size={34} className="text-[#0e0e0e]" />
                </span>
              </StepCard>
            </Reveal>
            <Reveal delay={0.12}>
              <StepCard n="02" title="Store" kicker="New insight becomes a Walrus blob." fill="var(--mint)">
                <div className="flex items-end gap-2.5 transition-transform duration-300 group-hover:-translate-y-1">
                  <span className="w-11 h-11 storage-block bg-white" />
                  <span className="w-11 h-16 storage-block bg-[#06b6d4]" />
                  <span className="w-11 h-10 storage-block bg-[#6366f1]" />
                </div>
              </StepCard>
            </Reveal>
            <Reveal delay={0.24}>
              <StepCard n="03" title="Return" kicker="Next session resumes, smarter." fill="var(--sky)">
                <span className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-white border-2 border-[#0e0e0e] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <MnemosLogo size={40} />
                </span>
              </StepCard>
            </Reveal>
          </div>
        </section>

        {/* ── Section 3 — Proof + CTA (two-column finale) ── */}
        <section id="proof" className="snap-start snap-always relative min-h-screen flex items-center overflow-hidden px-6 sm:px-16 lg:px-28 py-24">
          <div className="bloom bloom-violet w-[520px] h-[520px] -top-16 -left-24 opacity-35" />
          <div className="bloom bloom-teal w-[560px] h-[560px] bottom-[-8rem] -right-24 opacity-35" />
          <div className="bloom-band -bottom-12 h-64 opacity-60" />

          <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* left — statement + CTA */}
            <Reveal>
              <p className="text-sm font-bold tracking-widest uppercase text-[var(--faint)] mb-5">Proof, not promises</p>
              <h2 className="display text-5xl sm:text-7xl font-bold mb-6">
                Most AI forgets.
                <br />
                <span className="grad-text">Mnemos remembers.</span>
              </h2>
              <p className="text-lg text-[var(--muted)] max-w-md mb-9 leading-relaxed">
                Kill the server — memory comes back from Walrus, recalled by meaning and verifiable on-chain.
              </p>
              <Link href="/workspace" className="group pill pill-ink text-lg font-semibold px-9 py-4">
                Launch Engine
                <Icon name="arrow-right" size={19} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Reveal>

            {/* right — proof grid */}
            <Reveal delay={0.12}>
              <div className="grid grid-cols-2 gap-4">
                {PROOF.map((p) => (
                  <div
                    key={p.label}
                    className="group bg-[var(--card)] border-2 border-[var(--ink)] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_54px_-22px_rgba(14,14,14,0.45)]"
                  >
                    <span className="inline-flex w-14 h-14 rounded-2xl bg-[#0e0e0e] items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      {p.label === 'Stored on Walrus'
                        ? <WalToken size={26} variant="white" />
                        : <Icon name={p.icon} size={26} className="text-white" strokeWidth={2.2} />}
                    </span>
                    <p className="font-bold text-base leading-tight">{p.label}</p>
                    <p className="text-[13px] text-[var(--faint)] mt-1.5">{p.sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* built-on + footer line */}
          <div className="absolute bottom-7 inset-x-0 flex flex-col items-center gap-3 px-6">
            <div className="flex items-center justify-center gap-7 flex-wrap opacity-80">
              <span className="text-xs font-bold tracking-widest uppercase text-[var(--faint)]">Built on</span>
              <WalrusLogotype height={18} variant="black" className="dark:hidden" />
              <WalrusLogotype height={18} variant="white" className="hidden dark:block" />
              <div className="flex items-center gap-2"><SuiDroplet size={18} variant="blue" /><span className="text-base font-bold">Sui</span></div>
              <div className="flex items-center gap-1.5"><WalToken size={18} variant="color" /><span className="text-sm font-bold">WAL</span></div>
            </div>
            <p className="text-[11px] text-[var(--faint)]">Sui Overflow 2026 · Walrus Track</p>
          </div>
        </section>
      </main>
    </>
  );
}
