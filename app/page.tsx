"use client"
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    localStorage.setItem('userRole', profile.role);
    localStorage.setItem('userLevel', profile.level);
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col h-screen justify-center p-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-blue-700 mb-8">Fest Login</h1>
      <input className="border p-3 mb-4 rounded" type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input className="border p-3 mb-8 rounded" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin} className="bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg">Login</button>
    </div>
  );
}