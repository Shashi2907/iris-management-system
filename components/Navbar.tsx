"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, QrCode, Users, ShieldUser, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  
  // State to hold user info and mounting status
  const [role, setRole] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This runs only on the client side
    setRole(localStorage.getItem('userVertical'));
    setLevel(localStorage.getItem('userVertical'));
    setIsMounted(true);
  }, []);

  // 1. Don't show on login page
  // 2. Don't render until client-side mounting is complete to prevent Hydration Error
  if (pathname === '/' || !isMounted) return null;

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-4 md:relative md:w-64 md:h-screen md:flex-col md:border-r md:border-t-0 md:justify-start md:gap-4 z-50 shadow-lg md:shadow-none">
      <div className="hidden md:block p-4 font-black text-xl text-blue-600 tracking-tight">
        IRIS Management System
      </div>
      
      <Link 
        href="/dashboard" 
        className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded-xl transition-all ${pathname === '/dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <LayoutDashboard size={20} /> 
        <span className="text-[10px] md:text-base font-bold">Dashboard</span>
      </Link>

      <Link 
        href="/scan" 
        className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded-xl transition-all ${pathname === '/scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <QrCode size={20} /> 
        <span className="text-[10px] md:text-base font-bold">Scan</span>
      </Link>

      <Link 
        href="/manage" 
        className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded-xl transition-all ${pathname === '/manage' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <Users size={20} /> 
        <span className="text-[10px] md:text-base font-bold">
          {role === 'h&p' ? 'Participants' : 'Attendees'}
        </span>
      </Link>

      {level === 'VC' && (
        <Link 
          href="/team" 
          className={`flex flex-col items-center md:flex-row md:gap-3 p-2 rounded-xl transition-all ${pathname === '/team' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <ShieldUser size={20} /> 
          <span className="text-[10px] md:text-base font-bold">Team</span>
        </Link>
      )}

      
      {/* Responsive Logout button */}
  <button 
    onClick={handleLogout}
    className="flex flex-col items-center gap-3 p-2 mt-auto rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all w-full"
  >
      <LogOut size={20} />
      <span>Logout</span>
  </button>
</nav>
  );
}