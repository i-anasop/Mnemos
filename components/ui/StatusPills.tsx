'use client';

import { useState } from 'react';

interface Service {
  key: string;
  label: string;
  match: string; // substring to find in diagnostic check names
}

const SERVICES: Service[] = [
  { key: 'llm', label: 'LLM', match: 'LLM' },
  { key: 'voyage', label: 'Voyage', match: 'Voyage' },
  { key: 'walrus', label: 'Walrus', match: 'Walrus' },
];

type State = 'idle' | 'checking' | 'ok' | 'fail';

interface DiagnosticResponse {
  status: string;
  checks: { name: string; status: 'ok' | 'fail' | 'skip' }[];
}

const DOT: Record<State, string> = {
  idle: '#c2c0b5',
  checking: '#f59e0b',
  ok: '#22c55e',
  fail: '#ef4444',
};

export default function StatusPills() {
  const [states, setStates] = useState<Record<string, State>>({
    llm: 'idle',
    voyage: 'idle',
    walrus: 'idle',
  });
  const [busy, setBusy] = useState(false);

  const runCheck = async () => {
    if (busy) return;
    setBusy(true);
    setStates({ llm: 'checking', voyage: 'checking', walrus: 'checking' });
    try {
      const res = await fetch('/api/diagnostic');
      const data = (await res.json()) as DiagnosticResponse;
      const next: Record<string, State> = {};
      for (const svc of SERVICES) {
        const check = data.checks.find((c) => c.name.includes(svc.match));
        next[svc.key] = check ? (check.status === 'fail' ? 'fail' : 'ok') : 'fail';
      }
      setStates(next);
    } catch {
      setStates({ llm: 'fail', voyage: 'fail', walrus: 'fail' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {SERVICES.map((svc) => (
        <span
          key={svc.key}
          className="hidden sm:inline-flex items-center gap-1.5 pill pill-ghost text-[11px] px-2.5 py-1"
          title={`${svc.label}: ${states[svc.key]}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${states[svc.key] === 'checking' ? 'animate-pulse' : ''}`}
            style={{ background: DOT[states[svc.key]] }}
          />
          {svc.label}
        </span>
      ))}
      <button
        onClick={runCheck}
        disabled={busy}
        className="pill pill-ghost text-[11px] px-2.5 py-1 disabled:opacity-50"
        title="Run live health check"
      >
        {busy ? 'Checking...' : 'Check'}
      </button>
    </div>
  );
}
