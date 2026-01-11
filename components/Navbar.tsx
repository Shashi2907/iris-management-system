"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, QrCode, Users, ShieldUser, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : '';
  const level = typeof window !== 'undefined' ? localStorage.getItem('userLevel') : '';

  if (pathname === '/') return null; // Don't show on Login page

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-4 md:relative md:w-64 md:h-screen md:flex-col md:border-r md:border-t-0 md:justify-start md:gap-4">
      <div className="hidden md:block p-4 font-bold text-xl text-blue-600">Fest Panel</div>
      <Link href="/dashboard" className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-500'}`}>
        <LayoutDashboard /> <span className="text-xs md:text-base">Dashboard</span>
      </Link>
      <Link href="/scan" className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded ${pathname === '/scan' ? 'text-blue-600' : 'text-gray-500'}`}>
        <QrCode /> <span className="text-xs md:text-base">Scan</span>
      </Link>
      <Link href="/manage" className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded ${pathname === '/manage' ? 'text-blue-600' : 'text-gray-500'}`}>
        <Users /> <span className="text-xs md:text-base">{role === 'h&p' ? 'Participants' : 'Attendees'}</span>
      </Link>
      {level === 'VC' && (
        <Link href="/team" className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded ${pathname === '/team' ? 'text-blue-600' : 'text-gray-500'}`}>
          <ShieldUser /> <span className="text-xs md:text-base">Team</span>
        </Link>
      )}
    </nav>
  );
}