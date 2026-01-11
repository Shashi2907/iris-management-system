"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [role, setRole] = useState('');
  const [stats, setStats] = useState({
    reg: 0,
    attend: 0,
    onCampus: 0,
    outCampus: 0,
    d1: 0,
    d2: 0,
    d3: 0
  });
  const [rooms, setRooms] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
      window.location.replace('/');
      return;
    }
    setRole(userRole);
    fetchStats(userRole);
    setIsMounted(true);
  }, []);

  async function fetchStats(userRole: string) {
    try {
      if (userRole === 'h&p') {
        // 1. Fetch Total Registered
        const { count: reg } = await supabase
          .from('handp_data')
          .select('*', { count: 'exact', head: true });

        // 2. Fetch Total Attending (Status marked as Attending)
        const { count: attend } = await supabase
          .from('handp_data')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Attending');

        // 3. Fetch Total On Campus
        const { count: onCampus } = await supabase
          .from('handp_data')
          .select('*', { count: 'exact', head: true })
          .eq('on_campus', true);
        
        setStats(prev => ({ 
          ...prev,
          reg: reg || 0, 
          attend: attend || 0, 
          onCampus: onCampus || 0, 
          outCampus: (attend || 0) - (onCampus || 0) 
        }));

        // 4. Fetch Accommodations
        const { data: roomData } = await supabase
          .from('accommodations')
          .select('*')
          .order('name', { ascending: true });
        
        if (roomData) setRooms(roomData);

      } else {
        // Proshows Logic
        const { count: d1 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day1_status', 'Attending');
        const { count: d2 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day2_status', 'Attending');
        const { count: d3 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day3_status', 'Attending');
        setStats(prev => ({ ...prev, d1: d1 || 0, d2: d2 || 0, d3: d3 || 0 }));
      }
    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
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
        <div className="space-y-10">
          {/* 4 CARDS GRID - EXACTLY AS REQUESTED */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Registered" val={stats.reg} color="bg-blue-600" />
            <StatCard label="Attending" val={stats.attend} color="bg-emerald-500" />
            <StatCard label="On Campus" val={stats.onCampus} color="bg-orange-500" />
            <StatCard label="Outside" val={stats.outCampus} color="bg-rose-500" />
          </div>

          {/* Accommodation Status Section */}
          <div>
            <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              🏨 Accommodation Status
            </h2>
            <div className="grid gap-3">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{room.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Beds Available</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${room.available_beds > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {room.available_beds} 
                      <span className="text-sm text-gray-300 font-medium ml-1">/ {room.total_beds}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Proshows View */
        <div className="space-y-6">
          <p className="font-bold text-gray-400 text-sm">PROSHOW ATTENDANCE</p>
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
  <div className={`${color} p-6 rounded-3xl text-white shadow-lg shadow-gray-100`}>
    <p className="text-[10px] opacity-80 uppercase font-black tracking-wider mb-1">{label}</p>
    <p className="text-4xl font-black">{val}</p>
  </div>
);

const ProshowColumn = ({ day, attending }: any) => (
  <div className="bg-gray-50 p-6 rounded-3xl min-w-[220px] border border-gray-100">
    <h3 className="font-black text-gray-800 text-lg mb-4 border-b border-gray-200 pb-2">{day}</h3>
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 font-bold uppercase">Checked-In</p>
      <p className="text-4xl font-black text-blue-600">{attending}</p>
    </div>
  </div>
);