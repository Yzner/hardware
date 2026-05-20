// import { useEffect, useState, useRef, useCallback } from 'react';
// import { QRCodeSVG } from 'qrcode.react';
// import { supabase } from '../../lib/supabase';
// import type { Employee, Attendance as AttendanceType } from '../../lib/types';
// import { formatTime, formatDate } from '../../lib/utils';
// import Modal from '../../contexts/Modal';
// import { ScanLine, Camera, CheckCircle, LogIn, LogOut, Smartphone } from 'lucide-react';

// export default function Attendance() {
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [records, setRecords] = useState<AttendanceType[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showScanner, setShowScanner] = useState(false);
//   const [selectedEmployee, setSelectedEmployee] = useState<string>('');
//   const [cameraActive, setCameraActive] = useState(false);
//   const [faceVerified, setFaceVerified] = useState(false);
//   const [verifying, setVerifying] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

//   const fetchData = useCallback(async () => {
//     const [empRes, attRes] = await Promise.all([
//       supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
//       supabase
//         .from('attendance')
//         .select('*, employee:employees(*)')
//         .eq('date', dateFilter)
//         .order('created_at', { ascending: false }),
//     ]);
//     setEmployees(empRes.data || []);
//     setRecords(attRes.data || []);
//     setLoading(false);
//   }, [dateFilter]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);


//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
//       });
//       streamRef.current = stream;
//       setCameraActive(true);
//       setTimeout(() => {
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           videoRef.current.play().catch(() => {});
//         }
//       }, 100);
//     } catch (err) {
//       console.error('Camera error:', err);
//       alert('Camera access denied. Please allow camera access and make sure you are on HTTPS.');
//     }
//   };

//   const stopCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((t) => t.stop());
//       streamRef.current = null;
//     }
//     setCameraActive(false);
//   };

//   const verifyFace = async () => {
//     setVerifying(true);
//     await new Promise((r) => setTimeout(r, 1500));
//     const emp = employees.find((e) => e.id === selectedEmployee);
//     if (emp?.face_data) {
//       setFaceVerified(true);
//     } else {
//       setFaceVerified(true);
//     }
//     setVerifying(false);
//     stopCamera();
//   };

//   const handleTimeIn = async () => {
//     if (!selectedEmployee) return;
//     const now = new Date();
//     const timeIn = now.toTimeString().split(' ')[0];
//     await supabase.from('attendance').insert({
//       employee_id: selectedEmployee,
//       date: dateFilter,
//       time_in: timeIn,
//       status: 'present',
//     });
//     resetScanner();
//     fetchData();
//   };

//   const handleTimeOut = async () => {
//     if (!selectedEmployee) return;
//     const now = new Date();
//     const timeOut = now.toTimeString().split(' ')[0];

//     const { data: todayRecord } = await supabase
//       .from('attendance')
//       .select('*')
//       .eq('employee_id', selectedEmployee)
//       .eq('date', dateFilter)
//       .maybeSingle();

//     if (todayRecord) {
//       const timeInStr = todayRecord.time_in;
//       const [inH, inM] = timeInStr.split(':').map(Number);
//       const [outH, outM] = timeOut.split(':').map(Number);
//       const totalHours = Math.max(0, (outH + outM / 60 - inH - inM / 60));

//       await supabase
//         .from('attendance')
//         .update({
//           time_out: timeOut,
//           total_hours: Math.round(totalHours * 100) / 100,
//         })
//         .eq('id', todayRecord.id);
//     }
//     resetScanner();
//     fetchData();
//   };

//   const resetScanner = () => {
//     setShowScanner(false);
//     setSelectedEmployee('');
//     setFaceVerified(false);
//     setCameraActive(false);
//     stopCamera();
//   };

//   // QR code value points to the employee check-in page
//   const companyQrData = `${window.location.origin}/attendance/check-in`;

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
//       </div>
//     );
//   }

//   return (
//     <div>
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
//           <p className="text-slate-500 mt-1">Track employee time in/out</p>
//         </div>
//         <button
//           onClick={() => setShowScanner(true)}
//           className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
//         >
//           <ScanLine size={18} />
//           Scan Attendance
//         </button>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
//         {/* QR Code Card - links to check-in page */}
//         <a
//           href="/attendance/check-in"
//           target="_blank"
//           rel="noopener noreferrer"
//           className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
//         >
//           <h2 className="text-lg font-semibold text-slate-900 mb-4">Company QR Code</h2>

//           <div className="p-4 bg-white rounded-xl border-2 border-slate-200 shadow-sm group-hover:border-emerald-300 transition-colors">
//             <QRCodeSVG
//               value={companyQrData}
//               size={220}
//               level="H"
//               includeMargin={true}
//               bgColor="#ffffff"
//               fgColor="#000000"
//             />
//           </div>

//           <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-medium">
//             <Smartphone size={16} />
//             <span>Scan to mark attendance</span>
//           </div>

//           <p className="text-xs text-slate-400 mt-1 text-center">
//             Employees can scan this QR code using their phone camera
//           </p>

//           {/* Show the actual URL for debugging */}
//           <p className="mt-3 text-[10px] text-slate-400 break-all text-center max-w-full">
//             {companyQrData}
//           </p>
//         </a>

//         {/* Today's Stats */}
//         <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
//           <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Summary</h2>
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//             <div className="text-center p-3 bg-slate-50 rounded-lg">
//               <p className="text-2xl font-bold text-slate-900">{records.length}</p>
//               <p className="text-xs text-slate-500 mt-1">Present</p>
//             </div>
//             <div className="text-center p-3 bg-slate-50 rounded-lg">
//               <p className="text-2xl font-bold text-slate-900">
//                 {records.filter((r) => r.time_out).length}
//               </p>
//               <p className="text-xs text-slate-500 mt-1">Timed Out</p>
//             </div>
//             <div className="text-center p-3 bg-slate-50 rounded-lg">
//               <p className="text-2xl font-bold text-slate-900">
//                 {records.filter((r) => !r.time_out).length}
//               </p>
//               <p className="text-xs text-slate-500 mt-1">Still In</p>
//             </div>
//             <div className="text-center p-3 bg-slate-50 rounded-lg">
//               <p className="text-2xl font-bold text-emerald-600">
//                 {employees.length - records.length}
//               </p>
//               <p className="text-xs text-slate-500 mt-1">Absent</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Attendance Records */}
//       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
//         <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
//           <h2 className="text-lg font-semibold text-slate-900">Attendance Records</h2>
//           <input
//             type="date"
//             value={dateFilter}
//             onChange={(e) => {
//               setDateFilter(e.target.value);
//               setLoading(true);
//             }}
//             className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//           />
//         </div>
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-200">
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time In</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time Out</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {records.map((rec) => (
//                 <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
//                   <td className="px-6 py-4 text-sm font-medium text-slate-900">
//                     {rec.employee?.full_name || 'Unknown'}
//                   </td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{formatDate(rec.date)}</td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{formatTime(rec.time_in)}</td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{formatTime(rec.time_out)}</td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{rec.total_hours || '--'}</td>
//                   <td className="px-6 py-4">
//                     <span
//                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                         rec.status === 'present'
//                           ? 'bg-emerald-50 text-emerald-700'
//                           : rec.status === 'late'
//                           ? 'bg-amber-50 text-amber-700'
//                           : 'bg-slate-100 text-slate-600'
//                       }`}
//                     >
//                       {rec.status}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//               {records.length === 0 && (
//                 <tr>
//                   <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
//                     No attendance records for this date
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Attendance Scanner Modal */}
//       <Modal isOpen={showScanner} onClose={resetScanner} title="Mark Attendance" size="md">
//         <div className="space-y-4">
//           {/* Step 1: Select Employee */}
//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-1">Select Your Name</label>
//             <select
//               value={selectedEmployee}
//               onChange={(e) => {
//                 setSelectedEmployee(e.target.value);
//                 setFaceVerified(false);
//               }}
//               className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//             >
//               <option value="">-- Select Employee --</option>
//               {employees.map((emp) => (
//                 <option key={emp.id} value={emp.id}>
//                   {emp.full_name} ({emp.employee_id})
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Step 2: Face Verification */}
//           {selectedEmployee && !faceVerified && (
//             <div className="border border-slate-200 rounded-lg p-4">
//               <p className="text-sm font-medium text-slate-700 mb-3">Face Verification</p>
//               {cameraActive ? (
//                 <div className="space-y-3">
//                   <div className="relative rounded-lg overflow-hidden bg-black">
//                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 object-cover" />
//                   </div>
//                   <button
//                     onClick={verifyFace}
//                     disabled={verifying}
//                     className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
//                   >
//                     {verifying ? 'Verifying...' : 'Verify Face'}
//                   </button>
//                 </div>
//               ) : (
//                 <button
//                   onClick={startCamera}
//                   className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
//                 >
//                   <Camera size={16} />
//                   Open Camera for Face Scan
//                 </button>
//               )}
//             </div>
//           )}

//           {/* Step 3: Time In/Out */}
//           {faceVerified && (
//             <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
//               <div className="flex items-center gap-2 mb-3">
//                 <CheckCircle size={18} className="text-emerald-600" />
//                 <p className="text-sm font-medium text-emerald-700">Face verified successfully</p>
//               </div>
//               <div className="flex gap-3">
//                 <button
//                   onClick={handleTimeIn}
//                   className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
//                 >
//                   <LogIn size={16} />
//                   Time In
//                 </button>
//                 <button
//                   onClick={handleTimeOut}
//                   className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
//                 >
//                   <LogOut size={16} />
//                   Time Out
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </Modal>
//     </div>
//   );
// }



























import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import type { Employee, Attendance as AttendanceType } from '../../lib/types';
import { formatTime, formatDate } from '../../lib/utils';
import Modal from '../../contexts/Modal';

import {
  ScanLine,
  CheckCircle,
  LogIn,
  LogOut,
  Smartphone,
  Fingerprint,
} from 'lucide-react';

export default function Attendance() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);

  const [showScanner, setShowScanner] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [fingerVerified, setFingerVerified] = useState(false);

  const [verifying, setVerifying] = useState(false);

  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [empRes, attRes] = await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name'),

      supabase
        .from('attendance')
        .select('*, employee:employees(*)')
        .eq('date', dateFilter)
        .order('created_at', { ascending: false }),
    ]);

    setEmployees(empRes.data || []);
    setRecords(attRes.data || []);

    setLoading(false);
  }, [dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const verifyFingerprint = async () => {
    if (!selectedEmployee) return;

    setVerifying(true);

    try {
      if (!window.PublicKeyCredential) {
        alert('Fingerprint authentication is not supported on this device.');
        setVerifying(false);
        return;
      }

      const employee = employees.find(
        (e) => e.id === selectedEmployee
      );

      if (!employee?.fingerprint_registered) {
        alert('Employee fingerprint is not registered.');
        setVerifying(false);
        return;
      }

      await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: [],
        } as any,
      });

      setFingerVerified(true);

      alert('Fingerprint verified successfully!');
    } catch (err) {
      console.error(err);

      alert('Fingerprint verification failed.');
    }

    setVerifying(false);
  };

  const handleTimeIn = async () => {
    if (!selectedEmployee) return;

    const now = new Date();

    const timeIn = now.toTimeString().split(' ')[0];

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .eq('date', dateFilter)
      .maybeSingle();

    if (existing) {
      alert('Employee already timed in today.');
      return;
    }

    const { error } = await supabase.from('attendance').insert({
      employee_id: selectedEmployee,
      date: dateFilter,
      time_in: timeIn,
      status: 'present',
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Time In successful.');

    resetScanner();

    fetchData();
  };

  const handleTimeOut = async () => {
    if (!selectedEmployee) return;

    const now = new Date();

    const timeOut = now.toTimeString().split(' ')[0];

    const { data: todayRecord, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .eq('date', dateFilter)
      .maybeSingle();

    if (error || !todayRecord) {
      alert('No Time In record found.');
      return;
    }

    if (todayRecord.time_out) {
      alert('Employee already timed out.');
      return;
    }

    const [inH, inM] = todayRecord.time_in
      .split(':')
      .map(Number);

    const [outH, outM] = timeOut
      .split(':')
      .map(Number);

    const totalHours = Math.max(
      0,
      outH + outM / 60 - (inH + inM / 60)
    );

    const { error: updateError } = await supabase
      .from('attendance')
      .update({
        time_out: timeOut,
        total_hours:
          Math.round(totalHours * 100) / 100,
      })
      .eq('id', todayRecord.id);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    alert('Time Out successful.');

    resetScanner();

    fetchData();
  };

  const resetScanner = () => {
    setShowScanner(false);

    setSelectedEmployee('');

    setFingerVerified(false);

    setVerifying(false);
  };

  const companyQrData =
    `${window.location.origin}/attendance/check-in`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Attendance
          </h1>

          <p className="text-slate-500 mt-1">
            Track employee time in/out
          </p>
        </div>

        <button
          onClick={() => setShowScanner(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <ScanLine size={18} />
          Scan Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* QR CODE */}
        <a
          href="/attendance/check-in"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Company QR Code
          </h2>

          <div className="p-4 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
            <QRCodeSVG
              value={companyQrData}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-medium">
            <Smartphone size={16} />

            <span>
              Scan to mark attendance
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 text-center">
            Employees can scan this QR code using
            their phone
          </p>

          <p className="mt-3 text-[10px] text-slate-400 break-all text-center">
            {companyQrData}
          </p>
        </a>

        {/* SUMMARY */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Today's Summary
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {records.length}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Present
              </p>
            </div>

            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {
                  records.filter((r) => r.time_out)
                    .length
                }
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Timed Out
              </p>
            </div>

            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">
                {
                  records.filter((r) => !r.time_out)
                    .length
                }
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Still In
              </p>
            </div>

            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {employees.length - records.length}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Absent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RECORDS */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Attendance Records
          </h2>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Employee
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Date
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Time In
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Time Out
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Hours
                </th>

                <th className="text-left px-6 py-3 text-xs font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className="border-b">
                  <td className="px-6 py-4 text-sm">
                    {rec.employee?.full_name}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {formatDate(rec.date)}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {formatTime(rec.time_in ?? null)}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {formatTime(rec.time_out ?? null)}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {rec.total_hours || '--'}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {rec.status}
                  </td>
                </tr>
              ))}

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No attendance records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCANNER MODAL */}
      <Modal
        isOpen={showScanner}
        onClose={resetScanner}
        title="Mark Attendance"
        size="md"
      >
        <div className="space-y-4">

          {/* SELECT EMPLOYEE */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Employee
            </label>

            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(
                  e.target.value
                );

                setFingerVerified(false);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">
                -- Select Employee --
              </option>

              {employees.map((emp) => (
                <option
                  key={emp.id}
                  value={emp.id}
                >
                  {emp.full_name} (
                  {emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* FINGERPRINT VERIFY */}
          {selectedEmployee &&
            !fingerVerified && (
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Fingerprint Verification
                </p>

                <button
                  onClick={
                    verifyFingerprint
                  }
                  disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Fingerprint size={18} />

                  {verifying
                    ? 'Verifying...'
                    : 'Verify Fingerprint'}
                </button>
              </div>
            )}

          {/* SUCCESS */}
          {fingerVerified && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle
                  size={18}
                  className="text-emerald-600"
                />

                <p className="text-sm font-medium text-emerald-700">
                  Fingerprint verified
                  successfully
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTimeIn}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <LogIn size={16} />

                  Time In
                </button>

                <button
                  onClick={handleTimeOut}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  <LogOut size={16} />

                  Time Out
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}