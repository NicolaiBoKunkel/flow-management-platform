import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AuthNav from './components/AuthNav';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Flow Management Platform',
  description: 'Create, edit and run dynamic decision flows',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 text-black">
        <div className="min-h-screen flex flex-col">
          <AuthNav />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}