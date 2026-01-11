"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [role, setRole] = useState('');
  const [stats, setStats] = useState<any>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // MOBILE FIX: Wait 300ms before checking localStorage to ensure 
    // the write operation from the login page finished.
    const checkAuth = setTimeout(() => {
      const userRole = localStorage.getItem('userRole');
      
      if (!userRole) {
        window.location.replace('/');
      } else {
        setRole(userRole);
        fetchStats(userRole);
        setIsMounted(true);
      }
    }, 300);

    return () => clearTimeout(checkAuth);
  }, []);

  async function fetchStats(userRole: string) {
    try {
      if (userRole === 'h&p') {
        const { count: reg } = await supabase.from('handp_data').select('*', { count: 'exact', head: true });
        const { count: attend } = await supabase.from('handp_data').select('*', { count: 'exact', head: true }).eq('status', 'Attending');
        const { count: onCampus } = await supabase.from('handp_data').select('*', { count: 'exact', head: true }).eq('on_campus', true);
        
        setStats({ 
          reg: reg || 0, 
          attend: attend || 0, 
          onCampus: onCampus || 0, 
          outCampus: (attend || 0) - (onCampus || 0) 
        });
      } else {
        const { count: d1 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day1_status', 'Attending');
        const { count: d2 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day2_status', 'Attending');
        const { count: d3 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day3_status', 'Attending');
        setStats({ d1: d1 || 0, d2: d2 || 0, d3: d3 || 0 });
      }
    } catch (e) {
      console.error("Stats fetch error", e);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-8">
        <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">Overview</p>
        <h1 className="text-3xl font-black text-gray-900">IRIS Dashboard</h1>
      </div>

      {role === 'h&p' ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Registered" val={stats.reg} color="bg-blue-600" />
          <StatCard label="Attending" val={stats.attend} color="bg-emerald-500" />
          <StatCard label="On Campus" val={stats.onCampus} color="bg-orange-500" />
          <StatCard label="Outside" val={stats.outCampus} color="bg-rose-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <p className="font-bold text-gray-400 text-sm">PROSHOWS STATS</p>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            <ProshowColumn day="Day 1" attending={stats.d1} />
            <ProshowColumn day="Day 2" attending={stats.d2} />
            <ProshowColumn day="Day 3" attending={stats.d3} />
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, val, color }: any) => (
  <div className={`${color} p-6 rounded-3xl text-white shadow-lg`}>
    <p className="text-[10px] opacity-80 uppercase font-black tracking-wider mb-1">{label}</p>
    <p className="text-3xl font-black">{val || 0}</p>
  </div>
);

const ProshowColumn = ({ day, attending }: any) => (
  <div className="bg-gray-50 p-6 rounded-3xl min-w-[200px] border border-gray-100 shadow-sm">
    <h3 className="font-black text-gray-800 text-lg mb-4 border-b border-gray-200 pb-2">{day}</h3>
    <p className="text-[10px] text-gray-400 font-bold uppercase">Checked-In</p>
    <p className="text-4xl font-black text-blue-600">{attending || 0}</p>
  </div>
);