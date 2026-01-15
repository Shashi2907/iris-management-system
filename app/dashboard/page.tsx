"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [vertical, setvertical] = useState('');
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
    const userVertical = localStorage.getItem('userVertical');
    if (!userVertical) {
      window.location.replace('/');
      return;
    }
    setvertical(userVertical);
    fetchStats(userVertical);
    setIsMounted(true);
  }, []);

  async function fetchStats(userVertical: string) {
    try {
      if (userVertical === 'h&p') {
        const { count: reg } = await supabase.from('handp').select('*', { count: 'exact', head: true });
        const { count: attend } = await supabase.from('handp').select('*', { count: 'exact', head: true }).eq('status', 'Attending');
        const { count: onCampus } = await supabase.from('handp').select('*', { count: 'exact', head: true }).eq('checkedin', true);
        
        setStats(prev => ({ 
          ...prev,
          reg: reg || 0, 
          attend: attend || 0, 
          onCampus: onCampus || 0, 
          outCampus: (attend || 0) - (onCampus || 0) 
        }));

        const { data: roomData } = await supabase.from('accommodations').select('*').order('name', { ascending: true });
        if (roomData) setRooms(roomData);

      } else {
        const { count: d1 } = await supabase.from('proshows').select('*', { count: 'exact', head: true }).eq('day1_status', 'Attending');
        const { count: d2 } = await supabase.from('proshows').select('*', { count: 'exact', head: true }).eq('day2_status', 'Attending');
        const { count: d3 } = await supabase.from('proshows').select('*', { count: 'exact', head: true }).eq('day3_status', 'Attending');
        setStats(prev => ({ ...prev, d1: d1 || 0, d2: d2 || 0, d3: d3 || 0 }));
      }
    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen">
      <div className="mb-8">
        <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">Overview</p>
        <h1 className="text-3xl font-black text-gray-900">IRIS Dashboard</h1>
      </div>

      {vertical === 'h&p' ? (
        <div className="space-y-12">
          {/* TOP STAT CARDS - 4 Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Registered" val={stats.reg} color="bg-blue-600" />
            <StatCard label="Attending" val={stats.attend} color="bg-emerald-500" />
            <StatCard label="On Campus" val={stats.onCampus} color="bg-orange-500" />
            <StatCard label="Outside" val={stats.outCampus} color="bg-rose-500" />
          </div>

          {/* ACCOMMODATION SECTION */}
          <div>
            <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              🏨 Accommodation Status
            </h2>
            
            {/* 
                MATCHING GRID: lg:grid-cols-4 makes these cards the same width 
                as the Registered/Attending cards on desktop.
            */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <div 
                key={room.id} 
                /* Reduced padding to p-3 and min-height to 100px */
                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all group min-h-[100px]"
              >
                <div className="mb-0.5">
                  {/* Kept font large (text-xl) but reduced margin/line-height */}
                  <p className="font-black text-gray-900 text-xl leading-none group-hover:text-blue-600 transition-colors">
                    {room.name}
                  </p>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Beds Available</p>
                </div>
                
                {/* Tightened border and padding */}
                <div className="flex items-baseline justify-between gap-1 border-t border-gray-50 pt-1">
                  {/* Kept font large (text-3xl) */}
                  <p className={`text-3xl font-black tracking-tighter leading-none ${room.available_beds > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {room.available_beds}
                  </p>
                  <p className="text-[18px] text-gray-400 font-bold whitespace-nowrap">
                    / {room.total_beds}
                  </p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      ) : (
        /* PROSHOWS VIEW */
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
  <div className={`${color} p-6 rounded-3xl text-white shadow-xl shadow-gray-50`}>
    <p className="text-[10px] opacity-80 uppercase font-black tracking-wider mb-1">{label}</p>
    <p className="text-4xl font-black">{val}</p>
  </div>
);

const ProshowColumn = ({ day, attending }: any) => (
  <div className="bg-gray-50 p-6 rounded-3xl min-w-[220px] border border-gray-100 shadow-sm">
    <h3 className="font-black text-gray-800 text-lg mb-4 border-b border-gray-200 pb-2">{day}</h3>
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 font-bold uppercase">Checked-In</p>
      <p className="text-4xl font-black text-blue-600">{attending}</p>
    </div>
  </div>
);