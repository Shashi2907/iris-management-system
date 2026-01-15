"use client";
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import CryptoJS from 'crypto-js';

const QR_SECRET = process.env.NEXT_PUBLIC_QR_SECRET || 'your_fallback_secret_key';

export default function QRScan() {
  const [vertical, setVertical] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [manualId, setManualId] = useState('');
  const qrCodeInstance = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    setVertical(localStorage.getItem('userVertical') || '');
    qrCodeInstance.current = new Html5Qrcode("reader");
    fetchRooms();
    return () => { stopScanner(); };
  }, []);

  function verifyQR(scannedText: string, sigSecret: string) {
    if (!scannedText || typeof scannedText !== 'string') return { tamper: true, id: null };
    const lastDotIndex = scannedText.lastIndexOf('.');
    if (lastDotIndex === -1) return { tamper: true, id: null };
    const id = scannedText.substring(0, lastDotIndex);
    const receivedHash = scannedText.substring(lastDotIndex + 1);
    const expectedHash = CryptoJS.SHA256(id + "_" + sigSecret).toString(CryptoJS.enc.Base64);
    return { tamper: expectedHash !== receivedHash, id: expectedHash === receivedHash ? id : null };
  }

  const fetchRooms = async () => {
    const { data } = await supabase.from('accommodations').select('*').order('room');
    if (data) setRooms(data);
  };

  const processTicketId = async (ticketId: string) => {
    const v = vertical || localStorage.getItem('userVertical') || 'h&p';
    const table = v === 'h&p' ? 'handp' : 'proshows';
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', ticketId)
      .single();

    if (data) {
      setScanResult(data);
      setSelectedRoom(data.acco_id ? String(data.acco_id) : '');
      stopScanner();
    } else {
      alert("Ticket/ID not found!");
    }
  };

  const handleManualSubmit = async () => {
    const trimmedId = manualId.trim().toUpperCase();
    if (trimmedId.length !== 4) return alert("ID must be exactly 4 characters long");
    
    await processTicketId(trimmedId);
  };

  const startScanner = async () => {
    if (qrCodeInstance.current) {
      setIsScanning(true);
      await qrCodeInstance.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (text) => {
          const verification = verifyQR(text, QR_SECRET);
          if (verification.tamper) return alert("Security Alert: Invalid QR Code!");
          
          if (verification.id) {
            await processTicketId(verification.id);
          }
        },
        () => {}
      ).catch(() => setIsScanning(false));
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstance.current?.isScanning) {
      await qrCodeInstance.current.stop();
      setIsScanning(false);
    }
  };

  const updateStatus = async (updateObj: any) => {
    const table = vertical === 'h&p' ? 'handp' : 'proshows';
    const isMovement = updateObj.checkedin !== undefined;
    const isCheckingIn = updateObj.checkedin === true;

    if (isCheckingIn) {
      if (!selectedRoom) return alert("Please select a room!");
      updateObj.acco_id = selectedRoom;
    }

    const accoIDToAdjust = isCheckingIn ? selectedRoom : String(scanResult.acco_id || '');
    const { error } = await supabase.from(table).update(updateObj).eq('id', scanResult.id);
    
    if (error) {
      alert("Database Error: " + error.message);
    } else {
      if (isMovement && accoIDToAdjust && accoIDToAdjust !== 'null') {
        const adjustment = isCheckingIn ? -1 : 1;
        await supabase.rpc('adjust_bed_count', { _id: accoIDToAdjust, adj: adjustment });
      }
      setScanResult((prev: any) => ({ ...prev, ...updateObj }));
      if (isMovement || vertical === 'proshows') {
        alert("Operation Successful");
        setScanResult(null);
        setSelectedRoom('');
        setManualId('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-gray-800 mb-6 text-center">QR Verification</h1>

        {!scanResult ? (
          <>
          <div className="bg-gray-50 p-2 rounded-3xl border-2 border-dashed border-gray-200 min-h-[320px] flex flex-col justify-center relative shadow-inner">
            <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
            {!isScanning && (
              <button onClick={startScanner} className="absolute self-center bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                Open Scanner
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-gray-400 font-bold text-sm px-2">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <div className="w-full">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter ID Manually" 
                className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-gray-700 focus:border-blue-500 transition-colors"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
              <button 
                onClick={handleManualSubmit}
                className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
              >
                Verify
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2 font-medium">
              Check ticket for ID if scan fails
            </p>
          </div>
        </>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
            
            {/* CARD HEADER */}
            <div className="flex justify-between items-start border-b pb-4 mb-6">
              <div className="space-y-1 overflow-hidden pr-2">
                <h2 className="text-xl font-black text-gray-900 leading-tight truncate">{scanResult.name}</h2>
                
                {/* Team Name Display */}
                {scanResult.is_team && (
                  <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                    Team: {scanResult.team_name}
                  </p>
                )}
                
                <p className="text-xs text-gray-500 font-medium">{scanResult.email}</p>
                <p className="text-xs text-gray-500 font-medium">{scanResult.phone}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                  {scanResult.college} • Age: {scanResult.age}
                </p>
                
                <div className="pt-2 flex gap-2">
                   <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${scanResult.checkedin ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {scanResult.checkedin ? 'Inside' : 'Outside'}
                  </span>
                   <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${scanResult.sex === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                    {scanResult.sex}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-blue-600 font-black text-sm tracking-tighter">#{scanResult.id}</p>
              </div>
            </div>

            {/* ADDITIONAL DETAILS SECTION */}
            <div className="mb-6 px-1">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Events Subscribed</p>
               <p className="text-xs text-gray-700 leading-relaxed italic">
                 {scanResult.events_list || "No events registered"}
               </p>
            </div>

            <div className="space-y-4">
              {vertical === 'h&p' ? (
                <>
                  {scanResult.attending ? (
                    /* BUTTON LOGIC: 2 buttons for teams, 1 for individuals */
                    <div className={scanResult.is_team ? "grid grid-cols-2 gap-2" : "w-full"}>
                      <button 
                        onClick={() => updateStatus({ attending: true })} 
                        className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                      >
                        Mark Attendance
                      </button>
                      {scanResult.is_team && (
                        <button 
                          onClick={() => updateStatus({ attending: true })} 
                          className="w-full bg-indigo-700 text-white p-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                        >
                          Mark Team Attendance
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-center">
                          {scanResult.checkedin ? "Assigned Room" : "Assign Accommodation *"}
                        </label>
                        {!scanResult.checkedin ? (
                          <select className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold text-gray-700" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                            <option value="">-- Select Room --</option>
                            {rooms
                              .filter(r => r.available_beds > 0 && r.sex === scanResult.sex)
                              .map(room => (
                                <option key={room.id} value={room.id}>{room.room} ({room.available_beds} beds)</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full p-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl text-center font-bold">
                            {rooms.find(r => String(r.id) === String(scanResult.acco_id))?.room || "Assigned Room"}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {scanResult.checkedin ? (
                          <button onClick={() => updateStatus({ checkedin: false })} className="flex-1 bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg">Confirm Check-Out</button>
                        ) : (
                          <button disabled={!selectedRoom} onClick={() => updateStatus({ checkedin: true })} className={`flex-1 p-4 rounded-xl font-bold shadow-lg transition-all ${!selectedRoom ? 'bg-gray-200 text-gray-400' : 'bg-green-600 text-white'}`}>Confirm Check-In</button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* PROSHOWS VERTICAL */
                <button disabled={scanResult.day1_status === 'Attending'} onClick={() => updateStatus({ day1_status: 'Attending' })} className={`w-full p-4 rounded-2xl font-bold shadow-lg ${scanResult.day1_status === 'Attending' ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white'}`}>
                  {scanResult.day1_status === 'Attending' ? "Ticket Used" : "Confirm Entry"}
                </button>
              )}
              <button onClick={() => window.location.reload()} className="w-full text-gray-400 font-bold py-2 text-sm text-center hover:text-gray-600">Cancel & Scan Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}