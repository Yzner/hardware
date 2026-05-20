// import { useEffect, useState, useRef, useCallback } from 'react';
// import { supabase } from '../../lib/supabase';
// import type { Employee } from '../../lib/types';
// import { generateEmployeeId, formatCurrency } from '../../lib/utils';
// import Modal from '../../contexts/Modal';
// import { Plus, Pencil, Trash2, Eye, Search, Camera } from 'lucide-react';

// function Employees() {
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [showForm, setShowForm] = useState(false);
//   const [showDetail, setShowDetail] = useState(false);
//   const [selected, setSelected] = useState<Employee | null>(null);
//   const [editing, setEditing] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const streamRef = useRef<MediaStream | null>(null);

//   const [form, setForm] = useState({
//     full_name: '',
//     contact_number: '',
//     address: '',
//     age: '',
//     position: '',
//     salary_rate: '',
//   });
//   const [faceData, setFaceData] = useState('');
//   const [saving, setSaving] = useState(false);

//   const fetchEmployees = useCallback(async () => {
//     const { data } = await supabase
//       .from('employees')
//       .select('*')
//       .order('created_at', { ascending: false });
//     setEmployees(data || []);
//     setLoading(false);
//   }, []);

//   useEffect(() => {
//     fetchEmployees();
//   }, [fetchEmployees]);

//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
//       });
//       streamRef.current = stream;
//       setCameraActive(true);
//       // Wait for React to render the video element, then attach stream
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

//   const captureFace = () => {
//     if (!videoRef.current) return;
//     const canvas = document.createElement('canvas');
//     canvas.width = videoRef.current.videoWidth;
//     canvas.height = videoRef.current.videoHeight;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;
//     ctx.drawImage(videoRef.current, 0, 0);
//     const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
//     setFaceData(dataUrl);
//     stopCamera();
//   };

//   const openAdd = () => {
//     setEditing(false);
//     setSelected(null);
//     setForm({ full_name: '', contact_number: '', address: '', age: '', position: '', salary_rate: '' });
//     setFaceData('');
//     setShowForm(true);
//   };

//   const openEdit = (emp: Employee) => {
//     setEditing(true);
//     setSelected(emp);
//     setForm({
//       full_name: emp.full_name,
//       contact_number: emp.contact_number,
//       address: emp.address,
//       age: String(emp.age),
//       position: emp.position,
//       salary_rate: String(emp.salary_rate),
//     });
//     setFaceData(emp.face_data || '');
//     setShowForm(true);
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       if (editing && selected) {
//         const { error } = await supabase
//           .from('employees')
//           .update({
//             full_name: form.full_name,
//             contact_number: form.contact_number,
//             address: form.address,
//             age: parseInt(form.age) || 0,
//             position: form.position,
//             salary_rate: parseFloat(form.salary_rate) || 0,
//             face_data: faceData,
//             updated_at: new Date().toISOString(),
//           })
//           .eq('id', selected.id);
//         if (error) {
//           console.error('Update error:', error);
//           alert('Failed to update employee: ' + error.message);
//           setSaving(false);
//           return;
//         }
//       } else {
//         const empId = generateEmployeeId(employees.length);
//         const { error } = await supabase.from('employees').insert({
//           employee_id: empId,
//           full_name: form.full_name,
//           contact_number: form.contact_number,
//           address: form.address,
//           age: parseInt(form.age) || 0,
//           position: form.position,
//           salary_rate: parseFloat(form.salary_rate) || 0,
//           face_data: faceData,
//         });
//         if (error) {
//           console.error('Insert error:', error);
//           alert('Failed to add employee: ' + error.message);
//           setSaving(false);
//           return;
//         }
//       }
//       setShowForm(false);
//       stopCamera();
//       setSaving(false);
//       fetchEmployees();
//     } catch (err) {
//       console.error('Save error:', err);
//       alert('An unexpected error occurred.');
//       setSaving(false);
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm('Are you sure you want to delete this employee?')) return;
//     await supabase.from('employees').delete().eq('id', id);
//     fetchEmployees();
//   };

//   const filtered = employees.filter(
//     (e) =>
//       e.full_name.toLowerCase().includes(search.toLowerCase()) ||
//       e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
//       e.position.toLowerCase().includes(search.toLowerCase())
//   );

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
//           <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
//           <p className="text-slate-500 mt-1">{employees.length} total employees</p>
//         </div>
//         <button
//           onClick={openAdd}
//           className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
//         >
//           <Plus size={18} />
//           Add Employee
//         </button>
//       </div>

//       <div className="mb-6">
//         <div className="relative max-w-md">
//           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//           <input
//             type="text"
//             placeholder="Search employees..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
//           />
//         </div>
//       </div>

//       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead>
//               <tr className="bg-slate-50 border-b border-slate-200">
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary Rate</th>
//                 <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
//                 <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {filtered.map((emp) => (
//                 <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
//                         {emp.full_name.charAt(0)}
//                       </div>
//                       <div>
//                         <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
//                         <p className="text-xs text-slate-500">{emp.contact_number}</p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 text-sm text-slate-600 font-mono">{emp.employee_id}</td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{emp.position}</td>
//                   <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(emp.salary_rate)}/day</td>
//                   <td className="px-6 py-4">
//                     <span
//                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                         emp.is_active
//                           ? 'bg-emerald-50 text-emerald-700'
//                           : 'bg-slate-100 text-slate-600'
//                       }`}
//                     >
//                       {emp.is_active ? 'Active' : 'Inactive'}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 text-right">
//                     <div className="flex items-center justify-end gap-1">
//                       <button
//                         onClick={() => {
//                           setSelected(emp);
//                           setShowDetail(true);
//                         }}
//                         className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
//                         title="View"
//                       >
//                         <Eye size={16} />
//                       </button>
//                       <button
//                         onClick={() => openEdit(emp)}
//                         className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
//                         title="Edit"
//                       >
//                         <Pencil size={16} />
//                       </button>
//                       <button
//                         onClick={() => handleDelete(emp.id)}
//                         className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
//                         title="Delete"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
//                     No employees found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Add/Edit Modal */}
//       <Modal
//         isOpen={showForm}
//         onClose={() => {
//           setShowForm(false);
//           stopCamera();
//         }}
//         title={editing ? 'Edit Employee' : 'Add Employee'}
//         size="lg"
//       >
//         <div className="space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
//               <input
//                 type="text"
//                 value={form.full_name}
//                 onChange={(e) => setForm({ ...form, full_name: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
//               <input
//                 type="text"
//                 value={form.contact_number}
//                 onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
//               <input
//                 type="text"
//                 value={form.address}
//                 onChange={(e) => setForm({ ...form, address: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
//               <input
//                 type="number"
//                 value={form.age}
//                 onChange={(e) => setForm({ ...form, age: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
//               <input
//                 type="text"
//                 value={form.position}
//                 onChange={(e) => setForm({ ...form, position: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Salary Rate (per day)</label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={form.salary_rate}
//                 onChange={(e) => setForm({ ...form, salary_rate: e.target.value })}
//                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
//               />
//             </div>
//           </div>

//           {/* Face Registration */}
//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-2">Face Registration</label>
//             <div className="border border-slate-200 rounded-lg p-4">
//               {faceData ? (
//                 <div className="flex items-center gap-4">
//                   <img src={faceData} alt="Face capture" className="w-24 h-24 rounded-lg object-cover" />
//                   <div>
//                     <p className="text-sm text-emerald-600 font-medium">Face registered</p>
//                     <button
//                       onClick={() => {
//                         setFaceData('');
//                         startCamera();
//                       }}
//                       className="text-xs text-slate-500 hover:text-slate-700 mt-1"
//                     >
//                       Retake
//                     </button>
//                   </div>
//                 </div>
//               ) : cameraActive ? (
//                 <div className="space-y-3">
//                   <div className="relative rounded-lg overflow-hidden bg-black">
//                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 object-cover" />
//                   </div>
//                   <div className="flex gap-2">
//                     <button
//                       onClick={captureFace}
//                       className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
//                     >
//                       Capture Face
//                     </button>
//                     <button
//                       onClick={stopCamera}
//                       className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <button
//                   onClick={startCamera}
//                   className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
//                 >
//                   <Camera size={16} />
//                   Open Camera
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
//             <button
//               onClick={() => {
//                 setShowForm(false);
//                 stopCamera();
//               }}
//               className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleSave}
//               disabled={saving || !form.full_name}
//               className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {saving ? 'Saving...' : editing ? 'Update' : 'Add Employee'}
//             </button>
//           </div>
//         </div>
//       </Modal>

//       {/* Detail Modal */}
//       <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Employee Details" size="md">
//         {selected && (
//           <div className="space-y-4">
//             <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
//               <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600">
//                 {selected.full_name.charAt(0)}
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-slate-900">{selected.full_name}</h3>
//                 <p className="text-sm text-slate-500">{selected.employee_id}</p>
//               </div>
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <p className="text-xs text-slate-500">Position</p>
//                 <p className="text-sm font-medium text-slate-900">{selected.position}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-slate-500">Salary Rate</p>
//                 <p className="text-sm font-medium text-slate-900">{formatCurrency(selected.salary_rate)}/day</p>
//               </div>
//               <div>
//                 <p className="text-xs text-slate-500">Contact</p>
//                 <p className="text-sm font-medium text-slate-900">{selected.contact_number || '--'}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-slate-500">Age</p>
//                 <p className="text-sm font-medium text-slate-900">{selected.age || '--'}</p>
//               </div>
//               <div className="col-span-2">
//                 <p className="text-xs text-slate-500">Address</p>
//                 <p className="text-sm font-medium text-slate-900">{selected.address || '--'}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-slate-500">Face Registered</p>
//                 <p className="text-sm font-medium text-slate-900">{selected.face_data ? 'Yes' : 'No'}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-slate-500">Status</p>
//                 <p className={`text-sm font-medium ${selected.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
//                   {selected.is_active ? 'Active' : 'Inactive'}
//                 </p>
//               </div>
//             </div>
//             {selected.face_data && (
//               <div className="pt-4 border-t border-slate-200">
//                 <p className="text-xs text-slate-500 mb-2">Registered Face</p>
//                 <img src={selected.face_data} alt="Face" className="w-24 h-24 rounded-lg object-cover" />
//               </div>
//             )}
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// }


// export default Employees
















import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/types';
import { generateEmployeeId, formatCurrency } from '../../lib/utils';
import Modal from '../../contexts/Modal';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Fingerprint,
} from 'lucide-react';

function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    contact_number: '',
    address: '',
    age: '',
    position: '',
    salary_rate: '',
  });

  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const registerFingerprint = async () => {
    try {
      if (!window.PublicKeyCredential) {
        alert('Fingerprint authentication is not supported on this device.');
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

      setFingerprintRegistered(true);
      alert('Fingerprint registered successfully!');
    } catch (err) {
      console.error(err);
      alert('Fingerprint registration failed.');
    }
  };

  const openAdd = () => {
    setEditing(false);
    setSelected(null);

    setForm({
      full_name: '',
      contact_number: '',
      address: '',
      age: '',
      position: '',
      salary_rate: '',
    });

    setFingerprintRegistered(false);
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(true);
    setSelected(emp);

    setForm({
      full_name: emp.full_name,
      contact_number: emp.contact_number,
      address: emp.address,
      age: String(emp.age),
      position: emp.position,
      salary_rate: String(emp.salary_rate),
    });

    setFingerprintRegistered(emp.fingerprint_registered || false);

    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (editing && selected) {
        const { error } = await supabase
          .from('employees')
          .update({
            ...form,
            age: parseInt(form.age),
            salary_rate: parseFloat(form.salary_rate),
            fingerprint_registered: fingerprintRegistered,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selected.id);

        if (error) throw error;
      } else {
        const empId = generateEmployeeId(employees.length);

        const { error } = await supabase.from('employees').insert({
          employee_id: empId,
          ...form,
          age: parseInt(form.age),
          salary_rate: parseFloat(form.salary_rate),
          fingerprint_registered: fingerprintRegistered,
        });

        if (error) throw error;
      }

      setShowForm(false);
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete employee?')) return;

    await supabase.from('employees').delete().eq('id', id);

    fetchEmployees();
  };

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p>{employees.length} employees</p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4">Employee</th>
              <th className="text-left p-4">ID</th>
              <th className="text-left p-4">Position</th>
              <th className="text-left p-4">Salary</th>
              <th className="text-left p-4">Fingerprint</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} className="border-t">
                <td className="p-4">{emp.full_name}</td>
                <td className="p-4">{emp.employee_id}</td>
                <td className="p-4">{emp.position}</td>
                <td className="p-4">
                  {formatCurrency(emp.salary_rate)}
                </td>

                <td className="p-4">
                  {emp.fingerprint_registered ? 'Registered' : 'Not Registered'}
                </td>

                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(emp)}>
                      <Pencil size={16} />
                    </button>

                    <button onClick={() => handleDelete(emp.id)}>
                      <Trash2 size={16} />
                    </button>

                    <button
                      onClick={() => {
                        setSelected(emp);
                        setShowDetail(true);
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <div className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            value={form.full_name}
            onChange={(e) =>
              setForm({ ...form, full_name: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Contact Number"
            value={form.contact_number}
            onChange={(e) =>
              setForm({ ...form, contact_number: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={(e) =>
              setForm({ ...form, age: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Position"
            value={form.position}
            onChange={(e) =>
              setForm({ ...form, position: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <input
            type="number"
            placeholder="Salary Rate"
            value={form.salary_rate}
            onChange={(e) =>
              setForm({ ...form, salary_rate: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          />

          <div className="border rounded-lg p-4">
            {fingerprintRegistered ? (
              <div className="text-emerald-600 font-medium">
                Fingerprint Registered
              </div>
            ) : (
              <button
                onClick={registerFingerprint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg"
              >
                <Fingerprint size={18} />
                Register Fingerprint
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Employees;