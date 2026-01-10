"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Dashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    setRole(userRole);

    // 1. Initialize the scanner
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: 250 }, 
      /* verbose= */ false
    );

    // 2. Start scanning
    scanner.render(
      async (id) => {
        // This callback can be async!
        const table = userRole === 'h&p' ? 'handp_data' : 'proshows_data';
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('reg_id', id)
          .single();

        if (data) {
          setScanResult(data);
          // Optional: Stop scanner after success to show details
          scanner.pause(true); 
        } else {
          alert("Invalid Ticket!");
        }
      },
      (error) => {
        // You can leave this empty or log minor scanning errors
      }
    );

    // 3. THE FIX: Synchronous cleanup function
    return () => {
      scanner.clear().catch((err) => {
        console.error("Failed to clear scanner:", err);
      });
    };
  }, []); // Run once on mount

  const markAttendance = async () => {
    if (!scanResult) return;
    
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    const updateData = role === 'h&p' ? { status: 'Attending' } : { day1_status: 'Attending' };

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('reg_id', scanResult.reg_id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Attendance Marked Successfully!");
      window.location.reload(); // Quick way to reset the scanner
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-blue-600">
        {role?.toUpperCase()} Dashboard
      </h1>

      <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden p-2">
        {!scanResult ? (
          <div id="reader"></div>
        ) : (
          <div className="p-6 text-center">
            <div className="mb-4">
              <span className="text-sm text-gray-500 uppercase font-bold tracking-widest">Participant Found</span>
              <h2 className="text-xl font-black text-gray-800">{scanResult.name}</h2>
              <p className="text-blue-500 font-mono">{scanResult.reg_id}</p>
            </div>
            
            <button 
              onClick={markAttendance}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg shadow-md transition-all mb-3"
            >
              Confirm Attendance
            </button>

            <button 
              onClick={() => setScanResult(null)}
              className="text-gray-400 text-sm font-medium hover:underline"
            >
              Cancel & Scan Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 w-full text-center">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-xs text-blue-400 font-bold uppercase">Status</p>
          <p className="text-lg font-bold text-blue-900">Active</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-400 font-bold uppercase">Mode</p>
          <p className="text-lg font-bold text-gray-700">Check-in</p>
        </div>
      </div>
    </div>
  );
}