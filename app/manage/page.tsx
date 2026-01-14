"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash, Edit3, Download } from 'lucide-react';

export default function Manage() {
  const [role, setRole] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // Stores unique IDs
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = localStorage.getItem('userRole') || '';
    setRole(r);
    fetchData(r);
  }, []);

  const getTableName = (r: string) => (r === 'h&p' ? 'handp_data' : 'proshows_data');

  const fetchData = async (r: string) => {
    setLoading(true);
    const table = getTableName(r);
    const { data: result, error } = await supabase.from(table).select('*');
    if (error) console.error("Error fetching data:", error);
    if (result) setData(result || []);
    setLoading(false);
  };

  const deleteRows = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selected.length} items?`)) return;
    const table = getTableName(role);
    const { error } = await supabase.from(table).delete().in('unstop_reg_id', selected);
    
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      setSelected([]);
      fetchData(role);
    }
  };

  const editRow = async (row: any) => {
    const table = getTableName(role);
    const newName = prompt("Edit Name:", row.name);
    
    if (newName !== null && newName !== row.name) {
      const { error } = await supabase
        .from(table)
        .update({ name: newName })
        .eq('unstop_reg_id', row.unstop_reg_id);

      if (error) {
        alert("Update failed: " + error.message);
      } else {
        fetchData(role);
      }
    }
  };

  // FIXED: Logic to toggle only the specific ID clicked
  const toggleSelectOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) 
        ? prev.filter((item) => item !== id) // Remove if already selected
        : [...prev, id]                      // Add if not selected
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(data.map((row) => row.unstop_reg_id));
    } else {
      setSelected([]);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Manage {role === 'h&p' ? 'Participants' : 'Attendees'}
          </h1>
          <p className="text-sm text-gray-500 font-mono uppercase">Source: {getTableName(role)}</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={deleteRows} 
            disabled={selected.length === 0} 
            className={`p-2 rounded-lg transition-all ${selected.length > 0 ? 'bg-red-500 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Trash size={20}/>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 transition-colors shadow-sm">
            <Download size={18}/> Import
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* STICKY CHECKBOX HEADER */}
                <th className="sticky left-0 z-30 bg-gray-50 p-4 w-12 border-r border-gray-100">
                  <input 
                    type="checkbox" 
                    onChange={toggleSelectAll}
                    checked={data.length > 0 && selected.length === data.length}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap">Reg ID</th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap">Name</th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap">Email</th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap">Phone</th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap">College</th>
                <th className="p-4 font-bold text-xs uppercase text-gray-400 whitespace-nowrap text-right sticky right-0 bg-gray-50 z-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr key="loading-row"><td colSpan={7} className="p-10 text-center text-gray-400 italic">Loading data...</td></tr>
              ) : data.length === 0 ? (
                <tr key="empty-row"><td colSpan={7} className="p-10 text-center text-gray-400 italic">No records found.</td></tr>
              ) : (
                data.map((row) => (
                  <tr key={row.unstop_reg_id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* STICKY CHECKBOX CELL */}
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/40 p-4 border-r border-gray-100 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                      <input 
                        type="checkbox" 
                        checked={selected.includes(row.unstop_reg_id)}
                        onChange={() => toggleSelectOne(row.unstop_reg_id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-500 whitespace-nowrap">{row.unstop_reg_id}</td>
                    <td className="p-4 font-medium text-gray-900 whitespace-nowrap">{row.name}</td>
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{row.email}</td>
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{row.phone}</td>
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{row.college}</td>
                    <td className="p-4 text-right sticky right-0 bg-white group-hover:bg-blue-50/40 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                      <button 
                        onClick={() => editRow(row)} 
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100/50 transition-all"
                      >
                        <Edit3 size={18}/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}