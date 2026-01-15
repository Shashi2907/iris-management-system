import { DM_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} flex flex-col md:flex-row bg-gray-50 text-gray-900`}>
        <ToastProvider>
          <Navbar />
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}