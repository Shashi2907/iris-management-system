"use client";
import { useEffect, useState } from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [vertical, setVertical] = useState(''); // Formerly role
  const [role, setRole] = useState(''); // Formerly level
  const [currentUserId, setCurrentUserId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  const [memberPasswords, setMemberPasswords] = useState<Record<string, string>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    const init = async () => {
      let currentVertical = '';
      let currentRole = '';
      let userId = '';
      try {
        const userResp: any = await (supabase as any).auth?.getUser?.();
        const user = userResp?.data?.user;
        if (user?.id) {
          userId = user.id;
          // Updated select to use vertical and role
          const { data: profile } = await supabase.from('profiles').select('vertical,role').eq('id', user.id).maybeSingle();
          if (profile) {
            currentVertical = profile.vertical || '';
            currentRole = profile.role || '';
          }
        }
      } catch (e) { /* fallback */ }

      if (!currentVertical) {
        currentVertical = localStorage.getItem('userVertical') || '';
        currentRole = localStorage.getItem('userVertical') || '';
      }

      setCurrentUserId(userId);
      setVertical((currentVertical || '').toLowerCase());
      setRole((currentRole || '').toLowerCase());
      fetchTeam(currentVertical, currentRole, userId);
    };
    init();
  }, []);

  const fetchTeam = async (v: string, r: string, userId: string = '') => {
    // Only VCs (role) should be able to fetch team members for their vertical
    if ((r || '').toLowerCase() !== 'vc') {
      setTeam([]);
      return;
    }
    
    // Filter profiles by vertical and exclude other VCs/self
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('vertical', v)
      .neq('role', 'vc')
      .neq('id', userId);

    if (data) {
      setTeam(data as any[]);
      const passwordMap: Record<string, string> = {};
      data.forEach((member: any) => {
        if (member.email && member.pass) {
          passwordMap[member.email] = member.pass;
        }
      });
      setMemberPasswords(passwordMap);
    }
  };

  const getRowId = (row: any) => row.id ?? row.user_id ?? row.email ?? JSON.stringify(row);
  const generatePassword = (firstName: string): string => `${firstName}${Date.now()}`;

  const addMember = async () => {
    if (role !== 'vc') return alert('Access denied');
    setShowAddForm(true);
  };

  const submitNewMember = async () => {
    if (role !== 'vc') return alert('Access denied');
    if (!newName.trim() || !newEmail.trim()) return alert('Name and Email required');
    
    const verticalToUse = vertical;
    const roleToUse = 'MEMBER'; // Automatically set role to MEMBER
    const firstName = newName.trim().split(' ')[0];
    const generatedPassword = generatePassword(firstName);

    try {
      let authData = null;
      let userId = null;

      const authResponse = await fetch('/api/create-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), password: generatedPassword }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        const errorMsg = errorData.error || 'Unknown error';
        
        if (errorMsg.includes('already been registered')) {
          const deleteResponse = await fetch('/api/delete-team-member-by-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newEmail.trim() }),
          });

          if (deleteResponse.ok) {
            const retryResponse = await fetch('/api/create-team-member', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: newEmail.trim(), password: generatedPassword }),
            });
            if (!retryResponse.ok) return alert('Failed to create user');
            authData = await retryResponse.json();
            userId = authData?.user?.id;
          } else {
            return alert('Failed: ' + errorMsg);
          }
        } else {
          return alert('Failed: ' + errorMsg);
        }
      } else {
        authData = await authResponse.json();
        userId = authData?.user?.id;
      }

      const { data: inserted, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            name: newName.trim(),
            email: newEmail.trim(),
            vertical: verticalToUse,
            role: roleToUse, 
            pass: generatedPassword,
          },
        ])
        .select();

      if (profileError) return alert('Profile error: ' + profileError.message);

      setMemberPasswords(prev => ({ ...prev, [newEmail.trim()]: generatedPassword }));
      if (inserted) setTeam(prev => [...inserted as any[], ...prev]);

      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      fetchTeam(vertical, role, currentUserId);
    } catch (e) {
      alert('Error adding member');
    }
  };

  const editMember = (member: any) => {
    if (role !== 'vc') return alert('Access denied');
    setEditingMemberId(getRowId(member));
    setEditName(member.name);
    setEditEmail(member.email);
  };

  const submitEdit = async (member: any) => {
    if (role !== 'vc') return alert('Access denied');
    try {
      await supabase.from('profiles').update({ 
        name: editName, 
        email: editEmail 
      }).eq('id', member.id);
      
      setEditingMemberId(null);
      fetchTeam(vertical, role, currentUserId);
    } catch (e) {
      alert('Error editing member');
    }
  };

  const removeMember = async (member: any) => {
    if (role !== 'vc') return alert('Access denied');
    try {
      if (member.id) {
        await fetch('/api/delete-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: member.id }),
        });
      }
      await supabase.from('profiles').delete().eq('id', member.id);
      fetchTeam(vertical, role, currentUserId);
    } catch (e) {
      alert('Error removing member');
    }
  };

  return (
    <div className="p-6">
      {role !== 'vc' ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-black">
          <p className="font-bold">Access restricted</p>
          <p className="text-sm">This page is only accessible to Vertical Coordinators (VCs).</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black">Manage Team ({vertical || '—'})</h1>
            <button onClick={addMember} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Add Member</button>
          </div>

          {showAddForm && (
            <div className="bg-yellow-50 text-black p-4 rounded-xl shadow border border-black mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="p-2 border rounded" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={submitNewMember} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                <button onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); }} className="bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {team.map(member => {
              const id = getRowId(member);
              const password = memberPasswords[member.email];
              const isEditing = editingMemberId === id;
              
              if (isEditing) {
                return (
                  <div key={id} className="bg-yellow-50 text-black p-4 rounded-xl shadow border border-black">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="p-2 border rounded" />
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => submitEdit(member)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                      <button onClick={() => setEditingMemberId(null)} className="bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={id} className="bg-white p-4 rounded-xl shadow border border-black flex justify-between items-center">
                  <div>
                    <p className="font-bold">{member.name || member.email}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">{member.role} • {member.vertical}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    {password && (
                      <div className="text-xs text-green-600 font-mono mt-2 bg-green-50 p-2 rounded flex justify-between items-center gap-2">
                        <span><strong>Password:</strong> {password}</span>
                        <button onClick={() => navigator.clipboard.writeText(password)} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-700">Copy</button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => editMember(member)} className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition duration-200 shadow-md">
                      <FiEdit size={22} />
                    </button>
                    <button onClick={() => removeMember(member)} className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition duration-200 shadow-md">
                      <FiTrash2 size={22} />
                    </button>
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