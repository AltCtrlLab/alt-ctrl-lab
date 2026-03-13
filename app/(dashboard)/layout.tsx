import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Alt Ctrl Lab',
  description: 'Cockpit IA simplifié',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-zinc-950 text-zinc-300 antialiased`}>
        {children}
      </body>
    </html>
  );
}
