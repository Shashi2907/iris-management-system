"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [role, setRole] = useState('');
  const [vertical, setVertical] = useState('');
  const [level, setLevel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('st');
  const [newVertical, setNewVertical] = useState('');

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
        // ignore and fallback to localStorage
      }

      if (!currentRole) {
        currentRole = localStorage.getItem('userRole') || '';
        currentVertical = localStorage.getItem('userVertical') || '';
        currentLevel = localStorage.getItem('userLevel') || '';
      }

      setRole((currentRole || '').toLowerCase());
      setVertical(currentVertical);
      setLevel((currentLevel || '').toLowerCase());
      fetchTeam(currentRole, currentVertical, currentLevel);
    };

    init();
  }, []);

  const fetchTeam = async (r: string, v: string, lvl: string) => {
    // Only VCs should be able to fetch team members for their vertical
    if ((lvl || '').toLowerCase() !== 'vc') {
      setTeam([]);
      return;
    }
    // users table contains VC/ST/JT account details; filter by vertical and exclude VCs
    const { data } = await supabase.from('users').select('*').eq('vertical', v).neq('role', 'vc');
    if (data) setTeam(data as any[]);
  };

  const getRowId = (row: any) => row.id ?? row.user_id ?? row.email ?? JSON.stringify(row);

  const addMember = async () => {
    // open the inline form
    if (level !== 'vc') return alert('Access denied');
    setNewVertical(vertical || '');
    setShowAddForm(true);
  };

  const submitNewMember = async () => {
    if (level !== 'vc') return alert('Access denied');
    if (!newName.trim() || !newEmail.trim()) return alert('Name and Email required');
    const vToUse = newVertical || vertical;
    const { data: inserted, error } = await supabase.from('users').insert([{ name: newName.trim(), email: newEmail.trim(), role: newRole, vertical: vToUse }]).select();
    if (error) {
      // show error and return
      // eslint-disable-next-line no-console
      console.error('Insert error', error);
      return alert('Failed to add member');
    }

    // Optimistically update list with inserted record(s)
    if (inserted && inserted.length > 0) {
      setTeam(prev => [...inserted as any[], ...prev]);
    }

    // Also add to `profiles` table so credentials and level are recorded.
    try {
      const profileLevel = (newRole || '').toUpperCase();
      // Upsert into profiles on email to avoid duplicates / merge updates
      const { data: profileUpserted, error: profileErr } = await supabase
        .from('profiles')
        .upsert([{ email: newEmail.trim(), level: profileLevel, vertical: vToUse }], { onConflict: 'email' });
      if (profileErr) {
        // eslint-disable-next-line no-console
        console.error('Failed to upsert profile', profileErr);
      } else {
        // eslint-disable-next-line no-console
        console.log('Profile upserted', profileUpserted);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Profiles upsert exception', e);
    }

    // reset form
    setNewName('');
    setNewEmail('');
    setNewRole('st');
    setNewVertical('');
    setShowAddForm(false);

    // refresh from server to ensure consistency
    fetchTeam(role, vertical, level);
  };

  const editMember = async (member: any) => {
    if (level !== 'vc') return alert('Access denied');
    const name = prompt('Name', member.name) || member.name;
    const email = prompt('Email', member.email) || member.email;
    const r = prompt('Role', member.role) || member.role;
    const key = member.id ?? member.user_id ?? member.email;
    if (!key) return alert('Cannot determine identifier to update');
    await supabase.from('users').update({ name, email, role: r }).or(`id.eq.${key},user_id.eq.${key},email.eq.${key}`);
    fetchTeam(role, vertical, level);
  };

  const removeMember = async (member: any) => {
    if (level !== 'vc') return alert('Access denied');
    const key = member.id ?? member.user_id ?? member.email;
    if (!key) return alert('Cannot determine identifier to delete');
    // Try common keys
    const keys = ['id', 'user_id', 'email'];
    for (const k of keys) {
      try {
        await supabase.from('users').delete().in(k, [member[k] ?? key]);
      } catch (e) {
        // ignore
      }
    }
    fetchTeam(role, vertical, level);
  };
  return (
    <div className="p-6">
      {level !== 'vc' ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="font-bold text-black">Access restricted</p>
          <p className="text-sm text-black">This page is only accessible to Vertical Coordinators (VCs).</p>
        </div>

      ) : (

        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black">Manage Team ({vertical || '—'})</h1>
            <div className="flex gap-2">
              <button onClick={addMember} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Add Member</button>
            </div>
          </div>
          {showAddForm && (
            <div className="bg-yellow-50 text-black p-4 rounded-xl shadow border border-black mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="p-2 border rounded" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
                <input value={newVertical} onChange={(e) => setNewVertical(e.target.value)} placeholder="Vertical" className="p-2 border rounded" />
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="p-2 border rounded">
                  <option value="st">ST</option>
                  <option value="jt">JT</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={submitNewMember} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                <button onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); setNewRole('st'); }} className="bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {team.map(member => {
              const id = getRowId(member);
              return (
                <div key={id} className="bg-white p-4 rounded-xl shadow border border-black flex justify-between items-center">
                  <div>
                    <p className="font-bold">{member.name || member.email}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">{member.role}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editMember(member)} className="text-blue-600 font-bold">Edit</button>
                    <button onClick={() => removeMember(member)} className="text-red-500 font-bold">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}