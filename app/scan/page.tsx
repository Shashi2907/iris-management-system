"use client";
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

export default function QRScan() {
  const [role, setRole] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const qrCodeInstance = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || '');
    qrCodeInstance.current = new Html5Qrcode("reader");
    fetchRooms();
    return () => { stopScanner(); };
  }, []);

  const fetchRooms = async () => {
    const { data } = await supabase.from('accommodations').select('*').order('name');
    if (data) setRooms(data);
  };

  const startScanner = async () => {
    if (qrCodeInstance.current) {
      await qrCodeInstance.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (text) => {
          const table = localStorage.getItem('userRole') === 'h&p' ? 'handp_data' : 'proshows_data';
          const { data } = await supabase.from(table).select('*').eq('reg_id', text).single();
          if (data) {
            setScanResult(data);
            setSelectedRoom(data.assigned_room_id ? String(data.assigned_room_id) : '');
            stopScanner();
          } else {
            alert("Ticket not found!");
          }
        },
        () => {}
      );
      setIsScanning(true);
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstance.current?.isScanning) {
      await qrCodeInstance.current.stop();
      setIsScanning(false);
    }
  };

  const updateStatus = async (updateObj: any) => {
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    
    // 1. Movement Logic
    const isMovement = updateObj.on_campus !== undefined;
    const isCheckingIn = updateObj.on_campus === true;
    const isCheckingOut = updateObj.on_campus === false;

    // 2. CRITICAL FIX: Ensure assigned_room_id is saved to the participant's record
    if (isCheckingIn) {
      if (!selectedRoom) return alert("Please select a room!");
      updateObj.assigned_room_id = selectedRoom;
    }

    // 3. Determine Room ID for Bed Adjustment (RPC)
    // If checking in: use selectedRoom. If checking out: use what's already in the DB record.
    const roomIdToAdjust = isCheckingIn ? selectedRoom : String(scanResult.assigned_room_id || '');

    // 4. Perform the Update in the participant table (handp_data)
    const { error } = await supabase.from(table).update(updateObj).eq('reg_id', scanResult.reg_id);
    
    if (error) {
      alert("Database Error: " + error.message);
    } else {
      // 5. Adjust Bed Count in Accommodations table via RPC
      if (isMovement && roomIdToAdjust && roomIdToAdjust !== '') {
        const adjustment = isCheckingIn ? -1 : 1;
        
        const { error: rpcError } = await supabase.rpc('adjust_bed_count', { 
          room_id_input: roomIdToAdjust, 
          adj: adjustment 
        });

        if (rpcError) console.error("Inventory adjustment failed:", rpcError);
      }

      // INSTANT UI UPDATE
      setScanResult((prev: any) => ({ ...prev, ...updateObj }));

      // Alert and Refresh for final actions
      if (isMovement || role === 'proshows') {
        alert(isCheckingIn ? "Checked In Successfully" : "Checked Out Successfully");
        window.location.reload(); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-gray-800 mb-6 text-center">QR Verification</h1>

        {!scanResult ? (
          <div className="bg-gray-50 p-2 rounded-3xl border-2 border-dashed border-gray-200 min-h-[320px] flex flex-col justify-center relative shadow-inner">
            <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
            {!isScanning && (
              <button onClick={startScanner} className="absolute self-center bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                Open Scanner
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="border-b pb-4 mb-6 text-center">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{scanResult.name}</h2>
              <p className="text-blue-600 font-mono text-sm font-bold tracking-tight">{scanResult.reg_id}</p>
              <div className="mt-2 flex justify-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${scanResult.on_campus ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {scanResult.on_campus ? 'Currently Inside' : 'Currently Outside'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {role === 'h&p' ? (
                <>
                  {scanResult.status !== 'Attending' ? (
                    <button 
                      onClick={() => updateStatus({ status: 'Attending' })} 
                      className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg"
                    >
                      {scanResult.is_team ? "Mark Team Attendance" : "Mark Attendance"}
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-center">
                          {scanResult.on_campus ? "Assigned Room" : "Assign Accommodation *"}
                        </label>
                        
                        {!scanResult.on_campus ? (
                          <select 
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-gray-700"
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                          >
                            <option value="">-- Select Room --</option>
                            {rooms.filter(r => r.available_beds > 0).map(room => (
                              <option key={room.id} value={room.id}>{room.name} ({room.available_beds} beds)</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full p-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl text-center font-bold">
                            {rooms.find(r => String(r.id) === String(scanResult.assigned_room_id))?.name || "Assigned Room"}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {scanResult.on_campus ? (
                          <button 
                            onClick={() => updateStatus({ on_campus: false })} 
                            className="flex-1 bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95"
                          >
                            Confirm Check-Out
                          </button>
                        ) : (
                          <button 
                            disabled={!selectedRoom}
                            onClick={() => updateStatus({ on_campus: true })} 
                            className={`flex-1 p-4 rounded-xl font-bold shadow-lg transition-all ${!selectedRoom ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white active:scale-95'}`}
                          >
                            Confirm Check-In
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button 
                  disabled={scanResult.day1_status === 'Attending'}
                  onClick={() => updateStatus({ day1_status: 'Attending' })}
                  className={`w-full p-4 rounded-2xl font-bold shadow-lg ${scanResult.day1_status === 'Attending' ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white'}`}
                >
                  {scanResult.day1_status === 'Attending' ? "Ticket Used" : "Confirm Entry"}
                </button>
              )}
              <button 
                onClick={() => window.location.reload()} 
                className="w-full text-gray-400 font-bold py-2 text-sm text-center hover:text-gray-600"
              >
                Cancel & Scan Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}