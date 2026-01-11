"use client";
import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

export default function QRScan() {
  const [role, setRole] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || '');
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    scanner.render(async (id) => {
      const table = localStorage.getItem('userRole') === 'h&p' ? 'handp_data' : 'proshows_data';
      const { data } = await supabase.from(table).select('*').eq('reg_id', id).single();
      if (data) setScanResult(data);
      scanner.pause(true);
    }, () => {});
    return () => { scanner.clear().catch(() => {}) };
  }, []);

  const updateStatus = async (field: string, value: any) => {
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    await supabase.from(table).update({ [field]: value }).eq('reg_id', scanResult.reg_id);
    alert("Updated Successfully");
    setScanResult(null);
    window.location.reload();
  };

  return (
    <div className="p-6 flex flex-col items-center">
      {!scanResult ? (
        <div id="reader" className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl"></div>
      ) : (
        <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border">
          <h2 className="text-2xl font-black mb-1">{scanResult.name}</h2>
          <p className="text-gray-500 mb-6 font-mono text-sm">{scanResult.reg_id}</p>
          
          <div className="space-y-3">
            {role === 'h&p' ? (
              <>
                <button onClick={() => updateStatus('status', 'Attending')} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold">Mark Attendance</button>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus('on_campus', true)} className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold text-sm">Check-In</button>
                  <button onClick={() => updateStatus('on_campus', false)} className="flex-1 bg-gray-800 text-white p-4 rounded-xl font-bold text-sm">Check-Out</button>
                </div>
              </>
            ) : (
              <button onClick={() => updateStatus('day1_status', 'Attending')} className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold">Mark Proshow Attendance</button>
            )}
            <button onClick={() => setScanResult(null)} className="w-full text-gray-400 font-medium py-2">Scan Next</button>
          </div>
        </div>
      )}
    </div>
  );
}