import Link from 'next/link';

const FEATURES = [
  {
    icon: '◈',
    title: 'Persistent Memory',
    desc: 'Every insight is stored as a verifiable blob on Walrus. Your AI never forgets.',
  },
  {
    icon: '◉',
    title: 'Verifiable Storage',
    desc: 'Each memory blob has a cryptographic ID anchored on Sui. Prove what the agent knew and when.',
  },
  {
    icon: '◎',
    title: 'Evolving Intelligence',
    desc: 'Agents retrieve prior context every session. Confidence improves over time.',
  },
];

const STEPS = [
  { step: '01', label: 'Ask', desc: 'Submit a research question or topic to investigate' },
  { step: '02', label: 'Remember', desc: 'Agent retrieves relevant blobs from Walrus memory' },
  { step: '03', label: 'Research', desc: 'Multi-agent workflow generates structured findings' },
  { step: '04', label: 'Persist', desc: 'Synthesis stored as a verifiable Walrus blob' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#1f1f1f] px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-mono tracking-widest text-[#06b6d4] uppercase">Mnemos</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#555] font-mono">Sui Overflow 2026</span>
          <Link
            href="/workspace"
            className="text-xs px-4 py-2 rounded-md border border-[#06b6d4] text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-colors font-mono"
          >
            Open Workspace →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1f1f1f] text-xs text-[#888] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" />
          Walrus Track · Sui Overflow 2026
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-none">
          <span className="text-gradient">AI memory</span>
          <br />
          <span className="text-[#f0f0f0]">that persists.</span>
        </h1>

        <p className="max-w-xl text-lg text-[#888] mb-10 leading-relaxed">
          Mnemos gives AI agents real, verifiable, decentralized memory backed by Walrus.
          Every session builds on the last. Your agent gets smarter every time.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/workspace"
            className="px-8 py-3.5 rounded-lg bg-[#06b6d4] text-black text-sm font-semibold hover:bg-[#0891b2] transition-colors"
          >
            Start a Session
          </Link>
          <a
            href="https://docs.walrus.site"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-lg border border-[#1f1f1f] text-[#888] text-sm hover:border-[#333] hover:text-[#aaa] transition-colors"
          >
            Walrus Docs
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#1f1f1f] px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-[#1f1f1f] bg-[#111] hover:border-[#06b6d4]/30 transition-colors"
            >
              <div className="text-2xl text-[#06b6d4] mb-3 font-mono">{f.icon}</div>
              <h3 className="text-sm font-semibold text-[#f0f0f0] mb-2">{f.title}</h3>
              <p className="text-xs text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1f1f1f] px-6 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-bold text-[#f0f0f0] mb-3">How it works</h2>
          <p className="text-sm text-[#666]">One workflow. Persistent by design.</p>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STEPS.map(item => (
            <div key={item.step} className="flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#06b6d4]/40 flex items-center justify-center text-xs font-mono text-[#06b6d4]">
                {item.step}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#f0f0f0]">{item.label}</div>
                <div className="text-xs text-[#555] mt-1 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] px-6 py-6 text-center">
        <p className="text-xs text-[#444] font-mono">
          Built on{' '}
          <span className="text-[#06b6d4]">Walrus</span>
          {' · '}
          <span className="text-[#6366f1]">Sui</span>
          {' · '}
          Sui Overflow 2026
        </p>
      </footer>
    </main>
  );
}
