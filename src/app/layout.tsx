import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MP Control System - Pusat Kendali Komunikasi Komunitas MP',
  description: 'Platform pusat kendali otomatisasi komunikasi komunitas MP melalui LINE Bot. Daily Devotional & Birthday Automation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☕</text></svg>" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
