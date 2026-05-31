import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

// Display/body type is Satoshi (loaded from Fontshare in <head>) — a clean
// neo-grotesk, the closest free match to Walrus's hero typeface (Aeonik).
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mnemos · Persistent AI Memory',
  description:
    'A persistent AI memory engine powered by Walrus. Durable, verifiable memory for AI agents across sessions.',
  icons: {
    icon: '/brand/mnemos-logo.svg',
  },
};

// Silences the noisy "Cannot redefine property: ethereum" error thrown when
// multiple crypto-wallet browser extensions fight over window.ethereum. It is
// not a Mnemos error — this just stops the dev overlay from surfacing it.
const SUPPRESS_WALLET_ERROR = `(function(){
  function isWalletClash(m){return typeof m==='string'&&m.indexOf('Cannot redefine property: ethereum')!==-1;}
  window.addEventListener('error',function(e){if(e&&isWalletClash(e.message)){e.stopImmediatePropagation();e.preventDefault();}},true);
  window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;var m=r&&(r.message||r);if(isWalletClash(m)){e.stopImmediatePropagation();e.preventDefault();}},true);
})();`;

// Apply the saved theme before paint to avoid a flash.
const THEME_INIT = `(function(){try{if(localStorage.getItem('mnemos-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
      </head>
      <body className="min-h-full antialiased bg-[var(--paper)] text-[var(--ink)]">
        <script dangerouslySetInnerHTML={{ __html: SUPPRESS_WALLET_ERROR }} />
        {children}
      </body>
    </html>
  );
}
