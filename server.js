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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcity';

console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('🚀 Successfully Connected to MongoDB Cloud');
    migrateData(); 
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
        const newIndex = lastBlock.index + 1;
        const timestamp = new Date().toISOString();
        const newHash = this.calculateHash(newIndex, lastBlock.hash, timestamp, data);

        const newBlock = new Block({
            index: newIndex,
            timestamp: timestamp,
            data: data,
            previousHash: lastBlock.hash,
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
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, faceData } = req.body;
        const existing = await User.findOne({ email });

        if (existing) {
            return res.json({ success: false, message: 'Email already registered' });
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
            const token = jwt.sign({ email: user.email, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
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

// Helper for Hamming Distance (Biometric Similarity)
const hammingDistance = (s1, s2) => {
    if (!s1 || !s2 || s1.length !== s2.length) return 999;
    let distance = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1[i] !== s2[i]) distance++;
    }
    return distance;
};

app.post('/api/auth/face-login', async (req, res) => {
    try {
        const { faceData } = req.body;
        const users = await User.find({ faceData: { $ne: null } });

        const THRESHOLD = 100; 
        let bestMatch = null;
        let minDistance = 9999;

        users.forEach(u => {
            const dist = hammingDistance(faceData, u.faceData);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = u;
            }
        });

        console.log(`[BIOMETRIC] Best Match Distance: ${minDistance} | Threshold: ${THRESHOLD}`);

        if (bestMatch && minDistance < THRESHOLD) {
            const user = bestMatch;
            const token = jwt.sign({ email: user.email, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/officers', async (req, res) => {
    const officers = await User.find({ role: 'officer' }, 'name email dept');
    res.json(officers);
});

// Complaints
app.get('/api/complaints', async (req, res) => {
    const complaints = await Complaint.find().sort({ timestamp: -1 });
    res.json(complaints);
});

app.post('/api/complaints', authenticateToken, async (req, res) => {

    try {
        const data = req.body;
        
        // 1. Run Python AI Service
        let aiResults = { category: data.category || 'Other', priority: 'Medium', confidence: 0.85, sentiment: 'Neutral' };
        try {
            const { spawnSync } = require('child_process');
            const pythonProcess = spawnSync('python', ['ai_service.py', data.description]);
            if (pythonProcess.stdout) {
                const output = pythonProcess.stdout.toString().trim();
                if (output) {
                    const parsed = JSON.parse(output);
                    aiResults = { ...aiResults, ...parsed };
                }
            }
        } catch (err) { console.warn("AI Service bypassed"); }

        let category = aiResults.category;
        const priority = aiResults.priority;

        // Keyword Fallback
        if (category === 'Other') {
            const desc = data.description.toLowerCase();
            if (desc.match(/bijli|light|wire|spark|transformer|electric|power|pole/)) category = 'Electricity';
            else if (desc.match(/pani|water|leak|pipe|tap|tanker|sewage/)) category = 'Water Supply';
            else if (desc.match(/garbage|kachra|smell|dustbin|drain|sweeping|animal/)) category = 'Garbage & Sanitation';
            else if (desc.match(/road|traffic|pothole|path|parking|signal|accident/)) category = 'Roads & Traffic';
        }

        // 2. Smart Assignment logic
        const officer = await User.findOne({ role: 'officer', dept: category });
        const assignedOfficerName = officer ? officer.name : 'Unassigned';
        const totalComps = await Complaint.countDocuments();

        const newComplaint = new Complaint({
            ...data,
            category: category,
            priority: priority,
            confidence: aiResults.confidence,
            sentiment: aiResults.sentiment,
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

        await newComplaint.save();

        // Blockchain record
        await smartCityChain.addBlock({
            action: "COMPLAINT_FILED",
            complaintId: newComplaint.id,
            user: req.user.name,
            details: `Securely filed on Blockchain Ledger. Category: ${category}`
        });

        res.json({ success: true, complaint: newComplaint });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
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
        res.status(500).json({ success: false, message: 'Server error' });
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
