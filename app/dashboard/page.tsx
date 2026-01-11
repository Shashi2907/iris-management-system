"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [role, setRole] = useState('');
  const [vertical, setVertical] = useState('');
  const [level, setLevel] = useState('');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const init = async () => {
      let currentRole = '';
      let currentVertical = '';
      let currentLevel = '';
      try {
        const userResp: any = await (supabase as any).auth?.getUser?.();
        const user = userResp?.data?.user;
        if (user?.id) {
          const { data: profile } = await supabase.from('profiles').select('role,level,vertical').eq('id', user.id).maybeSingle();
          if (profile) {
            currentRole = profile.role || '';
            currentVertical = profile.vertical || '';
            currentLevel = profile.level || '';
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      if (!currentRole) {
        currentRole = localStorage.getItem('userRole') || '';
        currentVertical = localStorage.getItem('userVertical') || '';
        currentLevel = localStorage.getItem('userLevel') || '';
      }

      setRole((currentRole || '').toLowerCase());
      setVertical(currentVertical);
      setLevel((currentLevel || '').toLowerCase());
      fetchStats(currentRole, currentVertical);
    };

    init();
  }, []);

  async function fetchStats(userRole: string, v: string) {
    if (userRole === 'h&p') {
      const { count: reg } = await supabase.from('handp_data').select('*', { count: 'exact', head: true }).eq('vertical', v);
      const { count: attend } = await supabase.from('handp_data').select('*', { count: 'exact', head: true }).eq('status', 'Attending').eq('vertical', v);
      const { count: onCampus } = await supabase.from('handp_data').select('*', { count: 'exact', head: true }).eq('on_campus', true).eq('vertical', v);
      setStats({ reg, attend, onCampus, outCampus: (attend || 0) - (onCampus || 0) });
    } else {
      // Logic for Proshows (Day 1, 2, 3)
      const { count: d1 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day1_status', 'Attending').eq('vertical', v);
      const { count: d2 } = await supabase.from('proshows_data').select('*', { count: 'exact', head: true }).eq('day2_status', 'Attending').eq('vertical', v);
      setStats({ d1, d2, d3: 0 }); // Day 3 example
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome Back</h1>
      {role === 'h&p' ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Registered" val={stats.reg} color="bg-blue-500" />
          <StatCard label="Attending" val={stats.attend} color="bg-green-500" />
          <StatCard label="On Campus" val={stats.onCampus} color="bg-orange-500" />
          <StatCard label="Outside" val={stats.outCampus} color="bg-red-500" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <ProshowColumn day="Day 1" attending={stats.d1} />
          <ProshowColumn day="Day 2" attending={stats.d2} />
          <ProshowColumn day="Day 3" attending={stats.d3} />
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, val, color }: any) => (
  <div className={`${color} p-6 rounded-2xl text-white shadow-lg`}>
    <p className="text-sm opacity-80 uppercase font-bold">{label}</p>
    <p className="text-3xl font-black">{val || 0}</p>
  </div>
);

const ProshowColumn = ({ day, attending }: any) => (
  <div className="bg-white p-4 rounded-2xl min-w-[200px] shadow border">
    <h3 className="font-bold border-b pb-2 mb-4">{day}</h3>
    <p className="text-xs text-gray-500">Tickets Sold: 500</p>
    <p className="text-xl font-bold text-blue-600">Attending: {attending}</p>
  </div>
);