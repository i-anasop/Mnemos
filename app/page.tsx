import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import Mascot from '@/components/ui/Mascot';
import Reveal from '@/components/ui/Reveal';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalrusLogotype, WalToken } from '@/components/ui/Brand';

/* ─── Big poster card (Ask / Store / Return) ────────────────────────────── */
function StepCard({
  n, title, kicker, fill, children,
}: { n: string; title: string; kicker: string; fill: string; children: React.ReactNode }) {
  return (
    <div
      className="relative border-2 border-[#0e0e0e] rounded-[2rem] p-8 sm:p-9 min-h-[360px] flex flex-col overflow-hidden shadow-card transition-transform hover:-translate-y-1.5"
      style={{ background: fill }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono font-bold text-[#0e0e0e]/40">{n}</span>
        <span className="text-xs font-bold tracking-widest uppercase text-[#0e0e0e]/45">Step</span>
      </div>
      <h3 className="display text-[3.4rem] sm:text-[3.8rem] mt-6 font-bold">{title}</h3>
      <p className="text-base font-medium text-[#3a3a35] mt-2.5 max-w-[15rem]">{kicker}</p>
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
    <>
      {/* ─── Floating pill header ─────────────────────────────────────────── */}
      <div className="fixed top-4 sm:top-5 inset-x-0 z-50 px-4 sm:px-8">
        <nav className="max-w-6xl mx-auto flex items-center gap-4 rounded-full border border-[#e6e4dc] bg-white/75 backdrop-blur-xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.22)] pl-5 pr-2.5 sm:pl-7 sm:pr-3 py-2.5">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2.5 group">
              <MnemosLogo size={30} className="group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold tracking-tight">Mnemos</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-9 justify-center">
            <a href="#how" className="text-[15px] font-semibold text-[#6b6b66] hover:text-[#0e0e0e] transition-colors">How it works</a>
            <a href="#proof" className="text-[15px] font-semibold text-[#6b6b66] hover:text-[#0e0e0e] transition-colors">Proof</a>
          </div>
          <div className="flex-1 flex justify-end">
            <Link href="/workspace" className="pill pill-ink text-[15px] font-semibold px-5 py-2.5">
              Launch Engine
              <Icon name="arrow-right" size={16} className="text-white" />
            </Link>
          </div>
        </nav>
      </div>

      {/* ─── Snap-scroll container ────────────────────────────────────────── */}
      <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[#f6f5f1] text-[#0e0e0e]">
        {/* ── Section 1 — Hero ── */}
        <section className="snap-start snap-always relative h-screen flex flex-col items-center overflow-hidden px-6 sm:px-16 lg:px-28 pt-28 sm:pt-32">
          <div className="bloom bloom-violet w-[560px] h-[560px] -top-24 -left-24" />
          <div className="bloom bloom-teal w-[660px] h-[660px] -top-32 right-[-16rem]" />

          <Reveal className="relative z-20 text-center max-w-5xl flex-shrink-0">
            <div className="inline-flex items-center gap-2 pill chip-glass text-[13px] font-semibold px-4 py-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full grad-bg" />
              Persistent memory for AI agents
            </div>

            <h1 className="display text-[3.8rem] leading-[0.9] sm:text-[8rem] font-bold mb-7">
              AI memory
              <br />
              <span className="grad-text">that survives.</span>
            </h1>

            <p className="max-w-xl mx-auto text-xl sm:text-2xl font-medium text-[#4a4a45] mb-10">
              Durable, verifiable memory — powered by Walrus.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/workspace" className="pill pill-ink text-lg font-semibold px-10 py-5">
                Launch Engine
                <Icon name="arrow-right" size={18} className="text-white" />
              </Link>
              <a href="#proof" className="pill pill-ghost text-lg font-semibold px-9 py-5">
                See Memory Proof
              </a>
            </div>
          </Reveal>

          {/* big mascot — fills remaining space, auto-cropped to head/nose */}
          <div className="relative flex-1 min-h-0 mt-3 w-full flex justify-center items-start overflow-hidden">
            <div className="bloom-band bottom-0 h-[240px] sm:h-[320px]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[520px] halo opacity-95" />
            <Mascot
              pose="primary"
              priority
              alt="Mnemos mascot"
              className="relative z-10 w-auto h-[1100px] sm:h-[1500px] drop-shadow-[0_24px_60px_rgba(99,102,241,0.32)]"
            />
          </div>
        </section>

        {/* ── Section 2 — How it remembers ── */}
        <section id="how" className="snap-start snap-always relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 sm:px-16 lg:px-28 py-28">
          <div className="bloom bloom-indigo w-[520px] h-[520px] top-10 left-1/2 -translate-x-1/2 opacity-25" />
          <Reveal className="relative z-10 text-center mb-14">
            <p className="text-sm font-bold tracking-widest uppercase text-[#9a9a93] mb-4">How it works</p>
            <h2 className="display text-5xl sm:text-7xl font-bold">How it remembers.</h2>
          </Reveal>

          <div className="relative z-10 grid md:grid-cols-3 gap-6 w-full max-w-6xl">
            <Reveal delay={0}>
              <StepCard n="01" title="Ask" kicker="It recalls what it already knows." fill="var(--lavender)">
                <span className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-white border-2 border-[#0e0e0e] flex items-center justify-center">
                  <Icon name="search" size={34} />
                </span>
              </StepCard>
            </Reveal>
            <Reveal delay={0.12}>
              <StepCard n="02" title="Store" kicker="New insight becomes a Walrus blob." fill="var(--mint)">
                <div className="flex items-end gap-2.5">
                  <span className="w-11 h-11 storage-block bg-white" />
                  <span className="w-11 h-16 storage-block bg-[#06b6d4]" />
                  <span className="w-11 h-10 storage-block bg-[#6366f1]" />
                </div>
              </StepCard>
            </Reveal>
            <Reveal delay={0.24}>
              <StepCard n="03" title="Return" kicker="Next session resumes, smarter." fill="var(--sky)">
                <span className="w-18 h-18 rounded-2xl bg-white border-2 border-[#0e0e0e] flex items-center justify-center p-3">
                  <MnemosLogo size={40} />
                </span>
              </StepCard>
            </Reveal>
          </div>
        </section>

        {/* ── Section 3 — Proof + CTA ── */}
        <section id="proof" className="snap-start snap-always relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-6 sm:px-16 lg:px-28 py-24">
          <div className="bloom-band -bottom-10 h-72 opacity-70" />

          <Reveal className="relative z-10 max-w-4xl">
            <h2 className="display text-5xl sm:text-8xl font-bold mb-6">
              Most AI forgets.
              <br />
              <span className="grad-text">Mnemos remembers.</span>
            </h2>
            <p className="text-xl font-medium text-[#6b6b66] mb-12">Kill the server — memory comes back from Walrus.</p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 mb-14">
              {PROOF.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-2.5 pill border-2 border-[#0e0e0e] bg-white text-base font-semibold px-5 py-3.5 shadow-float"
                >
                  {p.label === 'Stored on Walrus' ? (
                    <WalToken size={20} variant="color" />
                  ) : (
                    <Icon name={p.icon} size={20} className="text-[#0e0e0e]" strokeWidth={2.1} />
                  )}
                  {p.label}
                </span>
              ))}
            </div>

            <Link href="/workspace" className="pill pill-ink text-xl font-semibold px-12 py-6">
              Launch Engine
              <Icon name="arrow-right" size={20} className="text-white" />
            </Link>
          </Reveal>

          {/* built-on + footer line */}
          <div className="absolute bottom-7 inset-x-0 flex flex-col items-center gap-3 px-6">
            <div className="flex items-center justify-center gap-7 flex-wrap opacity-80">
              <span className="text-xs font-bold tracking-widest uppercase text-[#9a9a93]">Built on</span>
              <WalrusLogotype height={18} variant="black" />
              <div className="flex items-center gap-2"><SuiDroplet size={18} variant="blue" /><span className="text-base font-bold">Sui</span></div>
              <div className="flex items-center gap-1.5"><WalToken size={18} variant="color" /><span className="text-sm font-bold">WAL</span></div>
            </div>
            <p className="text-[11px] text-[#b3b1a8]">Sui Overflow 2026 · Walrus Track</p>
          </div>
        </section>
      </main>
    </>
  );
}
