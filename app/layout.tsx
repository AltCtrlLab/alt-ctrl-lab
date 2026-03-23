import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NotificationProvider } from '@/providers/NotificationProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'Alt Ctrl Lab | Cockpit',
  description: 'Human-in-the-Loop Orchestration Dashboard',
  robots: { index: false, follow: false },
  icons: { icon: '/email/LogoHeader1.png', apple: '/email/LogoHeader1.png' },
  openGraph: {
    title: 'Alt Ctrl Lab | Cockpit',
    description: 'Human-in-the-Loop Orchestration Dashboard',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Alt Ctrl Lab',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('acl-dark')==='false')document.documentElement.classList.add('light');}catch(e){}` }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-fuchsia-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Aller au contenu principal
        </a>
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
