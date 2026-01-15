"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash, Edit3, Save, X, CheckCircle, XCircle } from 'lucide-react';

export default function Manage() {
  const [role, setRole] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    const r = localStorage.getItem('userVertical') || '';
    setRole(r);
    fetchTableStructureAndData(r);
  }, []);

  const getTableName = (r: string) => (r === 'h&p' ? 'handp' : 'proshows');

  /**
   * Fetches data and dynamically extracts headers from the database records
   */
  const fetchTableStructureAndData = async (r: string) => {
    setLoading(true);
    const table = getTableName(r);
    
    const { data: result, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching data:", error);
    } else if (result && result.length > 0) {
      setData(result);
      // Filter out 'id' to handle it as a fixed sticky column
      // All other columns from Supabase will be dynamic
      const dynamicKeys = Object.keys(result[0]).filter(key => key !== 'id');
      setHeaders(dynamicKeys);
    } else {
      setData([]);
      setHeaders([]);
    }
    setLoading(false);
  };

  /**
   * Updates the row in Supabase using the current inline edit state
   */
  const saveRow = async (id: string) => {
    const table = getTableName(role);
    // Exclude 'id' from update payload
    const { id: _, ...updateData } = editFormData;

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      setEditingId(null);
      fetchTableStructureAndData(role);
    }
  };

  const startEditing = (row: any) => {
    setEditingId(row.id);
    setEditFormData({ ...row });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const deleteRows = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selected.length} items?`)) return;
    const table = getTableName(role);
    const { error } = await supabase.from(table).delete().in('id', selected);
    
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      setSelected([]);
      fetchTableStructureAndData(role);
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

  /**
   * Helper to render Boolean icons or Truncated strings
   */
  const DataCell = ({ val }: { val: any }) => {
    if (typeof val === 'boolean') {
      return val ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <XCircle size={16} className="text-gray-300 mx-auto" />;
    }
    return <span className="truncate block max-w-[180px]">{val ?? '-'}</span>;
  };

  return (
    <div className="p-6 bg-gray-50 h-screen flex flex-col overflow-hidden fixed inset-0 ml-64 w-[calc(100vw-16rem)]">
      
      {/* Static Header Section */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 capitalize">
            {role === 'h&p' ? 'Participants' : 'Attendees'} Records
          </h1>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest font-bold">
            Source: {getTableName(role)}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={deleteRows} 
            disabled={selected.length === 0} 
            className={`p-2 rounded-lg transition-all ${selected.length > 0 ? 'bg-red-500 text-white shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Trash size={20}/>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden mb-4">
        <div className="overflow-auto relative flex-grow w-full">
          <table className="w-full min-w-max text-left border-separate border-spacing-0">
            <thead className="bg-gray-50">
              <tr>
                {/* Fixed Sticky Checkbox Header */}
                <th className="sticky left-0 top-0 z-50 bg-gray-100 p-4 w-12 border-b border-r border-gray-200">
                  <input type="checkbox" onChange={toggleSelectAll} checked={data.length > 0 && selected.length === data.length} className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                </th>
                
                {/* Fixed Sticky ID Header */}
                <th className="sticky left-12 top-0 z-50 bg-gray-100 p-4 border-b border-r border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                  ID
                </th>

                {/* DYNAMIC HEADERS FROM DB */}
                {headers.map((header) => (
                  <th key={header} className="sticky top-0 z-40 bg-gray-50 p-4 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}

                {/* Fixed Sticky Actions Header */}
                <th className="sticky right-0 top-0 z-50 bg-gray-100 p-4 text-right border-b border-l border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="text-sm">
              {!loading && data.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className={`${isEditing ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'} transition-colors group`}>
                    
                    {/* Fixed Checkbox Column */}
                    <td className={`sticky left-0 z-30 ${isEditing ? 'bg-blue-50' : 'bg-white group-hover:bg-[#f8faff]'} p-4 border-r border-b border-gray-100`}>
                      <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelectOne(row.id)} className="w-4 h-4 rounded cursor-pointer" />
                    </td>

                    {/* Fixed ID Column */}
                    <td className={`sticky left-12 z-30 ${isEditing ? 'bg-blue-50' : 'bg-white group-hover:bg-[#f8faff]'} p-4 font-mono text-xs text-gray-400 border-r border-b border-gray-100`}>
                      {row.id}
                    </td>

                    {/* DYNAMIC DATA CELLS */}
                    {headers.map((key) => (
                      <td key={key} className="p-4 border-b border-gray-100 text-gray-600">
                        {isEditing ? (
                          <input 
                            value={editFormData[key] || ''} 
                            onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                            className="border border-blue-300 px-2 py-1 rounded w-full bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        ) : (
                          <DataCell val={row[key]} />
                        )}
                      </td>
                    ))}
                    
                    {/* Fixed Actions Column */}
                    <td className={`sticky right-0 z-30 ${isEditing ? 'bg-blue-50' : 'bg-white group-hover:bg-[#f8faff]'} p-4 text-right border-l border-b border-gray-100 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]`}>
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveRow(row.id)} className="text-green-600 hover:bg-green-100 p-2 rounded-full transition-all">
                            <Save size={18}/>
                          </button>
                          <button onClick={cancelEditing} className="text-red-600 hover:bg-red-100 p-2 rounded-full transition-all">
                            <X size={18}/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEditing(row)} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100/50 transition-all">
                          <Edit3 size={18}/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {loading && (
            <div className="p-20 text-center text-gray-400 italic animate-pulse">
              Syncing with Supabase table structure...
            </div>
          )}
          
          {!loading && data.length === 0 && (
            <div className="p-20 text-center text-gray-400 italic">
              No data found in this table.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}