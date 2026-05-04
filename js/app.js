/**
 * Smart City CMS - Core Application Logic
 * Handles Authentication, Data Storage (LocalStorage), and UI Interactions
 */

const App = {
    // --- Backend API Integration ---
    api: {
        baseUrl: window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api',

        getHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('sc_auth_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            return headers;
        },

        async get(endpoint) {
            try {
                const res = await fetch(`${this.baseUrl}${endpoint}`, {
                    headers: this.getHeaders()
                });
                const result = await res.json();
                if (result.message === 'Invalid Token') App.auth.logout();
                return result;
            } catch (e) { console.error('API Error', e); return null; }
        },
        async post(endpoint, data) {
            try {
                console.log(`[API POST] ${endpoint}`, data);
                const res = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                console.log(`[API RESPONSE] ${endpoint}`, result);
                if (result.message === 'Invalid Token' || result.message === 'Access Denied: No Token') {
                    console.warn("Session expired or invalid token. Logging out.");
                    App.auth.logout();
                }
                return result;
            } catch (e) { 
                console.error(`[API ERROR] POST ${endpoint}:`, e);
                return { success: false, message: "Server connection failed. Error: " + e.message }; 
            }
        },
        async put(endpoint, data) {
            try {
                const res = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
                return await res.json();
            } catch (e) { return { success: false, message: e.message }; }
        },
        async delete(endpoint) {
            try {
                const res = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'DELETE',
                    headers: this.getHeaders()
                });
                return await res.json();
            } catch (e) { return { success: false, message: e.message }; }
        }
    },

    // --- Data Management (Hybrid: Cache + API) ---
    store: {
        complaintsCache: [],
        officersCache: [],

        // Initialize Data (Fetch from server)
        async loadData() {
            try {
                const [c, o] = await Promise.all([
                    App.api.get('/complaints'),
                    App.api.get('/officers')
                ]);
                if (c) {
                    App.store.complaintsCache = c;
                    localStorage.setItem('sc_complaints', JSON.stringify(c));
                }
                if (o) {
                    App.store.officersCache = o;
                    localStorage.setItem('sc_officers', JSON.stringify(o));
                }
            } catch (e) {
                console.error("Failed to load data from server:", e);
            }
        },

        getUsers: () => JSON.parse(localStorage.getItem('sc_users')) || [], // Keep users implicit or fetch if needed
        setUsers: (users) => localStorage.setItem('sc_users', JSON.stringify(users)),

        getComplaints: () => App.store.complaintsCache.length ? App.store.complaintsCache : (JSON.parse(localStorage.getItem('sc_complaints')) || []),

        // Officers
        getOfficers: () => App.store.officersCache.length ? App.store.officersCache : [
            { id: 'off1', name: 'Officer John Doe', dept: 'Roads & Traffic', email: 'officer.roads@smartcity.com' },
            { id: 'off2', name: 'Officer Jane Smith', dept: 'Garbage & Sanitation', email: 'officer.waste@smartcity.com' },
            { id: 'off3', name: 'Officer Mike Johnson', dept: 'Water Supply', email: 'officer.water@smartcity.com' },
            { id: 'off4', name: 'Officer Sarah Wilson', dept: 'Electricity', email: 'officer.power@smartcity.com' }
        ],

        getLogs: () => JSON.parse(localStorage.getItem('sc_logs')) || [],
        addLog: (action, user, details) => {
            const logs = App.store.getLogs();
            logs.unshift({
                id: Date.now(),
                action,
                user,
                details,
                timestamp: new Date().toLocaleString()
            });
            if (logs.length > 50) logs.pop();
            localStorage.setItem('sc_logs', JSON.stringify(logs));
        },

        getCurrentUser: () => {
            const userStr = localStorage.getItem('sc_current_user');
            if (!userStr) return null;
            return JSON.parse(userStr);
        },
        setCurrentUser: (user) => localStorage.setItem('sc_current_user', JSON.stringify(user)),
        logout: () => {
            localStorage.removeItem('sc_current_user');
            localStorage.removeItem('sc_auth_token');
            window.location.href = 'index.html';
        }
    },

    // --- Notification Service ---
    notify: {
        send: (to, subject, body) => {
            console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}, Body: ${body}`);
            // In a real app, this would call an API. Here we simulate it.
            // Also store as in-app notification
            const notifs = JSON.parse(localStorage.getItem('sc_notifications') || '[]');
            notifs.unshift({ to, subject, body, date: new Date().toLocaleString(), read: false });
            localStorage.setItem('sc_notifications', JSON.stringify(notifs));

            // Push Notification Simulation
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(subject, { body });
            }
        },
        requestPermission: () => {
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
        }
    },

    // --- Multi-language Support ---
    i18n: {
        lang: localStorage.getItem('sc_lang') || 'en',
        dict: {
            'en': {
                'nav_platform': 'Platform',
                'nav_ledger': 'Blockchain Ledger',
                'nav_signin': 'Sign In',
                'hero_title': 'Smart Complaint Management',
                'hero_subtitle': 'AI-Powered Citizen Governance',
                'btn_report': 'Report Complaint',
                'btn_view': 'View Explorer',
                'login_title': 'Welcome Back',
                'login_btn': 'Login',
                'signup_title': 'Join the Community',
                'form_name': 'Full Name',
                'form_email': 'Email or Phone Number',
                'form_pass': 'Password',
                'dash_welcome': 'Welcome Citizen',
                'dash_overview': 'City Overview',
                'dash_subtitle': "Live analytics of your reported issues.",
                'dash_stats_filed': 'Complaints Filed',
                'dash_stats_resolved': 'Resolved Issues',
                'dash_new_btn': 'File New Complaint',
                'nav_signup': 'Join Platform',
                'table_id': 'ID',
                'table_subject': 'Subject',
                'table_status': 'Status',
                'table_dept': 'Department',
                'table_action': 'Action'
            },
            'hi': {
                'nav_platform': 'प्लेटफार्म',
                'nav_ledger': 'ब्लॉकचेन लेजर',
                'nav_signin': 'लॉग इन करें',
                'nav_signup': 'प्लेटफार्म से जुड़ें',
                'hero_title': 'स्मार्ट शिकायत प्रबंधन',
                'hero_subtitle': 'AI-आधारित नागरिक शासन',
                'btn_report': 'शिकायत दर्ज करें',
                'btn_view': 'एक्सप्लोरर देखें',
                'login_title': 'स्वागत है',
                'login_btn': 'लॉगिन करें',
                'signup_title': 'समुदाय से जुड़ें',
                'form_name': 'पूरा नाम',
                'form_email': 'ईमेल या फोन नंबर',
                'form_pass': 'पासवर्ड',
                'dash_welcome': 'स्वागत है नागरिक',
                'dash_overview': 'शहर का अवलोकन',
                'dash_subtitle': 'आपके द्वारा दर्ज मुद्दों का लाइव विश्लेषण।',
                'dash_stats_filed': 'दर्ज शिकायतें',
                'dash_stats_resolved': 'हल किए गए मुद्दे',
                'dash_new_btn': 'नई शिकायत दर्ज करें',
                'table_id': 'आईडी',
                'table_subject': 'विषय',
                'table_status': 'स्थिति',
                'table_dept': 'विभाग',
                'table_action': 'कार्रवाई'
            }
        },
        init: () => {
            App.i18n.applyTranslations();
        },
        translate: (key) => {
            const lang = App.i18n.lang;
            return (App.i18n.dict[lang] && App.i18n.dict[lang][key]) ? App.i18n.dict[lang][key] : key;
        },
        setLang: (lang) => {
            App.i18n.lang = lang;
            localStorage.setItem('sc_lang', lang);
            App.i18n.applyTranslations();
        },
        applyTranslations: () => {
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = App.i18n.translate(key);
                if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'password' || el.type === 'email')) {
                    el.placeholder = translation;
                } else {
                    el.innerText = translation;
                }
            });
        }
    },

    // --- Security Module ---
    security: {
        escapeHTML: (str) => {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
        checkSpam: (userId) => {
            const complaints = App.store.getComplaints();
            const lastComplaint = complaints.find(c => c.userId === userId);
            if (lastComplaint && (Date.now() - lastComplaint.timestamp < 60000)) return false;
            return true;
        },
        validatePassword: (pass) => {
            return pass.length >= 4;
        }
    },

    // --- Smart City AI Module ---
    smartAI: {
        analyze: (text, subject) => {
            const combined = (text + " " + subject).toLowerCase();
            let priority = 'Low';
            let category = 'Other';
            let eta = '7 Days';
            let sentiment = 'Neutral';
            let confidence = Math.floor(Math.random() * (99 - 85) + 85); // Simulated high confidence

            // Priority Logic & Emergency Mode
            if (combined.match(/danger|accident|fire|spark|leak|emergency|injury|open wire|current|explode|kill|death|ambulance|flood/)) {
                priority = 'High';
                eta = '2 Hours (Emergency Track)';
                sentiment = 'Critical/Negative';
                confidence = 99;
            } else if (combined.match(/block|stuck|overflow|broken|dark|light|smell|dirty/)) {
                priority = 'Medium';
                eta = '3 Days';
                sentiment = 'Negative';
            }

            // Auto-Categorization
            if (combined.match(/road|pothole|traffic|signal|jam|accident/)) category = 'Roads & Traffic';
            else if (combined.match(/garbage|trash|dump|smell|sanitation|clean|dustbin/)) category = 'Garbage & Sanitation';
            else if (combined.match(/water|pipe|leak|supply|dirty water|tank|sewage/)) category = 'Water Supply';
            else if (combined.match(/electric|wire|pole|light|power|outage|shock/)) category = 'Electricity';
            else if (combined.match(/park|tree|plant|garden|bench/)) category = 'Parks & Public Spaces';
            else if (combined.match(/pollution|smoke|air quality|haze|smog/)) category = 'Pollution Control'; // New Category

            return { priority, category, eta, sentiment, confidence };
        },

        isDuplicate: (location, subject) => {
            const complaints = App.store.getComplaints();
            return complaints.find(c =>
                c.status !== 'resolved' &&
                (c.location.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(c.location.toLowerCase())) &&
                (c.subject.toLowerCase().includes(subject.toLowerCase()))
            );
        }
    },

    // --- Smart Municipal Routing (Simulation) ---
    smartRouting: {
        getNearestTeam: (location, category) => {
            // In a real app, this would use geospatial queries.
            const teams = [
                { id: 'T1', loc: 'Downtown', skill: 'Roads & Traffic' },
                { id: 'T2', loc: 'North Zone', skill: 'Garbage & Sanitation' },
                { id: 'T3', loc: 'West End', skill: 'Water Supply' }
            ];
            // Simple match or random
            const match = teams.find(t => t.skill === category) || teams[0];
            return { teamId: match.id, loc: match.loc, eta: '15 mins' };
        }
    },

    // --- IoT & Sensor Simulation ---
    iot: {
        getPollutionLevel: (location) => {
            // Simulated AQI
            const aqi = Math.floor(Math.random() * (250 - 50) + 50);
            let status = 'Good';
            if (aqi > 100) status = 'Moderate';
            if (aqi > 150) status = 'Unhealthy';
            if (aqi > 200) status = 'Hazardous';
            return { aqi, status };
        },
        getTrafficStatus: (location) => {
            const density = Math.floor(Math.random() * 100);
            return density > 80 ? 'Heavy Congestion' : (density > 50 ? 'Moderate Flow' : 'Clear');
        }
    },

    // --- Neural Utilities ---
    loadFaceAPI: async () => {
        if (!window.faceapi) {
            alert("Face API script not loaded");
            return false;
        }
        try {
            await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            return true;
        } catch (e) {
            alert("Face API Load Error: " + e.message);
            console.error("Face API Load Error:", e);
            return false;
        }
    },

    getFaceDescriptor: async (videoEl) => {
        if (!window.faceapi) return null;
        try {
            // Lower minConfidence to 0.2 (default is 0.5) so it captures even in varied lighting/quality
            const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 });
            const detection = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks().withFaceDescriptor();
            return detection ? Array.from(detection.descriptor) : null;
        } catch(e) {
            console.error("Detection error: ", e);
            return null;
        }
    },

    captureMultipleEmbeddings: async (videoEl, count = 5, delay = 500, onProgress = null) => {
        const embeddings = [];
        let attempts = 0;
        try {
            while (embeddings.length < count && attempts < count * 3) {
                const desc = await App.getFaceDescriptor(videoEl);
                if (desc) {
                    embeddings.push(desc);
                    if (onProgress) onProgress(embeddings.length);
                }
                attempts++;
                await new Promise(r => setTimeout(r, delay));
            }
        } catch(e) {
            alert("Capture error: " + e.message);
        }
        return embeddings;
    },

    // --- Authentication ---
    auth: {
        sendOtp: async (email) => {
            return await App.api.post('/auth/send-otp', { email });
        },

        verifyOtp: async (email, otp) => {
            return await App.api.post('/auth/verify-otp', { email, otp });
        },

        register: async (name, email, password, faceData = null) => {
            return await App.api.post('/auth/register', { name, email, password, faceData });
        },

        login: async (email, password) => {
            try {
                const result = await App.api.post('/auth/login', { email, password });
                if (result.success) {
                    App.store.setCurrentUser(result.user);
                    if (result.token) localStorage.setItem('sc_auth_token', result.token);
                    await App.store.loadData();
                }
                return result;
            } catch (e) {
                return { success: false, message: "Connection to server failed. Please ensure 'node server.js' is running." };
            }
        },

        faceLogin: async (faceData) => {
            try {
                const result = await App.api.post('/auth/face-login', { faceData });
                if (result.success) {
                    App.store.setCurrentUser(result.user);
                    if (result.token) localStorage.setItem('sc_auth_token', result.token);
                    await App.store.loadData();
                }
                return result;
            } catch (e) {
                return { success: false, message: "Biometric Auth Failed" };
            }
        }
    },

    // --- Complaint Management ---
    complaints: {
        create: async (data) => {
            const user = App.store.getCurrentUser();
            if (!user) {
                console.error("[COMPLAINT] No user found in local storage");
                return { success: false, message: "Authentication required. Please login again." };
            }

            console.log("[COMPLAINT] Creating complaint for user:", user.email);

            // Client-side AI Simulation
            const analysis = App.smartAI.analyze(data.description, data.subject);

            const payload = {
                ...data,
                userId: user.email,
                userName: user.name,
                category: data.category || analysis.category,
                priority: analysis.priority,
                eta: analysis.eta,
                sentiment: analysis.sentiment,
                confidence: analysis.confidence,
                image: data.image
            };

            // Call API
            console.log("[COMPLAINT] Submitting payload:", payload);
            const result = await App.api.post('/complaints', payload);
            
            if (result.success) {
                console.log("[COMPLAINT] Successfully filed:", result.complaint.id);
                // Update Local Cache
                await App.store.loadData();
                App.notify.send(user.email, 'Complaint Received', `Your complaint ${result.complaint.id} has been logged.`);
                return { success: true, complaint: result.complaint };
            } else {
                console.error("[COMPLAINT] Submission failed:", result.message);
                return result;
            }
        },

        updateStatus: async (id, newStatus, replyText = null) => {
            const result = await App.api.put(`/complaints/${id.replace('#', '')}/status`, { status: newStatus, reply: replyText });
            if (result.success) await App.store.loadData();
            return result.success;
        },

        edit: (id, newDesc) => {
            // Edit not implemented in simple API yet, keeping local behavior/fallback or alert
            alert("Edit feature pending backend integration.");
            return false;
        },

        withdraw: async (id) => {
            const result = await App.api.delete(`/complaints/${id}`);
            if (result.success) await App.store.loadData();
            return result.success;
        },

        delete: async (id) => {
            const result = await App.api.delete(`/complaints/${id}`);
            if (result.success) await App.store.loadData();
            return result.success;
        },

        assign: async (id, officer) => {
            const result = await App.api.put(`/complaints/${id}/assign`, { officer });
            if (result.success) await App.store.loadData();
            return result.success;
        },

        getAll: () => App.store.getComplaints(),
        getUserComplaints: (email) => App.store.getComplaints().filter(c => c.user_id === email || c.userId === email),
        getOfficerComplaints: (name) => App.store.getComplaints().filter(c => c.assigned_to === name || c.assignedOfficer === name),
        getStats: () => {
            const all = App.store.getComplaints();
            return {
                total: all.length,
                pending: all.filter(c => c.status === 'pending').length,
                resolved: all.filter(c => c.status === 'resolved').length,
                open: all.filter(c => c.status === 'open').length,
                highPriority: all.filter(c => c.priority === 'High' && c.status !== 'resolved').length
            };
        },
        getMonthlyTrends: () => {
            const all = App.store.getComplaints();
            const months = {};
            all.forEach(c => {
                const d = new Date(c.timestamp);
                const key = d.toLocaleString('default', { month: 'short' });
                months[key] = (months[key] || 0) + 1;
            });
            return months; // { 'Jan': 10, 'Feb': 5 }
        }
    },

    // --- UI Utilities ---
    ui: {
        renderComplaintsTable: (complaints, tableBodyId, isAdmin = false) => {
            const tbody = document.getElementById(tableBodyId);
            if (!tbody) return;
            tbody.innerHTML = '';

            console.log("Rendering table for", tableBodyId, "Data:", complaints);

            if (complaints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}" style="text-align:center; padding: 2rem;">No complaints found.</td></tr>`;
                return;
            }

            complaints.forEach(c => {
                const statusClass = `status-${c.status}`;
                const priorityClass = c.priority === 'High' ? 'color: #ef4444; font-weight:bold;' : (c.priority === 'Medium' ? 'color: #f97316;' : 'color: #22c55e;');

                let actionBtn = '';
                if (isAdmin) {
                    actionBtn = `
                        <div style="display:flex; gap:5px;">
                            <button onclick="openViewModal('${c.id}')" class="btn btn-secondary" style="padding: 4px 6px; font-size: 0.75rem;" title="View"><i class="fa-solid fa-eye"></i></button>
                            <button onclick="assignOfficer('${c.id}')" class="btn btn-secondary" style="padding: 4px 6px; font-size: 0.75rem;" title="Assign Officer"><i class="fa-solid fa-user-plus"></i></button>
                            <button onclick="openReplyModal('${c.id}')" class="btn btn-secondary" style="padding: 4px 6px; font-size: 0.75rem;" title="Reply"><i class="fa-solid fa-reply"></i></button>
                            <button onclick="deleteComplaint('${c.id}')" class="btn btn-secondary" style="background:#ef4444; color:white; padding: 4px 6px; font-size: 0.75rem;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                            ${c.status !== 'resolved' ? `<button onclick="handleStatusUpdate('${c.id}', 'resolved')" class="btn btn-primary" style="padding: 4px 6px; font-size: 0.75rem;" title="Resolve"><i class="fa-solid fa-check"></i></button>` : ''}
                        </div>
                    `;
                } else {
                    // Citizen Actions
                    if (c.status === 'pending') {
                        actionBtn = `
                            <button onclick="editComplaint('${c.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; margin-right:5px;">Edit</button>
                            <button onclick="withdrawComplaint('${c.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color:#ef4444; border-color:#ef4444;">Withdraw</button>
                        `;
                    } else {
                        actionBtn = c.adminReply
                            ? `<button onclick="alert('Admin says: ${c.adminReply}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;">View Reply</button>`
                            : `<span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">Processing...</span>`;
                    }
                }

                const row = `
                    <tr>
                        <td>${c.id}</td>
                        ${isAdmin ? `<td>${c.userName}</td>` : ''}
                        <td>${c.subject} <br><span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${c.location}</span></td>
                        <td>${c.category}</td>
                        <td style="${priorityClass}">${c.priority}</td>
                        <td><span class="status-badge ${statusClass}">${c.status.toUpperCase()}</span></td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        },

        updateDashboardStats: (stats) => {
            const totalEl = document.getElementById('statTotal');
            const pendingEl = document.getElementById('statPending');
            const resolvedEl = document.getElementById('statResolved');
            const priorityEl = document.getElementById('statPriority');

            if (totalEl) totalEl.innerText = stats.total;
            if (pendingEl) pendingEl.innerText = stats.pending;
            if (resolvedEl) resolvedEl.innerText = stats.resolved;
            if (priorityEl) priorityEl.innerText = stats.highPriority || 0;
        },

        renderIoTWidgets: (location = 'City Center') => {
            const pollution = App.iot.getPollutionLevel(location);
            const traffic = App.iot.getTrafficStatus(location);

            const widget = document.getElementById('iotWidget');
            if (widget) {
                widget.innerHTML = `
                   <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
                       <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.3);">
                           <h4 style="color: #10b981"><i class="fa-solid fa-wind"></i> Air Quality</h4>
                           <div style="font-size: 1.5rem; font-weight: bold;">${pollution.aqi}</div>
                           <div style="font-size: 0.8rem; color: var(--text-muted);">${pollution.status}</div>
                       </div>
                       <div style="background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.3);">
                           <h4 style="color: #f59e0b"><i class="fa-solid fa-traffic-light"></i> Traffic</h4>
                           <div style="font-size: 1.2rem; font-weight: bold; margin-top:5px;">${traffic}</div>
                       </div>
                   </div>
                `;
            }
        }
    },

    init: async () => {
        // Load Data on Init
        await App.store.loadData();

        // Navbar Scroll Hook (Present in all pages)
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            // Enforce Dark Mode permanently
            document.body.classList.add('dark-mode');
            localStorage.setItem('sc_theme', 'dark');

            const authDiv = document.querySelector('.auth-buttons');

            window.addEventListener('scroll', () => {
                if (window.scrollY > 20) {
                    navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                } else {
                    navbar.style.boxShadow = 'none';
                }
            });
        }

        // Check Server Status (Proactive Debugging)
        try {
            fetch(`${App.api.baseUrl}/blockchain`).then(r => {
                if (!r.ok) throw new Error();
                console.log("Server Online");
            }).catch(e => {
                console.warn("Backend server seems to be offline.");
                const msg = document.createElement('div');
                msg.id = 'server-offline-warning';
                msg.style.cssText = "position:fixed; bottom:20px; right:20px; background:#ef4444; color:white; padding:10px 20px; border-radius:10px; z-index:9999; box-shadow:0 0 20px rgba(0,0,0,0.3); font-weight:bold; font-family: 'Outfit', sans-serif;";
                msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Backend Offline - Run "node server.js"';
                document.body.appendChild(msg);
            });
        } catch (e) { }

        // Setup Global Handlers
        window.handleStatusUpdate = async (id, status) => {
            if (confirm(`Are you sure you want to mark this as ${status}?`)) {
                await App.complaints.updateStatus(id, status);
                location.reload();
            }
        };

        // Citizen Handlers
        window.withdrawComplaint = async (id) => {
            if (confirm('Are you sure you want to withdraw this complaint? This cannot be undone.')) {
                if (await App.complaints.withdraw(id)) {
                    alert('Complaint withdrawn.');
                    location.reload();
                } else {
                    alert('Could not withdraw.');
                }
            }
        };

        window.editComplaint = async (id) => {
            const newDesc = prompt("Enter new description for your complaint:");
            if (newDesc) {
                // Edit simulation remains local or alert
                alert("Edit feature pending backend integration.");
            }
        };

        // Admin Handlers
        window.deleteComplaint = async (id) => {
            if (confirm('Delete this complaint permanently? (Usually for spam)')) {
                await App.complaints.delete(id);
                location.reload();
            }
        };

        window.assignOfficer = async (id) => {
            // This is primarily used by admin.html which overrides it, but as a fallback:
            const officer = prompt("Enter Officer Name to assign:");
            if (officer) {
                await App.complaints.assign(id, officer);
                alert(`Assigned to ${officer}`);
                location.reload();
            }
        };

        // Logout Handler
        document.querySelectorAll('a').forEach(btn => {
            if (btn.innerText && btn.innerText.toLowerCase().includes('logout')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    App.store.logout();
                });
            }
        });
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', App.init);

// Export for inline usage if needed (though mostly handled via event listeners)
window.App = App;
