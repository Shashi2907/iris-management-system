"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [role, setRole] = useState('');

  useEffect(() => {
    const r = localStorage.getItem('userRole') || '';
    setRole(r);
    fetchTeam(r);
  }, []);

  const fetchTeam = async (r: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('role', r).neq('level', 'VC');
    if (data) setTeam(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-6">Manage Team ({role})</h1>
      <div className="space-y-4">
        {team.map(member => (
          <div key={member.id} className="bg-white p-4 rounded-xl shadow border flex justify-between items-center">
            <div>
              <p className="font-bold">{member.email}</p>
              <p className="text-xs text-gray-400 font-bold uppercase">{member.level}</p>
            </div>
            <button className="text-red-500 font-bold text-sm">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}