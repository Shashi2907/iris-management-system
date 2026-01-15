"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) return alert("Please fill in all fields");
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (pError || !profile) throw new Error("Profile not found");

      // Save credentials
      localStorage.setItem('userRole', profile.role);
      localStorage.setItem('userVertical', profile.vertical);

      // MOBILE STABILITY: Use replace to prevent the '?' loop
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 800);

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-white p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm">
        <h1 className="text-3xl font-black text-blue-600 mb-2 tracking-tighter text-center">IRIS SYSTEM</h1>
        <p className="text-gray-400 mb-8 text-sm font-medium text-center">IRIS Management Portal</p>
        
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-2 ring-blue-100 text-black" 
            value={email}
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-2 ring-blue-100 text-black" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
          />
          
          <button 
            type="button" // CHANGED: Prevents the '?' form submission
            onClick={handleLogin}
            disabled={loading}
            className={`w-full p-4 rounded-2xl font-bold text-lg shadow-lg transition-all ${
              loading ? 'bg-gray-300' : 'bg-blue-600 text-white active:scale-95'
            }`}
          >
            {loading ? 'Processing...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}