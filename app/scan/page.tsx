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
    fetchAvailableRooms();
    return () => { stopScanner(); };
  }, []);

  const fetchAvailableRooms = async () => {
    const { data } = await supabase.from('accommodations').select('*').gt('available_beds', 0);
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
            setSelectedRoom(data.assigned_room_id || ''); // Pre-select if already assigned
            stopScanner();
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

  const handleCheckInOut = async (isCheckIn: boolean) => {
    if (role === 'h&p' && !selectedRoom) return alert("Please select accommodation!");

    const updateObj: any = { on_campus: isCheckIn };
    if (isCheckIn) updateObj.assigned_room_id = selectedRoom;

    // 1. Update Participant
    const { error } = await supabase.from('handp_data').update(updateObj).eq('reg_id', scanResult.reg_id);

    if (!error) {
      // 2. Adjust Bed Count in Accommodations table
      const adjustment = isCheckIn ? -1 : 1;
      const roomId = isCheckIn ? selectedRoom : scanResult.assigned_room_id;
      
      if (roomId) {
        await supabase.rpc('adjust_bed_count', { room_id_input: roomId, adj: adjustment });
      }

      alert(isCheckIn ? "Checked In Successfully" : "Checked Out Successfully");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-gray-800 mb-6 text-center">QR Verification</h1>

        {!scanResult ? (
          <div className="bg-gray-50 p-2 rounded-3xl border-2 border-dashed border-gray-200 min-h-[300px] flex flex-col justify-center relative">
            <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
            {!isScanning && (
              <button onClick={startScanner} className="absolute self-center bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl">
                Open Scanner
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100">
            {/* Participant Details */}
            <div className="border-b pb-4 mb-4">
              <h2 className="text-2xl font-black">{scanResult.name}</h2>
              <p className="text-blue-600 font-mono text-sm">{scanResult.reg_id}</p>
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-gray-400 uppercase">
                <p>Phone: {scanResult.phone}</p>
                <p>Status: {scanResult.status}</p>
              </div>
            </div>

            {/* H&P Accommodation Logic */}
            {role === 'h&p' && (
              <div className="mb-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Assign Accommodation *
                </label>
                <select 
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ring-blue-100 transition-all font-bold text-gray-700"
                  value={selectedRoom}
                  disabled={scanResult.on_campus} // Lock room selection if already inside
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">-- Choose Room --</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name} ({room.available_beds} beds left)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {scanResult.status !== 'Attending' ? (
                <button 
                  onClick={() => supabase.from('handp_data').update({status:'Attending'}).eq('id', scanResult.id).then(()=>window.location.reload())} 
                  className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold"
                >
                  Mark Attendance
                </button>
              ) : (
                <div className="flex gap-3">
                  {scanResult.on_campus ? (
                    <button 
                      onClick={() => handleCheckInOut(false)} 
                      className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-bold shadow-lg"
                    >
                      Check-Out
                    </button>
                  ) : (
                    <button 
                      disabled={role === 'h&p' && !selectedRoom}
                      onClick={() => handleCheckInOut(true)} 
                      className={`flex-1 p-4 rounded-2xl font-bold shadow-lg ${
                        role === 'h&p' && !selectedRoom ? 'bg-gray-200 text-gray-400' : 'bg-green-600 text-white'
                      }`}
                    >
                      Check-In
                    </button>
                  )}
                </div>
              )}
              <button onClick={() => window.location.reload()} className="w-full text-gray-400 font-bold py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}