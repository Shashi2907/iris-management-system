"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert("Login failed: " + error.message);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    localStorage.setItem('userRole', profile.role);
    localStorage.setItem('userLevel', profile.level);
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 p-6">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <h1 className="text-3xl font-black text-blue-600 mb-2">IRIS QR Scanner</h1>
        <p className="text-gray-400 mb-8 text-sm font-medium">Enter your credentials to continue</p>
        <input type="email" placeholder="Email" className="w-full p-4 mb-4 border rounded-xl bg-gray-50" onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full p-4 mb-8 border rounded-xl bg-gray-50" onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all">Login</button>
      </form>
    </div>
  );
}