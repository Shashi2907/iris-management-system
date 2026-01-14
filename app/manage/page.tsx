"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash, Edit3, Download, CheckCircle, XCircle } from 'lucide-react';

export default function Manage() {
  const [role, setRole] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
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
    const { error } = await supabase.from(table).delete().in('id', selected);
    
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
        .eq('id', row.id);

      if (error) {
        alert("Update failed: " + error.message);
      } else {
        fetchData(role);
      }
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(data.map((row) => row.id));
    } else {
      setSelected([]);
    }
  };

  const BooleanBadge = ({ val }: { val: boolean }) => (
    val ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <XCircle size={16} className="text-gray-300 mx-auto" />
  );

  return (
    // overflow-hidden on the parent is CRUCIAL to prevent the whole page from scrolling
    <div className="p-6 bg-gray-50 h-screen flex flex-col overflow-hidden">
      
      {/* Header section (Fixed) */}
      <div className="flex justify-between items-center mb-6 shrink-0">
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
            <Download size={18}/> Export Data
          </button>
        </div>
      </div>

      {/* Table Outer Wrapper (Fixed height, no vertical scroll here) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden">
        
        {/* The Scrollable Viewport (Enables both horizontal and vertical scrolling) */}
        <div className="overflow-auto relative flex-grow">
          
          {/* min-w-max forces the table to use its full width, triggering the scrollbar */}
          <table className="w-full min-w-max text-left border-separate border-spacing-0">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 sticky top-0 z-40">
              <tr>
                {/* STICKY TOP-LEFT CORNER */}
                <th className="sticky left-0 top-0 z-50 bg-gray-50 p-4 w-12 border-b border-r border-gray-200">
                  <input type="checkbox" onChange={toggleSelectAll} checked={data.length > 0 && selected.length === data.length} className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                </th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">ID</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Unstop Reg ID</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Name</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Email</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Phone</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Age</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Sex</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">College</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Events List</th>
                <th className="p-4 whitespace-nowrap text-center border-b border-gray-200">Is Team</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Team Name</th>
                <th className="p-4 whitespace-nowrap text-center border-b border-gray-200">Is Acco</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Acco</th>
                <th className="p-4 whitespace-nowrap text-center border-b border-gray-200">Acco 1</th>
                <th className="p-4 whitespace-nowrap text-center border-b border-gray-200">Acco 2</th>
                <th className="p-4 whitespace-nowrap text-center border-b border-gray-200">Acco 3</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Arrival</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Departure</th>
                <th className="p-4 whitespace-nowrap border-b border-gray-200">Amount Paid</th>
                {/* STICKY TOP-RIGHT CORNER */}
                <th className="p-4 text-right sticky right-0 top-0 z-50 bg-gray-50 border-b border-l border-gray-200">Actions</th>
              </tr>
            </thead>
            
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={21} className="p-10 text-center text-gray-400 italic">Loading data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={21} className="p-10 text-center text-gray-400 italic">No records found.</td></tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* STICKY LEFT COLUMN */}
                    <td className="sticky left-0 z-30 bg-white group-hover:bg-blue-50/40 p-4 border-r border-b border-gray-100">
                      <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelectOne(row.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-400 border-b border-gray-100">{row.id}</td>
                    <td className="p-4 font-mono text-gray-600 border-b border-gray-100">{row.unstop_reg_id}</td>
                    <td className="p-4 font-semibold text-gray-900 border-b border-gray-100">{row.name}</td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.email}</td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.phone}</td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.age}</td>
                    <td className="p-4 text-gray-600 uppercase border-b border-gray-100">{row.sex}</td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.college}</td>
                    <td className="p-4 text-xs text-blue-600 italic max-w-[150px] truncate border-b border-gray-100">{JSON.stringify(row.evens_list)}</td>
                    <td className="p-4 text-center border-b border-gray-100"><BooleanBadge val={row.is_team} /></td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.team_name || '-'}</td>
                    <td className="p-4 text-center border-b border-gray-100"><BooleanBadge val={row.is_acco} /></td>
                    <td className="p-4 text-gray-600 border-b border-gray-100">{row.acco || '-'}</td>
                    <td className="p-4 text-center border-b border-gray-100"><BooleanBadge val={row.acco1} /></td>
                    <td className="p-4 text-center border-b border-gray-100"><BooleanBadge val={row.acco2} /></td>
                    <td className="p-4 text-center border-b border-gray-100"><BooleanBadge val={row.acco3} /></td>
                    <td className="p-4 text-xs text-gray-500 border-b border-gray-100">{row.dt_arrival ? new Date(row.dt_arrival).toLocaleString() : '-'}</td>
                    <td className="p-4 text-xs text-gray-500 border-b border-gray-100">{row.dt_departure ? new Date(row.dt_departure).toLocaleString() : '-'}</td>
                    <td className="p-4 font-bold text-green-700 border-b border-gray-100">₹{row.amount_paid}</td>
                    
                    {/* STICKY RIGHT COLUMN (Shadow added for clarity during scroll) */}
                    <td className="p-4 text-right sticky right-0 z-30 bg-white group-hover:bg-blue-50/40 border-l border-b border-gray-100 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                      <button onClick={() => editRow(row)} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100/50 transition-all">
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