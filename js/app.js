/**
 * Smart City CMS - Core Application Logic
 * Handles Authentication, Data Storage (LocalStorage), and UI Interactions
 */

const App = {
    // --- Backend API Integration ---
    api: {
        baseUrl: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? (window.location.port === '3000' ? '/api' : 'http://localhost:3000/api')
            : (window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api'),


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

    // --- Web Push Notifications Helper ---
    notifications: {
        async trigger(title, body) {
            console.log(`[Notification Triggered] Title: ${title}, Body: ${body}`);
            if (!('Notification' in window)) return;
            
            if (Notification.permission === 'granted') {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification(title, {
                            body: body,
                            icon: '/favicon.svg',
                            badge: '/favicon.svg',
                            vibrate: [200, 100, 200],
                            tag: 'complaint-update'
                        });
                    });
                } else {
                    new Notification(title, { body, icon: '/favicon.svg' });
                }
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.trigger(title, body);
                }
            }
        }
    },

    // --- Data Management (Hybrid: Cache + API) ---
    store: {
        complaintsCache: [],
        officersCache: [],

        // Initialize Data (Fetch from server)
        async loadData() {
            try {
                const previousCache = App.store.complaintsCache || [];
                const user = App.store.getCurrentUser();

                const [c, o] = await Promise.all([
                    App.api.get('/complaints'),
                    App.api.get('/officers')
                ]);
                if (c) {
                    App.store.complaintsCache = c;
                    localStorage.setItem('sc_complaints', JSON.stringify(c));

                    // Trigger Notification on status change
                    if (user && previousCache.length > 0) {
                        c.forEach(newComp => {
                            if (newComp.userId === user.email) {
                                const oldComp = previousCache.find(old => old.id === newComp.id);
                                if (oldComp && oldComp.status !== newComp.status) {
                                    App.notifications.trigger(
                                        `Complaint Status Updated!`,
                                        `Your issue "${newComp.subject}" is now: ${newComp.status.toUpperCase()}`
                                    );
                                }
                            }
                        });
                    }
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

        register: async (name, email, password, faceData = null, aadhaar = '') => {
            return await App.api.post('/auth/register', { name, email, password, faceData, aadhaar });
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

        faceLogin: async (faceData, expectedRole = null) => {
            try {
                const result = await App.api.post('/auth/face-login', { faceData, expectedRole });
                if (result.success) {
                    App.store.setCurrentUser(result.user);
                    if (result.token) localStorage.setItem('sc_auth_token', result.token);
                    await App.store.loadData();
                }
                return result;
            } catch (e) {
                return { success: false, message: "Biometric Auth Failed" };
            }
        },

        resetPassword: async (email, otp, newPassword) => {
            try {
                return await App.api.post('/auth/reset-password', { email, otp, newPassword });
            } catch (e) {
                return { success: false, message: "Server connection failed" };
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
                priority: data.priority || analysis.priority,
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

        updateStatus: async (id, newStatus, replyText = null, beforePhoto = null, afterPhoto = null) => {
            const result = await App.api.put(`/complaints/${id.replace('#', '')}/status`, { 
                status: newStatus, 
                reply: replyText,
                beforePhoto,
                afterPhoto
            });
            if (result.success) await App.store.loadData();
            return result.success;
        },

        submitFeedback: async (id, rating, text) => {
            const result = await App.api.post(`/complaints/${id.replace('#', '')}/feedback`, { rating, text });
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

        changePriority: async (id, priority) => {
            const result = await App.api.put(`/complaints/${id.replace('#', '')}/priority`, { priority });
            if (result.success) await App.store.loadData();
            return result.success;
        },

        rejectDuplicate: async (id) => {
            const result = await App.api.put(`/complaints/${id.replace('#', '')}/reject-duplicate`);
            if (result.success) await App.store.loadData();
            return result.success;
        },

        merge: async (childId, parentId) => {
            const result = await App.api.post(`/complaints/${childId.replace('#', '')}/merge`, { parentId });
            if (result.success) await App.store.loadData();
            return result;
        },

        getAll: () => App.store.getComplaints(),
        getUserComplaints: (email) => App.store.getComplaints().filter(c => c.user_id === email || c.userId === email),
        getOfficerComplaints: (name) => App.store.getComplaints().filter(c => c.assigned_to === name || c.assignedOfficer === name),
        getStats: () => {
            const all = App.store.getComplaints();
            return {
                total: all.length,
                pending: all.filter(c => c.status === 'pending').length,
                resolved: all.filter(c => ['resolved', 'completed', 'feedback_submitted'].includes(c.status)).length,
                open: all.filter(c => c.status === 'open' || c.status === 'assigned' || c.status === 'work_started' || c.status === 'accepted').length,
                highPriority: all.filter(c => (c.priority === 'High' || c.priority === 'Emergency') && !['resolved', 'completed', 'feedback_submitted'].includes(c.status)).length
            };
        },
        getAvgResolutionTime: () => {
            const all = App.store.getComplaints();
            const resolved = all.filter(c => ['resolved', 'completed', 'feedback_submitted'].includes(c.status));
            if (resolved.length === 0) return "14.5 hrs";
            let totalHours = 0;
            let count = 0;
            resolved.forEach(c => {
                let resolvedTime = null;
                if (c.history && c.history.length > 0) {
                    const resEvent = c.history.find(h => h.action === 'Status Update' && h.details && h.details.toLowerCase().includes('resolved'));
                    if (resEvent) resolvedTime = new Date(resEvent.timestamp).getTime();
                }
                if (!resolvedTime && c.feedback && c.feedback.timestamp) {
                    resolvedTime = new Date(c.feedback.timestamp).getTime();
                }
                const createdTime = c.timestamp || (c.created_at ? new Date(c.created_at).getTime() : Date.now() - 3600000 * 12);
                if (resolvedTime) {
                    const diffMs = resolvedTime - createdTime;
                    if (diffMs > 0) {
                        totalHours += diffMs / (1000 * 60 * 60);
                        count++;
                    }
                } else {
                    const hash = c.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    totalHours += (hash % 24) + 6;
                    count++;
                }
            });
            return (totalHours / count).toFixed(1) + " hrs";
        },
        getCitizenSatisfaction: () => {
            const all = App.store.getComplaints();
            const rated = all.filter(c => c.feedback && c.feedback.rating);
            if (rated.length === 0) return "92%";
            const avg = rated.reduce((acc, c) => acc + c.feedback.rating, 0) / rated.length;
            return Math.round((avg / 5) * 100) + "%";
        },
        getTopProblemArea: () => {
            const all = App.store.getComplaints();
            if (all.length === 0) return "None";
            const counts = {};
            all.forEach(c => {
                counts[c.category] = (counts[c.category] || 0) + 1;
            });
            let topCat = "None";
            let max = -1;
            for (const cat in counts) {
                if (counts[cat] > max) {
                    max = counts[cat];
                    topCat = cat;
                }
            }
            return topCat;
        },
        getDailyTrends: () => {
            const all = App.store.getComplaints();
            const days = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
            all.forEach(c => {
                const d = new Date(c.timestamp || Date.now());
                const key = d.toLocaleString('default', { weekday: 'short' });
                if (days[key] !== undefined) days[key]++;
            });
            return days;
        },
        getWardRanking: () => {
            const all = App.store.getComplaints();
            const wards = {};
            all.forEach(c => {
                const w = c.wardNumber || 'Ward 1';
                if (!wards[w]) wards[w] = { total: 0, resolved: 0, breached: 0 };
                wards[w].total++;
                if (['resolved', 'completed', 'feedback_submitted'].includes(c.status)) {
                    wards[w].resolved++;
                }
                if (c.isSlaBreached) {
                    wards[w].breached++;
                }
            });
            return Object.keys(wards).map(w => {
                const score = wards[w].total ? Math.round((wards[w].resolved / wards[w].total) * 100) : 100;
                return { ward: w, total: wards[w].total, resolved: wards[w].resolved, score: score };
            }).sort((a, b) => b.score - a.score);
        },
        getDeptRanking: () => {
            const all = App.store.getComplaints();
            const depts = {};
            all.forEach(c => {
                const d = c.category || 'Other';
                if (!depts[d]) depts[d] = { total: 0, resolved: 0, breached: 0 };
                depts[d].total++;
                if (['resolved', 'completed', 'feedback_submitted'].includes(c.status)) {
                    depts[d].resolved++;
                }
            });
            return Object.keys(depts).map(d => {
                const rate = depts[d].total ? Math.round((depts[d].resolved / depts[d].total) * 100) + "%" : "100%";
                return { dept: d, total: depts[d].total, rate: rate, score: depts[d].total ? depts[d].resolved / depts[d].total : 1 };
            }).sort((a, b) => b.score - a.score);
        },
        getOfficerRanking: () => {
            const all = App.store.getComplaints();
            const officers = {};
            all.forEach(c => {
                const off = c.assigned_to || c.assignedOfficer || 'Unassigned';
                if (off === 'Unassigned') return;
                if (!officers[off]) officers[off] = { resolved: 0, totalRating: 0, ratedCount: 0, breaches: 0 };
                if (['resolved', 'completed', 'feedback_submitted'].includes(c.status)) {
                    officers[off].resolved++;
                }
                if (c.feedback && c.feedback.rating) {
                    officers[off].totalRating += c.feedback.rating;
                    officers[off].ratedCount++;
                }
                if (c.isSlaBreached) {
                    officers[off].breaches++;
                }
            });
            return Object.keys(officers).map(off => {
                const avgRating = officers[off].ratedCount ? (officers[off].totalRating / officers[off].ratedCount).toFixed(1) : '4.5';
                return { name: off, resolved: officers[off].resolved, rating: avgRating, breaches: officers[off].breaches };
            }).sort((a, b) => b.resolved - a.resolved);
        },
        getMonthlyTrends: () => {
            const all = App.store.getComplaints();
            const months = {};
            all.forEach(c => {
                const ts = c.timestamp || (c.created_at ? new Date(c.created_at).getTime() : Date.now());
                const d = new Date(ts);
                const key = d.toLocaleString('default', { month: 'short' });
                months[key] = (months[key] || 0) + 1;
            });
            return months;
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
        // Register PWA Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => {
                        console.log('[PWA] Service Worker registered:', reg.scope);
                        if ('Notification' in window && Notification.permission === 'default') {
                            Notification.requestPermission();
                        }
                    })
                    .catch(err => console.error('[PWA] Service Worker registration failed:', err));
            });
        }

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

// Password Visibility Toggle Function
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
};
