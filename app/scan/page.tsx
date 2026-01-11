"use client";
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

export default function QRScan() {
  const [role, setRole] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrCodeInstance = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || '');
    qrCodeInstance.current = new Html5Qrcode("reader", {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    try {
      if (qrCodeInstance.current) {
        await qrCodeInstance.current.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {} 
        );
        setIsScanning(true);
      }
    } catch (err: any) {
      setError("Camera error. Ensure you are on HTTPS.");
    }
  };

  const stopScanner = async () => {
    try {
      if (qrCodeInstance.current && qrCodeInstance.current.isScanning) {
        await qrCodeInstance.current.stop();
        setIsScanning(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleScanSuccess = async (id: string) => {
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    const { data } = await supabase.from(table).select('*').eq('reg_id', id).single();
    
    if (data) {
      setScanResult(data);
      stopScanner(); 
    } else {
      alert("Ticket not found!");
    }
  };

  const updateStatus = async (updateObj: any) => {
    const table = role === 'h&p' ? 'handp_data' : 'proshows_data';
    const { error } = await supabase.from(table).update(updateObj).eq('reg_id', scanResult.reg_id);
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      // INSTANT UI UPDATE
      const updatedData = { ...scanResult, ...updateObj };
      setScanResult(updatedData);

      // Only alert and reload on final Check-In/Out action
      if (updateObj.on_campus !== undefined || role === 'proshows') {
        alert(updateObj.on_campus ? "Checked In Successfully" : "Checked Out Successfully");
        window.location.reload(); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-gray-800 mb-6 text-center">QR Verification</h1>

        {!scanResult && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-2 rounded-3xl border-2 border-dashed border-gray-200 min-h-[320px] flex flex-col justify-center overflow-hidden relative shadow-inner">
              <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-50/90 backdrop-blur-sm rounded-3xl">
                  <button onClick={startScanner} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                    Open Scanner
                  </button>
                  {error && <p className="mt-4 text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {scanResult && (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="border-b pb-4 mb-6 text-center">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{scanResult.name}</h2>
              <p className="text-blue-600 font-mono text-sm font-bold tracking-tight">{scanResult.reg_id}</p>
              <div className="flex justify-center gap-2 mt-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${scanResult.on_campus ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {scanResult.on_campus ? 'Currently Inside' : 'Currently Outside'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {role === 'h&p' ? (
                <>
                  {scanResult.status !== 'Attending' ? (
                    <button onClick={() => updateStatus({ status: 'Attending' })} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform">
                      {scanResult.is_team ? "Mark Team Attendance" : "Mark Attendance"}
                    </button>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-300">
                      {/* TOGGLE LOGIC: Show only one button based on current status */}
                      {scanResult.on_campus ? (
                        <button 
                          onClick={() => updateStatus({ on_campus: false })} 
                          className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-red-100 active:scale-95 transition-all"
                        >
                          Confirm Check-Out
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateStatus({ on_campus: true })} 
                          className="w-full bg-green-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-green-100 active:scale-95 transition-all"
                        >
                          Confirm Check-In
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <button 
                  disabled={scanResult.day1_status === 'Attending'}
                  onClick={() => updateStatus({ day1_status: 'Attending' })}
                  className={`w-full p-4 rounded-2xl font-bold shadow-lg transition-all ${scanResult.day1_status === 'Attending' ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-purple-600 text-white shadow-purple-100'}`}
                >
                  {scanResult.day1_status === 'Attending' ? "Ticket Already Used" : "Confirm Proshow Entry"}
                </button>
              )}
              <button onClick={() => window.location.reload()} className="w-full text-gray-400 font-bold py-2 text-sm hover:text-gray-600 transition-colors">
                Cancel & Scan Next
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-12 text-[10px] text-gray-300 font-black uppercase tracking-widest text-center">
        {isScanning ? "Scanner Active" : "Scanner Ready"}
      </p>
    </div>
  );
}