const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "smartcity_secret_key_123";
// Global error handling to keep server alive
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname)); // Serve frontend files

const mongoose = require('mongoose');

// --- DATABASE CONFIGURATION ---
// Updated with the user's provided Atlas URI, converted to direct replica set nodes to fix DNS SRV ECONNREFUSED
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://roy349647_db_user:Ashish123@ac-jnxgu0r-shard-00-00.3bpupnm.mongodb.net:27017,ac-jnxgu0r-shard-00-01.3bpupnm.mongodb.net:27017,ac-jnxgu0r-shard-00-02.3bpupnm.mongodb.net:27017/smartcity?ssl=true&replicaSet=atlas-a3mm6k-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('🚀 Successfully Connected to MongoDB Cloud');
    migrateData(); 
    
    // Automatically open the website in the default browser when the server starts (Windows)
    const { exec } = require('child_process');
    exec('start http://localhost:3000');
    console.log('🌐 Opening website in browser...');
})
.catch(err => {
    console.error('❌ MongoDB Connection Error Details:');
    console.error('Message:', err.message);
});


// --- DATA MODELS (Schemas) ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'citizen' },
    dept: String,
    points: { type: Number, default: 0 },
    faceData: String
});

const OtpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});
const OTP = mongoose.model('OTP', OtpSchema);

// Nodemailer Setup
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER || "yourgmail@gmail.com",
        pass: process.env.EMAIL_PASS || "app_password"
    }
});
const User = mongoose.model('User', UserSchema);

const ComplaintSchema = new mongoose.Schema({
    complaint_id: String,
    id: String,
    user_id: String,
    userName: String,
    subject: String,
    description: String,
    location: String,
    category: String,
    priority: String,
    status: { type: String, default: 'pending' },
    assigned_to: String,
    image: String,
    latitude: Number,
    longitude: Number,
    sentiment: String,
    confidence: Number,
    adminReply: String,
    history: Array,
    created_at: { type: Date, default: Date.now },
    date: String,
    timestamp: { type: Number, default: Date.now }
});
const Complaint = mongoose.model('Complaint', ComplaintSchema);

const BlockSchema = new mongoose.Schema({
    index: Number,
    timestamp: String,
    data: mongoose.Schema.Types.Mixed,
    previousHash: String,
    hash: String
});
const Block = mongoose.model('Block', BlockSchema);

// --- JSON DB Fallback (for Migration only) ---
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const BLOCKCHAIN_FILE = path.join(DATA_DIR, 'blockchain.json');

const readData = (file) => {
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')) || []; }
    catch (e) { return []; }
};

// --- MIGRATION UTILITY ---
async function migrateData() {
    try {
        if ((await User.countDocuments()) === 0) {
            const users = readData(USERS_FILE);
            if (users.length > 0) await User.insertMany(users);
        }
        if ((await Complaint.countDocuments()) === 0) {
            const comps = readData(COMPLAINTS_FILE);
            if (comps.length > 0) await Complaint.insertMany(comps);
        }
        if ((await Block.countDocuments()) === 0) {
            const chain = readData(BLOCKCHAIN_FILE);
            if (chain.length > 0) await Block.insertMany(chain);
        }
        console.log('✅ Data Migration Check Complete');
    } catch (err) { console.warn('Migration status:', err.message); }
}

// --- Blockchain Implementation (DB Powered) ---
class Blockchain {
    constructor() {}

    async init() {
        const count = await Block.countDocuments();
        if (count === 0) await this.createGenesisBlock();
    }

    async createGenesisBlock() {
        const genesis = {
            index: 0,
            timestamp: new Date().toISOString(),
            data: "Genesis Block - Smart City Ledger",
            previousHash: "0",
            hash: this.calculateHash(0, "0", new Date().toISOString(), "Genesis Block - Smart City Ledger")
        };
        await new Block(genesis).save();
    }

    calculateHash(index, previousHash, timestamp, data) {
        return crypto.createHash('sha256').update(index + previousHash + timestamp + JSON.stringify(data)).digest('hex');
    }

    async addBlock(data) {
        const lastBlock = await Block.findOne().sort({ index: -1 });
        const newIndex = lastBlock ? lastBlock.index + 1 : 1;
        const previousHash = lastBlock ? lastBlock.hash : "0";
        const timestamp = new Date().toISOString();
        const newHash = this.calculateHash(newIndex, previousHash, timestamp, data);

        const newBlock = new Block({
            index: newIndex,
            timestamp: timestamp,
            data: data,
            previousHash: previousHash,
            hash: newHash
        });

        await newBlock.save();
        return newBlock;
    }

    async getChain() {
        return await Block.find().sort({ index: 1 });
    }
}

const smartCityChain = new Blockchain();
smartCityChain.init();


// --- Reward System Helper (DB Powered) ---
const rewardUser = async (email, points) => {
    try {
        await User.findOneAndUpdate(
            { email: email },
            { $inc: { points: points } }
        );
        console.log(`[REWARD] Awarded ${points} points to ${email}`);
    } catch (err) { console.error("Reward error:", err); }
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Access Denied: No Token' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// Initial Data Seed (One-time check)
const seedData = async () => {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        const initialUsers = [
            { name: 'System Admin', email: 'admin@smartcity.com', password: 'admin123', role: 'admin' },
            { name: 'Officer John Doe', email: 'officer.roads@smartcity.com', dept: 'Roads & Traffic', password: '123', role: 'officer' },
            { name: 'Officer Jane Smith', email: 'officer.waste@smartcity.com', dept: 'Garbage & Sanitation', password: '123', role: 'officer' },
            { name: 'Officer Mike Johnson', email: 'officer.water@smartcity.com', dept: 'Water Supply', password: '123', role: 'officer' },
            { name: 'Officer Sarah Wilson', email: 'officer.power@smartcity.com', dept: 'Electricity', password: '123', role: 'officer' }
        ];
        await User.insertMany(initialUsers);
        console.log('✅ Database seeded with initial users.');
    }
};
seedData();

// --- Routes ---

// Blockchain Transparency
app.get('/api/blockchain', async (req, res) => {
    const chain = await smartCityChain.getChain();
    res.json(chain);
});

// Predictions (ML Stub)
app.get('/api/predictions', async (req, res) => {
    const complaints = await Complaint.find();
    const locationCounts = {};

    complaints.forEach(c => {
        const loc = c.location || "Unknown";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    // Sort locations by risk
    const predictions = Object.keys(locationCounts).map(loc => ({
        location: loc,
        riskScore: Math.min(locationCounts[loc] * 10, 100), // Simple heuristic
        prediction: locationCounts[loc] > 5 ? "High Risk of recurrence" : "Moderate Risk"
    })).sort((a, b) => b.riskScore - a.riskScore);

    res.json(predictions);
});

// Auth
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(email);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await OTP.deleteMany({ email });
        await OTP.create({ email, otp: otpCode, expiresAt });

        if (isEmail) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER || "yourgmail@gmail.com",
                    to: email,
                    subject: "Smart City Verification Code",
                    text: `Your OTP is ${otpCode}. It expires in 5 minutes.`
                });
                console.log(`[OTP] Sent to ${email}: ${otpCode}`);
            } catch(e) {
                console.error("Nodemailer error: ", e.message);
                console.log(`[SIMULATED OTP] because email config failed. OTP for ${email}: ${otpCode}`);
            }
        } else {
            console.log(`[SIMULATED SMS OTP] for Phone ${email}: ${otpCode}`);
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const stored = await OTP.findOne({ email });

        if (!stored) {
            return res.json({ success: false, message: 'No OTP requested' });
        }

        if (new Date() > stored.expiresAt) {
            return res.json({ success: false, message: 'OTP has expired' });
        }

        if (stored.otp !== otp) {
            return res.json({ success: false, message: 'Invalid OTP' });
        }

        // OTP is valid
        await OTP.deleteMany({ email });
        res.json({ success: true, message: 'OTP verified' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, faceData } = req.body;
        const existing = await User.findOne({ email });

        if (existing) {
            return res.json({ success: false, message: 'Account with this Email/Phone already registered' });
        }

        const newUser = new User({
            name,
            email,
            password,
            faceData,
            role: 'citizen',
            points: 0
        });

        await newUser.save();
        res.json({ success: true, message: 'Registration successful' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });

        if (user) {
            const token = jwt.sign({ email: user.email, role: user.role, name: user.name || 'Citizen' }, SECRET_KEY, { expiresIn: '1h' });
            res.json({
                success: true,
                token,
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    dept: user.dept,
                    points: user.points || 0
                }
            });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Euclidean Distance for Face Embeddings
const euclideanDistance = (arr1, arr2) => {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) return 999;
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += Math.pow(arr1[i] - arr2[i], 2);
    }
    return Math.sqrt(sum);
};

app.post('/api/auth/face-login', async (req, res) => {
    try {
        const { faceData } = req.body;
        let loginDescriptor;
        try {
            loginDescriptor = JSON.parse(faceData);
        } catch (e) {
            return res.json({ success: false, message: 'Invalid face data format' });
        }

        const users = await User.find({ faceData: { $ne: null } });

        // Threshold for face-api.js (0.6 is typical, 0.55 is strict)
        const THRESHOLD = 0.55; 
        let bestMatch = null;
        let minDistance = 9999;

        users.forEach(u => {
            try {
                const storedEmbeddings = JSON.parse(u.faceData);
                // Compare with all stored embeddings for the user
                for (let stored of storedEmbeddings) {
                    const dist = euclideanDistance(loginDescriptor, stored);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestMatch = u;
                    }
                }
            } catch (err) {
                // Ignore old string hash accounts
            }
        });

        console.log(`[BIOMETRIC] Best Match Distance: ${minDistance.toFixed(3)} | Threshold: ${THRESHOLD}`);

        if (bestMatch && minDistance < THRESHOLD) {
            const user = bestMatch;
            const token = jwt.sign({ email: user.email, role: user.role, name: user.name || 'Citizen' }, SECRET_KEY, { expiresIn: '1h' });
            res.json({
                success: true,
                token,
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    dept: user.dept,
                    points: user.points || 0
                }
            });
        } else {
            res.json({ success: false, message: 'Identity not recognized. Please register first.' });
        }
    } catch (e) {
        console.error('Face login error:', e);
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.get('/api/officers', async (req, res) => {
    const officers = await User.find({ role: 'officer' }, 'name email dept');
    res.json(officers);
});

// Complaints
app.get('/api/complaints', async (req, res) => {
    // Performance Fix: Exclude the massive Base64 'image' string from the bulk list to prevent 10+ second network lag
    const complaints = await Complaint.find().select('-image').sort({ timestamp: -1 });
    res.json(complaints);
});

app.post('/api/complaints', authenticateToken, async (req, res) => {
    try {
        const data = req.body;
        console.log('--- COMPLAINT SUBMISSION START ---');
        console.log('[DEBUG] User from Token:', req.user);
        console.log('[DEBUG] Payload keys:', Object.keys(data));

        if (!data.description || !data.subject) {
            console.error('[ERROR] Missing required fields: description or subject');
            return res.status(400).json({ success: false, message: 'Description and Subject are required' });
        }

        // 1. Run AI Service (Wrapped in a more robust way)
        let aiResults = { 
            category: data.category || 'Other', 
            priority: 'Medium', 
            confidence: 0.85, 
            sentiment: 'Neutral' 
        };

        console.log('[DEBUG] Running AI Service for description:', data.description.substring(0, 50) + '...');
        
        try {
            // Performance Fix: Disabled synchronous Python AI script which was freezing the server for 5 seconds.
            // We now rely exclusively on the lightning-fast Keyword AI Fallback for instant classification.
            /*
            const { spawnSync } = require('child_process');
            const pythonProcess = spawnSync('python', ['ai_service.py', data.description], { timeout: 5000 });
            
            if (pythonProcess.error) {
                console.error('[AI ERROR] Spawn error:', pythonProcess.error.message);
            } else if (pythonProcess.stdout) {
                const output = pythonProcess.stdout.toString().trim();
                console.log('[DEBUG] AI Service Raw Output:', output);
                if (output && output.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(output);
                        aiResults = { ...aiResults, ...parsed };
                    } catch (pe) {
                        console.error('[AI ERROR] JSON Parse Error:', pe.message);
                    }
                }
            }
            */
            console.log('[DEBUG] Python AI disabled for speed. Using Keyword Fallback.');
        } catch (err) { 
            console.error("[AI ERROR] Execution failed:", err.message); 
        }

        let category = aiResults.category;
        const priority = aiResults.priority;

        // Keyword Fallback (if AI fails or is unsure)
        if (category === 'Other' || !category) {
            console.log('[DEBUG] Using Keyword Fallback for classification');
            const desc = (data.description + " " + data.subject).toLowerCase();
            if (desc.match(/bijli|light|wire|spark|transformer|electric|power|pole|shock/)) category = 'Electricity';
            else if (desc.match(/pani|water|leak|pipe|tap|tanker|sewage/)) category = 'Water Supply';
            else if (desc.match(/garbage|kachra|smell|dustbin|drain|sweeping|animal/)) category = 'Garbage & Sanitation';
            else if (desc.match(/road|traffic|pothole|path|parking|signal|accident/)) category = 'Roads & Traffic';
            else category = 'Other';
        }

        console.log('[DEBUG] Final Category:', category);

        // 2. Smart Assignment logic
        const officer = await User.findOne({ role: 'officer', dept: category });
        const assignedOfficerName = officer ? officer.name : 'Unassigned';
        const totalComps = await Complaint.countDocuments();

        const newComplaint = new Complaint({
            ...data,
            category: category,
            priority: priority,
            confidence: aiResults.confidence || 0.85,
            sentiment: aiResults.sentiment || 'Neutral',
            id: `#C-${1000 + totalComps + 1}`,
            complaint_id: `#C-${1000 + totalComps + 1}`,
            user_id: req.user.email,
            userName: req.user.name,
            status: officer ? 'open' : 'pending',
            assigned_to: assignedOfficerName,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            history: [
                { action: 'Created', timestamp: new Date().toISOString(), details: 'Complaint filed via Secure Portal' },
                { action: 'AI-Analysis', timestamp: new Date().toISOString(), details: `Classified as ${category} | Priority: ${priority}` }
            ]
        });

        if (officer) {
            newComplaint.history.push({
                action: 'Auto-Assigned',
                timestamp: new Date().toISOString(),
                details: `Assigned to ${officer.name} (${officer.dept}).`
            });
        }

        console.log('[DEBUG] Saving complaint to MongoDB...');
        await newComplaint.save();
        console.log('[DEBUG] Complaint saved successfully:', newComplaint.id);

        // 3. Blockchain record (with better error handling)
        try {
            console.log('[DEBUG] Adding block to blockchain...');
            await smartCityChain.addBlock({
                action: "COMPLAINT_FILED",
                complaintId: newComplaint.id,
                user: req.user.name,
                details: `Securely filed on Blockchain Ledger. Category: ${category}`
            });
            console.log('[DEBUG] Blockchain record added.');
        } catch (bErr) {
            console.error('[BLOCKCHAIN ERROR] Failed to add block:', bErr.message);
            // We don't fail the whole request if blockchain fails
        }

        console.log('--- COMPLAINT SUBMISSION SUCCESS ---');
        res.json({ success: true, complaint: newComplaint });

    } catch (e) {
        console.error('--- COMPLAINT SUBMISSION CRASH ---');
        console.error('Error Stack:', e.stack);
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.put('/api/complaints/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status, reply, eta } = req.body;
        const complaint = await Complaint.findOne({ id: req.params.id.startsWith('#') ? req.params.id : `#${req.params.id}` });

        if (complaint) {
            const oldStatus = complaint.status;
            complaint.status = status;
            if (reply) complaint.adminReply = reply;
            if (eta) complaint.eta = eta;

            complaint.history.push({
                action: 'Status Update',
                timestamp: new Date().toISOString(),
                details: `Status changed to ${status}. ${reply ? 'Reply: ' + reply : ''}`,
                by: req.user.name
            });

            await complaint.save();

            // Blockchain Record
            await smartCityChain.addBlock({
                action: "STATUS_CHANGE",
                complaintId: complaint.id,
                newStatus: status,
                by: req.user.email
            });

            // Reward System
            if (status === 'resolved' && oldStatus !== 'resolved') {
                await rewardUser(complaint.user_id, 50);
            }

            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        console.error('Status update error:', e);
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.put('/api/complaints/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { officer } = req.body;
        const complaint = await Complaint.findOne({ id: req.params.id.startsWith('#') ? req.params.id : `#${req.params.id}` });

        if (complaint) {
            complaint.assigned_to = officer;
            complaint.status = 'open';
            complaint.history.push({
                action: 'Assigned',
                timestamp: new Date().toISOString(),
                details: `Assigned to ${officer}`,
                by: req.user.name
            });

            await complaint.save();

            await smartCityChain.addBlock({
                action: "ASSIGNED",
                complaintId: complaint.id,
                officer: officer,
                by: req.user.email
            });

            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/complaints/:id', authenticateToken, async (req, res) => {
    try {
        const result = await Complaint.deleteOne({ id: req.params.id.startsWith('#') ? req.params.id : `#${req.params.id}` });
        if (result.deletedCount > 0) res.json({ success: true });
        else res.status(404).json({ success: false, message: 'Complaint not found' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

process.on('uncaughtException', (err) => console.error('Critical Error:', err));
setInterval(() => { }, 60000);
