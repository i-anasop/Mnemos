import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mnemos — AI memory that survives',
  description:
    'A persistent AI memory engine powered by Walrus — durable, verifiable memory for AI agents across sessions.',
  icons: {
    icon: '/brand/mnemos-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased bg-[#f6f5f1] text-[#0e0e0e]">
        {children}
      </body>
    </html>
  );
}
