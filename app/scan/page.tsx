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
      // Initialize attending flag if not set (for new users)
      const processedData = {
        ...data,
        attending: data.attending ?? false
      };
      setScanResult(processedData);
      // If already has acco_id use it, else if is_acco is false set NO_ACCO, otherwise empty for room selection
      setSelectedRoom(data.acco_id ? String(data.acco_id) : (data.is_acco === false ? 'NO_ACCO' : ''));
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

  const updateStatus = async (updateObj: any, skipBedAdjustment: boolean = false) => {
    const table = vertical === 'h&p' ? 'handp' : 'proshows';
    const isMovement = updateObj.checkedin !== undefined;
    const isCheckingIn = updateObj.checkedin === true;
    const hasExistingRoom = scanResult.acco_id && scanResult.acco_id !== 'null';
    const noAccoSelected = selectedRoom === 'NO_ACCO';

    if (isCheckingIn) {
      if (!hasExistingRoom) {
        // New check-in, assign a room
        if (!selectedRoom) return alert("Please select a room!");
        updateObj.acco_id = noAccoSelected ? null : selectedRoom;
      }
      // If user already has a room, don't change it - just mark as checked in
    }

    const accoIDToAdjust = isCheckingIn ? (hasExistingRoom || noAccoSelected ? null : selectedRoom) : String(scanResult.acco_id || '');
    const { error } = await supabase.from(table).update(updateObj).eq('id', scanResult.id);
    
    if (error) {
      alert("Database Error: " + error.message);
    } else {
      if (!skipBedAdjustment && isMovement && accoIDToAdjust && accoIDToAdjust !== 'null') {
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

  const handleFestSignoff = async () => {
    if (!confirm("Are you sure you want to sign off this person from the fest? This will vacate their room.")) {
      return;
    }

    const table = vertical === 'h&p' ? 'handp' : 'proshows';
    const accoIDToVacate = String(scanResult.acco_id || '');

    // Update the user to mark checkout and clear acco_id
    const { error } = await supabase
      .from(table)
      .update({ checkedin: false, acco_id: null })
      .eq('id', scanResult.id);

    if (error) {
      alert("Database Error: " + error.message);
    } else {
      // Vacate the room by increasing bed count
      if (accoIDToVacate && accoIDToVacate !== 'null') {
        await supabase.rpc('adjust_bed_count', { _id: accoIDToVacate, adj: 1 });
      }
      alert("Fest Signoff Successful - Room vacated");
      setScanResult(null);
      setSelectedRoom('');
      setManualId('');
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
              <button onClick={startScanner} className="absolute self-center bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all cursor-pointer">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualSubmit();
                  }
                }}
              />
              <button 
                onClick={handleManualSubmit}
                className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
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
          <div className="relative overflow-hidden rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
            
            {/* Gradient Background Header */}
            <div className="relative p-5 pb-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              {/* ID Badge & Status */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  <p className="text-white font-black text-lg tracking-wider">#{scanResult.id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border ${scanResult.checkedin ? 'bg-emerald-400/20 text-white border-emerald-300/50' : 'bg-white/10 text-white/80 border-white/20'}`}>
                  {scanResult.checkedin ? '✓ Inside Venue' : 'Outside'}
                </span>
              </div>

              {/* Team Badge */}
              {scanResult.is_team && (
                <div className="flex gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-white border border-amber-300/50 backdrop-blur-sm">
                    👥 Team
                  </span>
                </div>
              )}

              {/* Name & Basic Info */}
              <div className="space-y-2 pr-32">
                <h2 className="text-xl font-black text-white leading-tight drop-shadow-lg">{scanResult.name}</h2>
                {scanResult.is_team && (
                  <p className="text-xs font-bold text-white/90">
                    🏆 {scanResult.team_name}
                  </p>
                )}
                {/* Age and Sex Pills */}
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                    <p className="text-xs text-white font-bold">{scanResult.age} yrs</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                    <p className="text-xs text-white font-bold">{scanResult.sex}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Card Body */}
            <div className="bg-white p-4 -mt-6 rounded-t-3xl relative">
              
              {/* Contact Info Cards */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2 rounded-2xl border border-slate-200/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-xs text-slate-700 font-semibold truncate">{scanResult.email}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2 rounded-2xl border border-slate-200/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-xs text-slate-700 font-semibold">{scanResult.phone}</p>
                </div>
              </div>

              {/* College */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-2 rounded-2xl mb-3 border border-purple-100/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  <p className="text-xs text-slate-700 font-semibold line-clamp-2">{scanResult.college}</p>
                </div>
              </div>

              {/* Events Section */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm"></span>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Events Subscribed</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-2xl border border-amber-200/50">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {scanResult.events_list || "No events registered"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {vertical === 'h&p' ? (
                  <>
                    {!scanResult.attending ? (
                      <div className={scanResult.is_team ? "grid grid-cols-2 gap-3" : "w-full"}>
                        <button 
                          onClick={() => updateStatus({ attending: true })} 
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/40"
                        >
                          ✓ Mark Attendance
                        </button>
                        {scanResult.is_team && (
                          <button 
                            onClick={() => updateStatus({ attending: true })} 
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-500/40"
                          >
                            Mark Team Attendance
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">
                            {scanResult.checkedin ? "🏨 Assigned Room" : "🏨 Assign Accommodation *"}
                          </label>
                          {!scanResult.checkedin ? (
                            scanResult.acco_id && scanResult.acco_id !== 'null' ? (
                              <div className="w-full p-4 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-center font-bold">
                                🔑 {rooms.find(r => String(r.id) === String(scanResult.acco_id))?.room || "Assigned Room"} (Existing)
                              </div>
                            ) : (
                              <select className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-indigo-400 transition-colors" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                                <option value="">-- Select Room --</option>
                                <option value="NO_ACCO">🚫 No Accommodation</option>
                                {rooms
                                  .filter(r => r.available_beds > 0 && r.sex === scanResult.sex)
                                  .map(room => (
                                    <option key={room.id} value={room.id}>{room.room} ({room.available_beds} beds)</option>
                                ))}
                              </select>
                            )
                          ) : (
                            <div className={`w-full p-4 rounded-2xl text-center font-bold ${
                              !scanResult.acco_id || scanResult.acco_id === 'null' 
                                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200' 
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {!scanResult.acco_id || scanResult.acco_id === 'null' 
                                ? '🚫 No Accommodation' 
                                : `🔑 ${rooms.find(r => String(r.id) === String(scanResult.acco_id))?.room || "Assigned Room"}`
                              }
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          {scanResult.checkedin ? (
                            <button onClick={() => updateStatus({ checkedin: false }, true)} className="flex-1 bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 rounded-2xl font-bold shadow-lg shadow-slate-500/30 cursor-pointer active:scale-[0.98] transition-all hover:shadow-xl">
                              ↩ Confirm Check-Out
                            </button>
                          ) : (
                            <button disabled={!selectedRoom} onClick={() => updateStatus({ checkedin: true })} className={`flex-1 p-4 rounded-2xl font-bold shadow-lg transition-all ${!selectedRoom ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-green-500/30 cursor-pointer active:scale-[0.98] hover:shadow-xl hover:shadow-green-500/40'}`}>
                              ✓ Confirm Check-In
                            </button>
                          )}
                        </div>
                        {scanResult.checkedin && (
                          <button 
                            onClick={handleFestSignoff} 
                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-red-500/30 cursor-pointer active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-red-500/40"
                          >
                            Fest Signoff (Vacate Room)
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <button disabled={scanResult.day1_status === 'Attending'} onClick={() => updateStatus({ day1_status: 'Attending' })} className={`w-full p-4 rounded-2xl font-bold shadow-lg transition-all ${scanResult.day1_status === 'Attending' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-purple-500/30 cursor-pointer active:scale-[0.98] hover:shadow-xl hover:shadow-purple-500/40'}`}>
                    {scanResult.day1_status === 'Attending' ? "✓ Ticket Used" : "🎫 Confirm Entry"}
                  </button>
                )}
                
                {/* Cancel Button */}
                <button onClick={() => window.location.reload()} className="w-full text-slate-400 font-bold py-3 text-sm text-center hover:text-slate-600 cursor-pointer transition-colors">
                  ✕ Cancel & Scan Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}