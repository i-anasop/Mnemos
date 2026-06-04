import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/Icon';
import Mascot from '@/components/ui/Mascot';
import Reveal from '@/components/ui/Reveal';
import SectionNav from '@/components/ui/SectionNav';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MnemosLogo } from '@/components/ui/Logo';
import { SuiDroplet, WalToken } from '@/components/ui/Brand';
import LandingInteractions from '@/components/ui/LandingInteractions';

function StepCard({
  n, title, kicker, fill, children,
}: { n: string; title: string; kicker: string; fill: string; children: React.ReactNode }) {
  return (
    <div
      data-tilt
      data-ripple
      className="step-card force-ink group relative border-2 border-[#0e0e0e] rounded-[1.75rem] sm:rounded-[2rem] p-6 sm:p-9 min-h-[200px] sm:min-h-[360px] flex flex-col overflow-hidden shadow-card transition-all duration-300"
      style={{ background: fill }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono font-bold text-[#0e0e0e]/40">{n}</span>
        <span className="text-xs font-bold tracking-widest uppercase text-[#0e0e0e]/45">Step</span>
      </div>
      <h3 className="display text-[2.5rem] sm:text-[3.8rem] mt-4 sm:mt-6 font-bold text-[#0e0e0e]">{title}</h3>
      <p className="text-[15px] sm:text-base font-medium text-[#3a3a35] mt-2 max-w-[15rem]">{kicker}</p>
      <div className="mt-auto pt-6 sm:pt-8 flex justify-end items-end">{children}</div>
    </div>
  );
}

const PROOF: { icon: IconName; label: string; sub: string }[] = [
  { icon: 'database',  label: 'Stored on Walrus',     sub: 'Public blob IDs' },
  { icon: 'restart',   label: 'Survives restart',     sub: 'Index rehydrates' },
  { icon: 'target',    label: 'Retrieved by meaning', sub: 'Cosine similarity' },
  { icon: 'lightbulb', label: 'Explains why',         sub: 'Score + reason' },
];

const PROOF_BLOB_ID = 'nhmVMKMYH4dK1eFlH_qEwjY4YJrKSCtRFeltHmEIvdY';
const PROOF_BLOB_URL = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${PROOF_BLOB_ID}`;

export default function LandingPage() {
  return (
    <>
      <LandingInteractions />
      <div className="fixed top-4 sm:top-5 inset-x-0 z-50 px-4 sm:px-8">
        <nav className="max-w-[76rem] mx-auto flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--card)]/82 backdrop-blur-2xl shadow-[0_16px_48px_-24px_rgba(0,0,0,0.34)] pl-4 pr-2 py-2 sm:pl-5 sm:pr-2.5">
          <div className="flex-1 flex justify-start">
            <Link href="/" data-magnetic data-ripple className="interactive-link flex items-center gap-2.5 group min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)]/65">
                <MnemosLogo size={25} className="group-hover:scale-105 transition-transform" />
              </span>
              <span className="text-lg font-bold tracking-tight">Mnemos</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)]/55 p-1">
            <a href="#how" data-magnetic data-ripple className="nav-chip rounded-full px-4 py-2 text-[14px] font-semibold text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)] transition-colors">
              How it works
            </a>
            <a href="#proof" data-magnetic data-ripple className="nav-chip rounded-full px-4 py-2 text-[14px] font-semibold text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)] transition-colors">
              Proof
            </a>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            <ThemeToggle />
            <Link href="/workspace" data-magnetic data-ripple className="group pill pill-ink text-[14px] sm:text-[15px] font-semibold px-4 sm:px-5 py-2.5 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]">
              Launch Engine
              <Icon name="arrow-right" size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </nav>
      </div>

      <SectionNav />

      <main className="snap-main h-[100dvh] overflow-y-auto snap-y bg-[var(--paper)] text-[var(--ink)]">
        <section id="hero" className="hero-section landing-section snap-start snap-always relative h-[100dvh] flex flex-col items-center overflow-hidden px-6 sm:px-16 lg:px-28 pt-24 sm:pt-32">
          <div className="hero-grid absolute inset-0 noise-grid opacity-40" />
          <div className="bloom bloom-violet w-[560px] h-[560px] -top-24 -left-24" />
          <div className="bloom bloom-teal w-[660px] h-[660px] -top-32 right-[-16rem]" />
          <span className="absolute left-[15%] top-[31%] w-2 h-2 rounded-full grad-bg opacity-55 anim-float" />
          <span className="absolute right-[18%] top-[39%] w-1.5 h-1.5 rounded-full bg-[#a855f7] opacity-45 anim-float" style={{ animationDelay: '1.1s' }} />
          <span className="absolute left-[29%] bottom-[30%] w-1.5 h-1.5 rounded-full bg-[#06b6d4] opacity-45 anim-float" style={{ animationDelay: '1.7s' }} />

          <Reveal className="hero-copy relative z-20 text-center max-w-4xl flex-shrink-0">
            <p className="hero-eyebrow mb-5">Walrus-backed memory</p>

            <h1 className="display text-[3rem] leading-[0.92] sm:text-[5.6rem] font-bold mb-5">
              Persistent
              <br />
              <span className="grad-text">AI memory.</span>
            </h1>

            <p className="max-w-[39rem] mx-auto text-[15px] sm:text-xl font-medium text-[var(--muted)] mb-7 sm:mb-8 leading-relaxed">
              Mnemos gives agents durable context they can recall, verify, and continue with across sessions.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/workspace" data-magnetic data-ripple className="hero-action group pill pill-ink text-[15px] sm:text-base font-semibold px-7 sm:px-8 py-3.5">
                Launch Engine
                <Icon name="arrow-right" size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#proof" data-magnetic data-ripple className="hero-action pill pill-ghost text-[15px] sm:text-base font-semibold px-6 sm:px-7 py-3.5">
                See Proof
              </a>
            </div>
          </Reveal>

          <div className="hero-mascot-stage relative mt-auto -mb-2 sm:-mb-4 w-full flex justify-center items-start overflow-hidden">
            <Mascot
              pose="primary"
              priority
              alt="Mnemos mascot"
              className="hero-mascot relative z-10 w-auto mask-fade-b"
            />
          </div>

          <a
            href="#how"
            aria-label="Scroll to how it works"
            className="scroll-cue absolute bottom-6 left-1/2 z-30 w-11 h-11 rounded-full border border-[var(--line)] bg-[var(--card)]/70 backdrop-blur flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors anim-bob"
          >
            <Icon name="arrow-right" size={18} className="rotate-90" />
          </a>
        </section>

        <section id="how" className="landing-section snap-start snap-always relative h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-6 sm:px-16 lg:px-28 py-24 sm:py-28">
          <div className="absolute inset-0 noise-grid opacity-50" />
          <div className="bloom bloom-violet w-[460px] h-[460px] -top-10 -left-16 opacity-35" />
          <div className="bloom bloom-teal w-[520px] h-[520px] top-20 -right-24 opacity-35" />
          <div className="bloom bloom-mint w-[420px] h-[420px] bottom-0 left-1/4 opacity-30" />
          <span className="absolute left-[12%] top-[24%] w-2 h-2 rounded-full grad-bg opacity-60 anim-float" />
          <span className="absolute right-[14%] top-[30%] w-1.5 h-1.5 rounded-full bg-[#a855f7] opacity-50 anim-float" style={{ animationDelay: '1s' }} />
          <span className="absolute left-[20%] bottom-[22%] w-1.5 h-1.5 rounded-full bg-[#06b6d4] opacity-50 anim-float" style={{ animationDelay: '1.6s' }} />

          <Reveal className="relative z-10 text-center mb-9 sm:mb-14">
            <p className="text-[13px] sm:text-sm font-bold tracking-widest uppercase text-[var(--faint)] mb-3 sm:mb-4">How it works</p>
            <h2 className="display text-[2.6rem] sm:text-7xl font-bold">How it remembers.</h2>
          </Reveal>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-6xl">
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

        <section id="proof" className="proof-section landing-section snap-start snap-always relative h-[100dvh] flex items-center overflow-hidden px-6 sm:px-16 lg:px-28 py-24 pb-32 sm:pb-24">
          <div className="hero-grid absolute inset-0 noise-grid opacity-45" />
          <div className="bloom bloom-violet w-[520px] h-[520px] -top-16 -left-24 opacity-30" />
          <div className="bloom bloom-teal w-[560px] h-[560px] bottom-[-8rem] -right-24 opacity-32" />
          <span className="absolute left-[10%] top-[25%] w-1.5 h-1.5 rounded-full bg-[#6366f1] opacity-45 anim-float" style={{ animationDelay: '0.3s' }} />
          <span className="absolute right-[12%] top-[29%] w-2 h-2 rounded-full grad-bg opacity-55 anim-float" style={{ animationDelay: '1.2s' }} />
          <span className="absolute left-[20%] bottom-[24%] w-1.5 h-1.5 rounded-full bg-[#06b6d4] opacity-45 anim-float" style={{ animationDelay: '1.8s' }} />
          <span className="absolute right-[22%] bottom-[20%] w-1.5 h-1.5 rounded-full bg-[#a855f7] opacity-45 anim-float" style={{ animationDelay: '0.7s' }} />

          <div className="proof-content relative z-20 w-full max-w-6xl mx-auto grid lg:grid-cols-[0.82fr_1.18fr] gap-8 lg:gap-12 items-center">
            <Reveal className="proof-copy">
              <p className="text-[13px] sm:text-sm font-bold tracking-widest uppercase text-[var(--faint)] mb-4 sm:mb-5">Proof, not promises</p>
              <h2 className="display text-[2.6rem] sm:text-7xl font-bold mb-5 sm:mb-6 leading-[0.94]">
                Memory you can
                <br />
                <span className="grad-text">verify.</span>
              </h2>
              <p className="text-base sm:text-lg text-[var(--muted)] max-w-[30rem] mb-6 sm:mb-7 leading-relaxed">
                Every useful memory can point back to a Walrus blob, then return with similarity, context, and a reason trail.
              </p>
              <div className="proof-tags mb-7 sm:mb-9">
                <span data-magnetic data-ripple>Blob IDs</span>
                <span data-magnetic data-ripple>Similarity scores</span>
                <span data-magnetic data-ripple>Reason traces</span>
              </div>
              <Link href="/workspace" data-magnetic data-ripple className="hero-action group pill pill-ink text-base sm:text-lg font-semibold px-8 sm:px-9 py-3.5 sm:py-4">
                Launch Engine
                <Icon name="arrow-right" size={19} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="proof-stage">
                <div className="proof-lab">
                  <div className="proof-lab-head">
                    <div className="flex items-center gap-2">
                      <span className="proof-live-dot" />
                      <span>Walrus proof packet</span>
                    </div>
                    <span className="proof-lab-status">Live memory</span>
                  </div>

                  <div className="proof-hash-card">
                    <div className="proof-hash-top">
                      <span className="proof-hash-label">Blob ID</span>
                      <a href={PROOF_BLOB_URL} target="_blank" rel="noopener noreferrer" data-ripple className="proof-verify-link">
                        Verify on Walrus
                        <Icon name="arrow-up-right" size={14} strokeWidth={2.4} />
                      </a>
                    </div>
                    <p className="proof-hash-value">{PROOF_BLOB_ID}</p>
                    <div className="proof-hash-meta">
                      <span><WalToken size={14} variant="color" /> testnet</span>
                      <span>content addressed</span>
                      <span>rehydrated</span>
                    </div>
                  </div>

                  <div className="proof-memory-row">
                    <div className="proof-score">
                      <span className="proof-score-number">92%</span>
                      <span className="proof-score-label">similarity</span>
                    </div>
                    <div className="proof-reason">
                      <span className="proof-hash-label">Why this memory returned</span>
                      <p>Matches durable AI-governance context from a previous session and cites the stored blob.</p>
                    </div>
                  </div>

                  <div className="proof-grid compact grid grid-cols-2 gap-2.5 sm:gap-3">
                    {PROOF.map((p, index) => (
                      <article
                        key={p.label}
                        data-ripple
                        className="proof-card group"
                      >
                        <div className="proof-card-top">
                          <span className="proof-icon">
                            {p.label === 'Stored on Walrus'
                              ? <WalToken size={22} variant="white" />
                              : <Icon name={p.icon} size={22} className="text-white" strokeWidth={2.2} />}
                          </span>
                          <span className="proof-index">0{index + 1}</span>
                        </div>
                        <span className="proof-status">Verified</span>
                        <p className="proof-title font-bold text-[14px] leading-tight">{p.label}</p>
                        <p className="proof-sub text-[12px] text-[var(--faint)] mt-1">{p.sub}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <footer className="absolute bottom-5 sm:bottom-6 inset-x-0 px-4 sm:px-8">
            <div className="mx-auto flex max-w-[58rem] flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl sm:rounded-full border border-[var(--line)] bg-[var(--card)]/78 px-4 sm:px-5 py-3 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
              <div className="flex items-center justify-center gap-4 sm:gap-5 flex-wrap">
                <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--faint)]">Built on</span>
                <div data-magnetic data-ripple className="brand-chip flex items-center gap-1.5"><SuiDroplet size={17} variant="blue" /><span className="text-sm font-bold">Sui</span></div>
                <div data-magnetic data-ripple className="brand-chip flex items-center gap-1.5"><WalToken size={17} variant="color" /><span className="text-sm font-bold">WAL</span></div>
              </div>
              <p className="text-[11px] font-semibold text-[var(--faint)]">Sui Overflow 2026 - Walrus Track</p>
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}
