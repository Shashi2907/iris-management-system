"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLevel, setNewLevel] = useState('st');
  const [memberPasswords, setMemberPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      let currentRole = '';
      let currentLevel = '';
      let userId = '';
      try {
        const userResp: any = await (supabase as any).auth?.getUser?.();
        const user = userResp?.data?.user;
        if (user?.id) {
          userId = user.id;
          const { data: profile } = await supabase.from('profiles').select('role,level').eq('id', user.id).maybeSingle();
          if (profile) {
            currentRole = profile.role || '';
            currentLevel = profile.level || '';
          }
        }
      } catch (e) {
        // ignore and fallback to localStorage
      }

      if (!currentRole) {
        currentRole = localStorage.getItem('userRole') || '';
        currentLevel = localStorage.getItem('userLevel') || '';
      }

      setCurrentUserId(userId);
      setRole((currentRole || '').toLowerCase());
      setLevel((currentLevel || '').toLowerCase());
      fetchTeam(currentRole, currentLevel, userId);
    };

    init();
  }, []);

  const fetchTeam = async (r: string, lvl: string, userId: string = '') => {
    // Only VCs should be able to fetch team members for their role
    if ((lvl || '').toLowerCase() !== 'vc') {
      setTeam([]);
      return;
    }
    // profiles table contains level (VC/ST/JT) and role (h&p, proshows); filter by role and exclude VCs and current user
    const { data } = await supabase.from('profiles').select('*').eq('role', r).neq('level', 'vc').neq('id', userId);
    if (data) {
      setTeam(data as any[]);
      // Load passwords from database
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

  const generatePassword = (firstName: string): string => {
    // Generate password: firstName + timestamp (e.g., "John1705158932")
    return `${firstName}${Date.now()}`;
  };

  const addMember = async () => {
    // open the inline form
    if (level !== 'vc') return alert('Access denied');
    setShowAddForm(true);
  };

  const submitNewMember = async () => {
    if (level !== 'vc') return alert('Access denied');
    if (!newName.trim() || !newEmail.trim()) return alert('Name and Email required');
    
    const roleToUse = role;
    const levelToUse = (newLevel || level).toUpperCase();
    const firstName = newName.trim().split(' ')[0];
    const generatedPassword = generatePassword(firstName);

    try {
      // Step 1: Try to create auth user via API (no confirmation email)
      let authData = null;
      let userId = null;

      const authResponse = await fetch('/api/create-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: generatedPassword,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        const errorMsg = errorData.error || 'Unknown error';
        
        // If email already exists, delete it first and retry
        if (errorMsg.includes('already been registered')) {
          // eslint-disable-next-line no-console
          console.log('Email already exists, attempting to delete and recreate...');
          
          // Try to get the user ID and delete
          const deleteResponse = await fetch('/api/delete-team-member-by-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: newEmail.trim(),
            }),
          });

          if (deleteResponse.ok) {
            // Retry creating the user
            const retryResponse = await fetch('/api/create-team-member', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: newEmail.trim(),
                password: generatedPassword,
              }),
            });

            if (!retryResponse.ok) {
              const retryError = await retryResponse.json();
              return alert('Failed to create auth user: ' + retryError.error);
            }

            authData = await retryResponse.json();
            userId = authData?.user?.id;
          } else {
            return alert('Failed to create auth user: ' + errorMsg);
          }
        } else {
          return alert('Failed to create auth user: ' + errorMsg);
        }
      } else {
        authData = await authResponse.json();
        userId = authData?.user?.id;
      }

      if (!userId) {
        return alert('Failed to get user ID from auth');
      }

      // Step 2: Insert into profiles table with the UUID from auth
      const { data: inserted, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            name: newName.trim(),
            email: newEmail.trim(),
            role: roleToUse,
            level: levelToUse,
            pass: generatedPassword,
          },
        ])
        .select();

      if (profileError) {
        // eslint-disable-next-line no-console
        console.error('Profile insert error', profileError);
        return alert('Failed to add member to profiles: ' + profileError.message);
      }

      // Track the password for this member (keyed by email)
      setMemberPasswords(prev => ({
        ...prev,
        [newEmail.trim()]: generatedPassword,
      }));

      // Optimistically update list with inserted record(s)
      if (inserted && inserted.length > 0) {
        setTeam(prev => [...inserted as any[], ...prev]);
      }

      // reset form
      setNewName('');
      setNewEmail('');
      setNewLevel('st');
      setShowAddForm(false);

      // refresh from server to ensure consistency
      fetchTeam(role, level, currentUserId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Exception adding member', e);
      return alert('Error adding member: ' + (e as any).message);
    }
  };

  const editMember = async (member: any) => {
    if (level !== 'vc') return alert('Access denied');
    const name = prompt('Name', member.name) || member.name;
    const email = prompt('Email', member.email) || member.email;
    const r = prompt('Role', member.role) || member.role;
    const key = member.id ?? member.user_id ?? member.email;
    if (!key) return alert('Cannot determine identifier to update');
    await supabase.from('profiles').update({ name, email, role: r }).or(`id.eq.${key},user_id.eq.${key},email.eq.${key}`);
    fetchTeam(role, level, currentUserId);
  };

  const removeMember = async (member: any) => {
    if (level !== 'vc') return alert('Access denied');
    const key = member.id ?? member.user_id ?? member.email;
    if (!key) return alert('Cannot determine identifier to delete');

    try {
      // Step 1: Delete from auth using the user ID
      if (member.id) {
        const deleteAuthResponse = await fetch('/api/delete-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.id,
          }),
        });

        if (!deleteAuthResponse.ok) {
          const errorData = await deleteAuthResponse.json();
          // eslint-disable-next-line no-console
          console.error('Failed to delete auth user:', errorData.error);
          // Continue to delete from profiles even if auth delete fails
        }
      }

      // Step 2: Delete from profiles table
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', member.id ?? key);

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Profile delete error', error);
        return alert('Failed to delete member: ' + error.message);
      }

      // Remove from password tracking
      setMemberPasswords(prev => {
        const updated = { ...prev };
        delete updated[member.email];
        return updated;
      });

      fetchTeam(role, level, currentUserId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Exception removing member', e);
      return alert('Error removing member: ' + (e as any).message);
    }
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
            <h1 className="text-2xl font-black">Manage Team ({role || '—'})</h1>
            <div className="flex gap-2">
              <button onClick={addMember} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Add Member</button>
            </div>
          </div>
          {showAddForm && (
            <div className="bg-yellow-50 text-black p-4 rounded-xl shadow border border-black mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="p-2 border rounded" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
                <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="p-2 border rounded">
                  <option value="st">ST</option>
                  <option value="jt">JT</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={submitNewMember} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Save</button>
                <button onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); setRole('st'); }} className="bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {team.map(member => {
              const id = getRowId(member);
              const password = memberPasswords[member.email];
              const copyPassword = async () => {
                if (password) {
                  await navigator.clipboard.writeText(password);
                  alert('Password copied to clipboard!');
                }
              };
              return (
                <div key={id} className="bg-white p-4 rounded-xl shadow border border-black flex justify-between items-center">
                  <div>
                    <p className="font-bold">{member.name || member.email}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">{member.role}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    {password && (
                      <div className="text-xs text-green-600 font-mono mt-2 bg-green-50 p-2 rounded flex justify-between items-center gap-2">
                        <span><strong>Password:</strong> {password}</span>
                        <button onClick={copyPassword} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-700">
                          Copy
                        </button>
                      </div>
                    )}
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