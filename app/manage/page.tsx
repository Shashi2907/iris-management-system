"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash, Edit3, Download } from 'lucide-react';

export default function Manage() {
  const [role, setRole] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const r = localStorage.getItem('userRole') || '';
    setRole(r);
    fetchData(r);
  }, []);

  const fetchData = async (r: string) => {
    const table = r === 'h&p' ? 'handp_data' : 'proshows_data';
    const { data } = await supabase.from(table).select('*');
    if (data) setData(data);
  };

  const deleteRows = async () => {
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    await supabase.from(table).delete().in('reg_id', selected);
    setSelected([]);
    fetchData(role);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black">Manage {role === 'h&p' ? 'Participants' : 'Attendees'}</h1>
        <div className="flex gap-2">
          <button onClick={deleteRows} disabled={selected.length === 0} className={`p-2 rounded-lg ${selected.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Trash size={20}/></button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><Download size={18}/> Import</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4"></th>
              <th className="p-4 font-bold text-xs uppercase text-gray-400">ID</th>
              <th className="p-4 font-bold text-xs uppercase text-gray-400">Name</th>
              <th className="p-4 font-bold text-xs uppercase text-gray-400 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.reg_id} className="border-b last:border-0">
                <td className="p-4"><input type="checkbox" onChange={(e) => e.target.checked ? setSelected([...selected, row.reg_id]) : setSelected(selected.filter(i => i !== row.reg_id))} /></td>
                <td className="p-4 font-mono text-sm">{row.reg_id}</td>
                <td className="p-4 font-medium">{row.name}</td>
                <td className="p-4 text-right"><button className="text-blue-600"><Edit3 size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}