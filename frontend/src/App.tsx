import React, { useState, useEffect } from 'react';
import { 
  Shield, Building, Clock, Star, MapPin, CheckCircle2, 
  Search, LogOut, Grid, Flame, Activity, PlusCircle, ArrowLeftRight
} from 'lucide-react';

// Mock Data for Demo
const initialComplaints = [
  { id: '#C-1001', tenantId: 'Jaipur', userName: 'Aarav Mehta', userEmail: 'citizen@gmail.com', subject: 'Water supply leakage in block B', category: 'Water Supply', priority: 'High', status: 'open', date: '2026-06-28', location: 'Block B, Sector 4', isSlaBreached: false, escalationLevel: 0, assignedTo: 'Officer Mike Johnson', remarks: '', beforePhoto: '', afterPhoto: '' },
  { id: '#C-1002', tenantId: 'Jaipur', userName: 'Priya Sharma', userEmail: 'priya@gmail.com', subject: 'Garbage heap accumulated near school gate', category: 'Garbage & Sanitation', priority: 'Critical', status: 'pending', date: '2026-06-28', location: 'Near Greenvalley School', isSlaBreached: true, escalationLevel: 1, assignedTo: 'Unassigned', remarks: '', beforePhoto: '', afterPhoto: '' },
  { id: '#C-1003', tenantId: 'Jaipur', userName: 'Rohan Gupta', userEmail: 'rohan@gmail.com', subject: 'Street lights not working for 3 days', category: 'Electricity', priority: 'Medium', status: 'resolved', date: '2026-06-27', location: 'Street 9, Sector 2', isSlaBreached: false, escalationLevel: 0, assignedTo: 'Officer Sarah Wilson', remarks: 'Replaced transformer fuse', beforePhoto: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=100', afterPhoto: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100' },
  { id: '#C-1004', tenantId: 'Jaipur', userName: 'Sneha Patel', userEmail: 'sneha@gmail.com', subject: 'Huge pothole causing traffic jam', category: 'Roads & Traffic', priority: 'High', status: 'assigned', date: '2026-06-26', location: 'Main Bypass Highway', isSlaBreached: false, escalationLevel: 0, assignedTo: 'Officer John Doe', remarks: '', beforePhoto: '', afterPhoto: '' },
  { id: '#C-1005', tenantId: 'Jodhpur', userName: 'Kabir Singh', userEmail: 'citizen@gmail.com', subject: 'Open sewer line overflow Jodhpur', category: 'Water Supply', priority: 'High', status: 'pending', date: '2026-06-28', location: 'Shastri Nagar, Jodhpur', isSlaBreached: false, escalationLevel: 0, assignedTo: 'Unassigned', remarks: '', beforePhoto: '', afterPhoto: '' }
];

const wardRankings = [
  { ward: 'Ward 4 (Delhi Central)', total: 42, resolved: 38, score: 90 },
  { ward: 'Ward 12 (West Ridge)', total: 35, resolved: 28, score: 80 },
  { ward: 'Ward 8 (East Gate)', total: 50, resolved: 30, score: 60 },
  { ward: 'Ward 15 (South Extension)', total: 29, resolved: 12, score: 41 },
];

const deptRankings = [
  { dept: 'Water Supply', total: 45, rate: '92%', sla: '11.2 hrs' },
  { dept: 'Electricity', total: 38, rate: '85%', sla: '24.5 hrs' },
  { dept: 'Garbage & Sanitation', total: 62, rate: '78%', sla: '19.8 hrs' },
  { dept: 'Roads & Traffic', total: 29, rate: '60%', sla: '144.0 hrs' },
];

const officerRankings = [
  { name: 'Officer Sarah Wilson', dept: 'Electricity', resolved: 28, rating: 4.8, breaches: 0 },
  { name: 'Officer Mike Johnson', dept: 'Water Supply', resolved: 22, rating: 4.6, breaches: 1 },
  { name: 'Officer John Doe', dept: 'Roads & Traffic', resolved: 19, rating: 4.2, breaches: 2 },
  { name: 'Officer Jane Smith', dept: 'Garbage & Sanitation', resolved: 15, rating: 4.5, breaches: 0 },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginRole, setLoginRole] = useState<'admin' | 'officer' | 'dept' | 'citizen'>('admin');
  const [email, setEmail] = useState('admin@smartcity.com');
  const [password, setPassword] = useState('admin123');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [currentTenant, setCurrentTenant] = useState('Jaipur');

  const API_BASE_URL = 'http://localhost:8080/api/complaints';

  useEffect(() => {
    fetch(API_BASE_URL, {
      headers: {
        'X-Tenant-ID': currentTenant
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setComplaints(data);
      }
    })
    .catch(err => console.log("Spring Boot API is offline, running with mock data.", err));
  }, [currentTenant]);
  
  // Tab states
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'complaints' | 'transparency'>('dashboard');
  
  // Dashboard & Complaint list states
  const [complaints, setComplaints] = useState(initialComplaints);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  
  // Form states for Citizen filing
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Garbage & Sanitation');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newLoc, setNewLoc] = useState('');

  // Form states for Officer updates
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [beforePhoto, setBeforePhoto] = useState('');
  const [afterPhoto, setAfterPhoto] = useState('');

  // Get matching officer details based on email
  const getOfficerName = (emailStr: string) => {
    if (emailStr.includes('roads')) return 'Officer John Doe';
    if (emailStr.includes('waste')) return 'Officer Jane Smith';
    if (emailStr.includes('water')) return 'Officer Mike Johnson';
    return 'Officer Sarah Wilson';
  };

  const getDeptHeadName = (emailStr: string) => {
    if (emailStr.includes('roads')) return 'Roads & Traffic';
    if (emailStr.includes('waste')) return 'Garbage & Sanitation';
    if (emailStr.includes('water')) return 'Water Supply';
    return 'Electricity';
  };

  const handleRoleChange = (role: 'admin' | 'officer' | 'dept' | 'citizen') => {
    setLoginRole(role);
    if (role === 'admin') {
      setEmail('admin@smartcity.com');
      setPassword('admin123');
    } else if (role === 'officer') {
      setEmail('officer.roads@smartcity.com');
      setPassword('123');
    } else if (role === 'dept') {
      setEmail('dept.roads@smartcity.com');
      setPassword('123');
    } else {
      setEmail('citizen@gmail.com');
      setPassword('123');
    }
  };

  const triggerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('Please enter both email and password');
    
    // Simulate 2FA OTP Send
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(randomOtp);
    setOtpSent(true);
    setTimeout(() => {
      alert(`[SIMULATED 2FA] OTP code sent: ${randomOtp}`);
    }, 500);
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp === otpCode) {
      setIsLoggedIn(true);
      setOtpSent(false);
      
      // Select appropriate tab depending on role
      if (loginRole === 'citizen') {
        setCurrentTab('complaints');
      } else {
        setCurrentTab('dashboard');
      }
    } else {
      alert('Invalid OTP code. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setOtpSent(false);
    setEnteredOtp('');
  };

  // Submit new complaint (Citizen)
  const handleFileComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newLoc || !newDesc) return alert('Please fill in all required fields');
    
    const newComp = {
      id: `#C-${1000 + complaints.length + 1}`,
      tenantId: currentTenant,
      userName: 'Aarav Mehta',
      userEmail: email,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      location: newLoc,
      isSlaBreached: false,
      escalationLevel: 0,
      assignedTo: 'Unassigned',
      remarks: '',
      beforePhoto: '',
      afterPhoto: ''
    };

    fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': currentTenant
      },
      body: JSON.stringify({
        userName: newComp.userName,
        subject: newComp.subject,
        description: newDesc,
        category: newComp.category,
        priority: newComp.priority,
        location: newComp.location,
        tenantId: newComp.tenantId
      })
    })
    .then(res => res.json())
    .then(saved => {
      setComplaints([saved, ...complaints]);
    })
    .catch(() => {
      setComplaints([newComp, ...complaints]);
    });

    setNewSubject('');
    setNewDesc('');
    setNewLoc('');
    alert('Complaint filed successfully. Added to Blockchain Audit Log.');
  };

  // Officer Update remarks / photos
  const handleOfficerUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    fetch(`${API_BASE_URL}/${selectedComplaint.id}/status?status=resolved`, {
      method: 'PUT'
    })
    .catch(() => {});

    setComplaints(prev => prev.map(c => {
      if (c.id === selectedComplaint.id) {
        return {
          ...c,
          status: 'resolved',
          remarks: officerRemarks,
          beforePhoto: beforePhoto || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=100',
          afterPhoto: afterPhoto || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100'
        };
      }
      return c;
    }));
    
    setOfficerRemarks('');
    setBeforePhoto('');
    setAfterPhoto('');
    setSelectedComplaint(null);
    alert('Task completed and resolved. Status updated to Resolved.');
  };

  // Department Head / Admin action handler
  const handleActionSubmit = (actionType: string, payload: any) => {
    if (!selectedComplaint) return;

    let url = '';
    if (actionType === 'assign') url = `${API_BASE_URL}/${selectedComplaint.id}/assign?officer=${encodeURIComponent(payload.officer)}`;
    if (actionType === 'priority') url = `${API_BASE_URL}/${selectedComplaint.id}/priority?priority=${encodeURIComponent(payload.priority)}`;
    if (actionType === 'status') url = `${API_BASE_URL}/${selectedComplaint.id}/status?status=${encodeURIComponent(payload.status)}`;
    if (actionType === 'reject') url = `${API_BASE_URL}/${selectedComplaint.id}/status?status=rejected`;
    if (actionType === 'merge') url = `${API_BASE_URL}/${selectedComplaint.id}/status?status=rejected`;

    if (url) {
      fetch(url, { method: 'PUT' }).catch(() => {});
    }

    setComplaints(prev => prev.map(c => {
      if (c.id === selectedComplaint.id) {
        if (actionType === 'assign') return { ...c, assignedTo: payload.officer, status: 'open' };
        if (actionType === 'priority') return { ...c, priority: payload.priority };
        if (actionType === 'status') return { ...c, status: payload.status };
        if (actionType === 'reject') return { ...c, status: 'rejected' };
        if (actionType === 'merge') return { ...c, status: 'rejected', remarks: `Merged into ${payload.parentId}` };
      }
      return c;
    }));
    setSelectedComplaint(null);
    alert(`Complaint ${selectedComplaint.id} successfully updated.`);
  };

  // Computed statistics
  const totalCount = complaints.length;

  // Filter complaints list depending on login role
  const displayComplaints = complaints.filter(c => {
    // 0. Tenant isolation check
    if (c.tenantId !== currentTenant) return false;

    // 1. Category and priority selectors
    const matchCategory = filterCategory === 'All' || c.category === filterCategory;
    const matchPriority = filterPriority === 'All' || c.priority === filterPriority;
    
    // 2. Search box
    const matchSearch = searchQuery === '' || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchCategory || !matchPriority || !matchSearch) return false;

    // 3. Role-based view filtering
    if (loginRole === 'citizen') {
      return c.userEmail === email; // only show their own complaints
    }
    if (loginRole === 'officer') {
      const currentOfficerName = getOfficerName(email);
      return c.assignedTo === currentOfficerName; // only show complaints assigned to this officer
    }
    if (loginRole === 'dept') {
      const currentDept = getDeptHeadName(email);
      return c.category === currentDept; // only show complaints belonging to their department
    }
    return true; // admin sees everything
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                SMARTCITY
              </span>
              <span className="text-xs block text-slate-400 font-semibold -mt-1 uppercase tracking-widest">
                Governance Platform
              </span>
            </div>
            {/* Multi-Tenant City Selector */}
            <div className="ml-2">
              <select 
                value={currentTenant} 
                onChange={(e) => setCurrentTenant(e.target.value)}
                className="bg-slate-850 border border-slate-800 text-[10px] sm:text-xs rounded-lg px-2.5 py-1 text-cyan-400 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer transition-all"
              >
                <option value="Jaipur">Jaipur Municipal</option>
                <option value="Jodhpur">Jodhpur Municipal</option>
                <option value="Ajmer">Ajmer Municipal</option>
                <option value="Kota">Kota Municipal</option>
              </select>
            </div>
          </div>

          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300">
                <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                <span className="capitalize">{loginRole} Session Active</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isLoggedIn ? (
          /* Login flow */
          <div className="max-w-md mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 backdrop-blur-lg shadow-xl shadow-indigo-950/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Secure Portal Access</h2>
              <p className="text-sm text-slate-400 mt-1">Select your municipal role to sign in</p>
            </div>

            {/* Role Select Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl mb-6">
              {(['admin', 'dept', 'officer', 'citizen'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all uppercase ${
                    loginRole === role 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {!otpSent ? (
              <form onSubmit={triggerLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email or Username</label>
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition" 
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-indigo-900/30"
                >
                  Request 2FA Secure OTP
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center mb-4">
                  <p className="text-xs text-slate-400">A security verification code has been dispatched to</p>
                  <p className="text-sm font-bold text-indigo-400 mt-0.5">{email}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Enter 6-Digit OTP</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="------"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-bold tracking-widest text-white focus:outline-none focus:border-indigo-500 transition" 
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg"
                  >
                    Verify & Login
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Dashboard Layout */
          <div className="space-y-6">
            {/* Upper Nav */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white capitalize">{loginRole} Dashboard</h1>
                {loginRole === 'officer' && <p className="text-xs text-slate-400">Welcome, {getOfficerName(email)} ({email})</p>}
                {loginRole === 'dept' && <p className="text-xs text-slate-400">Department Head: {getDeptHeadName(email)} Dept.</p>}
                {loginRole === 'citizen' && <p className="text-xs text-slate-400">Citizen Secure Complaint Portal</p>}
                {loginRole === 'admin' && <p className="text-xs text-slate-400">Municipal Command Center Controls</p>}
              </div>

              <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                {loginRole !== 'citizen' && (
                  <button 
                    onClick={() => setCurrentTab('dashboard')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Overview
                  </button>
                )}
                <button 
                  onClick={() => setCurrentTab('complaints')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    currentTab === 'complaints' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {loginRole === 'citizen' ? 'My Complaints' : 'Complaints Grid'}
                </button>
                <button 
                  onClick={() => setCurrentTab('transparency')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    currentTab === 'transparency' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Blockchain Ledger
                </button>
              </div>
            </div>

            {/* TAB: DASHBOARD VIEW (Staff Only) */}
            {currentTab === 'dashboard' && loginRole !== 'citizen' && (
              <>
                {/* Stats Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="bg-indigo-600/10 text-indigo-400 p-3 rounded-lg"><Grid className="h-6 w-6" /></div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {loginRole === 'officer' ? displayComplaints.length : 
                         loginRole === 'dept' ? displayComplaints.length : totalCount}
                      </h3>
                      <p className="text-xs text-slate-400">Total Cases</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="bg-amber-600/10 text-amber-400 p-3 rounded-lg"><Clock className="h-6 w-6" /></div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {displayComplaints.filter(c => c.status === 'pending' || c.status === 'open').length}
                      </h3>
                      <p className="text-xs text-slate-400">Pending Review</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="bg-emerald-600/10 text-emerald-400 p-3 rounded-lg"><CheckCircle2 className="h-6 w-6" /></div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {displayComplaints.filter(c => c.status === 'resolved').length}
                      </h3>
                      <p className="text-xs text-slate-400">Resolved Cases</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="bg-rose-600/10 text-rose-400 p-3 rounded-lg"><Flame className="h-6 w-6" /></div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {displayComplaints.filter(c => c.isSlaBreached && c.status !== 'resolved').length}
                      </h3>
                      <p className="text-xs text-slate-400">SLA Breaches</p>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Map & Rankings */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Map Simulation */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-cyan-400" /> Geographic Incident Density Map
                        </h3>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">OpenStreetMap Tiles</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800/80 rounded-lg h-56 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Simulating Map Markers */}
                        <div className="absolute top-12 left-24 w-4 h-4 bg-rose-500 rounded-full animate-ping"></div>
                        <div className="absolute top-12 left-24 w-3.5 h-3.5 bg-rose-600 rounded-full border-2 border-slate-950"></div>

                        <div className="absolute bottom-16 right-36 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                        <div className="absolute bottom-16 right-36 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-slate-950"></div>

                        <div className="absolute top-20 right-16 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-950"></div>

                        <p className="text-xs text-slate-500 font-semibold italic z-10">Map Overlay Activated - Plotting coordinates dynamically</p>
                      </div>
                    </div>

                    {/* Rankings Leaderboard (Visible to Admin/Dept Heads) */}
                    {loginRole !== 'officer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Ward Rankings */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Building className="h-4 w-4 text-indigo-400" /> Ward Performance Ranking
                          </h3>
                          <div className="space-y-2">
                            {wardRankings.map((w, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-1.5">
                                <span className="text-slate-300 font-medium">#{idx + 1} {w.ward}</span>
                                <span className={`font-bold ${w.score >= 80 ? 'text-emerald-400' : w.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {w.score}% Compliance
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Department Performance */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-cyan-400" /> Department Response Rates
                          </h3>
                          <div className="space-y-2">
                            {deptRankings.map((d, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-1.5">
                                <span className="text-slate-300 font-medium">{d.dept}</span>
                                <div className="text-right">
                                  <span className="text-slate-200 font-bold block">{d.rate} Resolved</span>
                                  <span className="text-[10px] text-slate-400 block -mt-0.5">SLA: {d.sla}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Officer Leaderboard & Secondary Stats */}
                  <div className="space-y-6">
                    {/* Officer Rankings */}
                    {loginRole !== 'officer' && (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-400" /> Officer Leaderboard
                        </h3>
                        <div className="space-y-3">
                          {officerRankings.map((o, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                              <div>
                                <p className="text-xs font-bold text-slate-200">#{idx + 1} {o.name}</p>
                                <p className="text-[10px] text-slate-400">{o.dept}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5 justify-end">
                                  <Star className="h-3 w-3 fill-amber-400" /> {o.rating}
                                </span>
                                <span className={`text-[10px] font-bold block ${o.breaches > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  Breaches: {o.breaches}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick System Health */}
                    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> System Health Status
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">Elasticsearch</span><span className="text-emerald-400 font-bold">Online</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Redis Cache</span><span className="text-emerald-400 font-bold">99.8% hit rate</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">PostGIS Engine</span><span className="text-emerald-400 font-bold">Active</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">K8s Deployment Nodes</span><span className="text-cyan-400 font-bold">4/4 Nodes</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: COMPLAINTS GRID (Dynamic for Citizen Filing or queues) */}
            {currentTab === 'complaints' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column for Citizen Filing */}
                {loginRole === 'citizen' && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 h-max">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-indigo-400" /> Lodge a New Complaint
                    </h3>
                    <form onSubmit={handleFileComplaint} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject / Title</label>
                        <input 
                          type="text" 
                          placeholder="Short description of the issue"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                          <select 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                          >
                            <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Roads & Traffic">Roads & Traffic</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                          <select 
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location / Address</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Block C, Sector 3"
                          value={newLoc}
                          onChange={(e) => setNewLoc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Description</label>
                        <textarea 
                          rows={3}
                          placeholder="Provide details about the municipal complaint..."
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl transition text-xs shadow-lg shadow-indigo-900/30"
                      >
                        File Complaint Securely
                      </button>
                    </form>
                  </div>
                )}

                {/* Main Complaints List */}
                <div className={`bg-slate-900/40 border border-slate-800 rounded-xl p-5 ${
                  loginRole === 'citizen' ? 'lg:col-span-2' : 'lg:col-span-3'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                      {loginRole === 'citizen' ? 'My Submitted Incidents' :
                       loginRole === 'officer' ? 'My Assigned Tasks' :
                       loginRole === 'dept' ? `${getDeptHeadName(email)} Queue` : 'Active Municipal Incidents'}
                    </h3>
                    
                    {/* Search and Filters */}
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500" 
                        />
                      </div>
                      
                      {loginRole === 'admin' && (
                        <>
                          <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                          >
                            <option value="All">All Categories</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Roads & Traffic">Roads & Traffic</option>
                          </select>

                          <select 
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                          >
                            <option value="All">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Reporter</th>
                          <th className="px-4 py-3">Subject</th>
                          {loginRole === 'admin' && <th className="px-4 py-3">Category</th>}
                          <th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">SLA status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {displayComplaints.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-500 italic">No complaints found in this view queue</td>
                          </tr>
                        ) : (
                          displayComplaints.map(c => (
                            <tr key={c.id} className="hover:bg-slate-850/40 transition">
                              <td className="px-4 py-3 font-bold text-indigo-400">{c.id}</td>
                              <td className="px-4 py-3">
                                <span className="block">{c.userName}</span>
                                <span className="text-[10px] text-slate-500">{c.userEmail}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="block text-slate-200 font-medium">{c.subject}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" /> {c.location}
                                </span>
                              </td>
                              {loginRole === 'admin' && <td className="px-4 py-3 text-slate-400">{c.category}</td>}
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                                  c.priority === 'Critical' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' :
                                  c.priority === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {c.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                                  c.status === 'resolved' ? 'bg-emerald-950 text-emerald-400' :
                                  c.status === 'pending' ? 'bg-amber-950 text-amber-400' :
                                  'bg-indigo-950 text-indigo-400'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {c.status === 'resolved' ? (
                                  <span className="text-slate-500 font-semibold">Closed</span>
                                ) : c.isSlaBreached ? (
                                  <span className="text-rose-400 font-bold uppercase text-[9px] bg-rose-950/40 px-2 py-0.5 border border-rose-900/30 rounded-full flex items-center gap-1 w-max">
                                    <Flame className="h-3 w-3" /> Breach (Lvl {c.escalationLevel})
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-bold uppercase text-[9px] bg-emerald-950/40 px-2 py-0.5 border border-emerald-900/30 rounded-full w-max block">
                                    On Time
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {loginRole === 'citizen' ? (
                                  <span className="text-slate-500 text-[10px] italic">Verified Ledger</span>
                                ) : (
                                  <button 
                                    onClick={() => setSelectedComplaint(c)}
                                    className="bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-bold px-3 py-1 rounded-lg transition"
                                  >
                                    Manage
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BLOCKCHAIN LEDGER */}
            {currentTab === 'transparency' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-400" /> Blockchain Write-Only Audit Ledger
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Every status transition and officer assignment logs a cryptographic transaction block. Publicly verifiable.
                </p>

                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-indigo-900/20 text-indigo-400 p-2 rounded-lg font-bold text-xs">#3</div>
                    <div className="flex-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>Transaction: OFFICER_ASSIGNED</span>
                        <span className="text-slate-400 font-normal">2026-06-28 14:22:15</span>
                      </div>
                      <p className="text-slate-400 mt-1">Complaint #C-1004 auto-assigned to Officer John Doe.</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-1 truncate">Hash: 8a4c3f7902dbe40e6ba394c86127e10c3b88...</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-indigo-900/20 text-indigo-400 p-2 rounded-lg font-bold text-xs">#2</div>
                    <div className="flex-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>Transaction: SLA_BREACH_ALERT</span>
                        <span className="text-slate-400 font-normal">2026-06-28 12:45:00</span>
                      </div>
                      <p className="text-slate-400 mt-1">SLA expired for #C-1002. Red Alert fired to Commissioner.</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-1 truncate">Hash: 92bf6c39f04ae234c000e39b7d80016a34ba...</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-indigo-900/20 text-indigo-400 p-2 rounded-lg font-bold text-xs">#1</div>
                    <div className="flex-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>Transaction: COMPLAINT_FILED</span>
                        <span className="text-slate-400 font-normal">2026-06-28 10:15:30</span>
                      </div>
                      <p className="text-slate-400 mt-1">Complaint #C-1001 filed by citizen Aarav Mehta.</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-1 truncate">Hash: 0a9e8f7ba2de4c0c1b7d8e20f16ba4a5ef63...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Action Dialog / Modal (Tailored dynamically by role) */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-indigo-400">
                  {loginRole === 'officer' ? 'Update Assignment Completion' : 'Manage Incident'}
                </h3>
                <span className="text-xs text-slate-400">ID: {selectedComplaint.id} | Priority: {selectedComplaint.priority}</span>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Complaint Summary */}
            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Subject:</span> <b className="text-slate-200">{selectedComplaint.subject}</b></p>
              <p><span className="text-slate-400">Location:</span> <b className="text-slate-200">{selectedComplaint.location}</b></p>
              <p><span className="text-slate-400">Assigned To:</span> <b className="text-slate-200">{selectedComplaint.assignedTo}</b></p>
            </div>

            <hr className="border-slate-800" />

            {/* Action Box: OFFICER FORM */}
            {loginRole === 'officer' ? (
              <form onSubmit={handleOfficerUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Completion Remarks</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Provide details about the work done to resolve this complaint..."
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Before Work Photo URL</label>
                    <input 
                      type="text" 
                      placeholder="Image link (optional)"
                      value={beforePhoto}
                      onChange={(e) => setBeforePhoto(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">After Work Photo URL</label>
                    <input 
                      type="text" 
                      placeholder="Image link (optional)"
                      value={afterPhoto}
                      onChange={(e) => setAfterPhoto(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition text-xs shadow-md"
                >
                  Submit Completion & Close Ticket
                </button>
              </form>
            ) : (
              /* Action Box: ADMIN / DEPT HEAD FORM */
              <div className="space-y-4">
                {/* Reassign Officer */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reassign Officer</label>
                  <div className="flex gap-2">
                    <select 
                      id="officerSelectBox"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                    >
                      <option value="Officer John Doe">Officer John Doe (Roads & Traffic)</option>
                      <option value="Officer Sarah Wilson">Officer Sarah Wilson (Electricity)</option>
                      <option value="Officer Mike Johnson">Officer Mike Johnson (Water Supply)</option>
                      <option value="Officer Jane Smith">Officer Jane Smith (Garbage & Sanitation)</option>
                    </select>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('officerSelectBox') as HTMLSelectElement;
                        handleActionSubmit('assign', { officer: el.value });
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {/* Change Priority */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Change Priority Level</label>
                  <div className="flex gap-2">
                    <select 
                      id="prioritySelectBox"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('prioritySelectBox') as HTMLSelectElement;
                        handleActionSubmit('priority', { priority: el.value });
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Reject or Merge Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleActionSubmit('reject', {})}
                    className="flex-1 bg-rose-950/40 border border-rose-900/30 hover:bg-rose-900/20 text-rose-400 font-bold py-2 rounded-xl transition text-xs"
                  >
                    Reject Duplicate
                  </button>
                  
                  <button 
                    onClick={() => {
                      const parentId = prompt("Enter parent Complaint ID to merge this duplicate into (e.g. #C-1001):");
                      if (parentId) handleActionSubmit('merge', { parentId });
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Merge Ticket
                  </button>
                </div>

                <button 
                  onClick={() => handleActionSubmit('status', { status: 'resolved' })}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition text-xs"
                >
                  Direct Resolve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-600">
          Smart City Municipal Platform Portal console • Government Grade Scalability
        </div>
      </footer>
    </div>
  );
}
