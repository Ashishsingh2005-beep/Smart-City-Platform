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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://roy349647_db_user:Ashish123@ac-jnxgu0r-shard-00-00.3bpupnm.mongodb.net:27017,ac-jnxgu0r-shard-00-01.3bpupnm.mongodb.net:27017,ac-jnxgu0r-shard-00-02.3bpupnm.mongodb.net:27017/smartcity?ssl=true&replicaSet=atlas-a3mm6k-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const BLOCKCHAIN_FILE = path.join(DATA_DIR, 'blockchain.json');

const readData = (file) => {
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')) || []; }
    catch (e) { return []; }
};

const writeData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
};

// --- LOCAL JSON MOCK MONGOOSE MODELS ---
function createMockModel(fileName, defaultData = []) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        writeData(filePath, defaultData);
    }

    let cache = null;

    const read = () => {
        if (cache === null) {
            cache = readData(filePath);
        }
        return cache;
    };

    const write = (data) => {
        cache = data;
        writeData(filePath, data);
    };

    const Model = function(properties) {
        Object.assign(this, properties);
        this.save = async () => {
            const data = [...read()];
            const idKey = this.id ? 'id' : (this.email ? 'email' : null);
            if (idKey) {
                const idx = data.findIndex(item => item[idKey] === this[idKey]);
                if (idx !== -1) {
                    data[idx] = { ...this };
                    delete data[idx].save;
                    write(data);
                    return this;
                }
            }
            const cleanCopy = { ...this };
            delete cleanCopy.save;
            data.push(cleanCopy);
            write(data);
            return this;
        };
    };

    Model.countDocuments = async () => {
        return read().length;
    };

    Model.insertMany = async (items) => {
        const data = [...read()];
        data.push(...items);
        write(data);
        return items;
    };

    Model.find = (query = {}) => {
        let data = read();
        
        if (Object.keys(query).length > 0) {
            data = data.filter(item => {
                for (let key in query) {
                    const val = query[key];
                    if (val && typeof val === 'object') {
                        if ('$ne' in val) {
                            if (item[key] === val['$ne']) return false;
                        }
                    } else {
                        if (item[key] !== val) return false;
                    }
                }
                return true;
            });
        } else {
            data = [...data];
        }

        const chain = {
            select: (projection) => {
                if (typeof projection === 'string') {
                    const fields = projection.split(/\s+/).filter(Boolean);
                    if (fields.length > 0) {
                        if (fields[0].startsWith('-')) {
                            const exclude = fields.map(f => f.substring(1));
                            data = data.map(item => {
                                const copy = { ...item };
                                exclude.forEach(f => delete copy[f]);
                                return copy;
                            });
                        } else {
                            data = data.map(item => {
                                const copy = {};
                                fields.forEach(f => {
                                    copy[f] = item[f];
                                });
                                return copy;
                            });
                        }
                    }
                }
                return chain;
            },
            sort: (sortObj) => {
                const key = Object.keys(sortObj)[0];
                const order = sortObj[key];
                data.sort((a, b) => {
                    if (a[key] < b[key]) return -1 * order;
                    if (a[key] > b[key]) return 1 * order;
                    return 0;
                });
                return chain;
            },
            limit: (num) => {
                data = data.slice(0, num);
                return chain;
            },
            then: (resolve) => resolve(data)
        };

        const result = [...data];
        Object.assign(result, chain);
        return result;
    };

    Model.findOne = (query = {}) => {
        let data = read();
        let found = data.filter(item => {
            for (let key in query) {
                const val = query[key];
                if (item[key] !== val) return false;
            }
            return true;
        });

        const chain = {
            select: (projection) => {
                if (typeof projection === 'string') {
                    const fields = projection.split(/\s+/).filter(Boolean);
                    if (fields.length > 0 && found.length > 0) {
                        if (fields[0].startsWith('-')) {
                            const exclude = fields.map(f => f.substring(1));
                            found = found.map(item => {
                                const copy = { ...item };
                                exclude.forEach(f => delete copy[f]);
                                return copy;
                            });
                        } else {
                            found = found.map(item => {
                                const copy = {};
                                fields.forEach(f => {
                                    copy[f] = item[f];
                                });
                                return copy;
                            });
                        }
                    }
                }
                return chain;
            },
            sort: (sortObj) => {
                const key = Object.keys(sortObj)[0];
                const order = sortObj[key];
                found.sort((a, b) => {
                    if (a[key] < b[key]) return -1 * order;
                    if (a[key] > b[key]) return 1 * order;
                    return 0;
                });
                return chain;
            },
            then: (resolve) => {
                const doc = found[0] ? new Model(found[0]) : null;
                resolve(doc);
            }
        };

        return chain;
    };

    Model.findOneAndUpdate = async (query, update) => {
        const data = [...read()];
        const idx = data.findIndex(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });

        if (idx !== -1) {
            let item = { ...data[idx] };
            if (update.$inc) {
                for (let key in update.$inc) {
                    item[key] = (item[key] || 0) + update.$inc[key];
                }
            }
            if (update.$set) {
                for (let key in update.$set) {
                    item[key] = update.$set[key];
                }
            }
            data[idx] = item;
            write(data);
            return new Model(item);
        }
        return null;
    };

    Model.deleteMany = async (query = {}) => {
        const data = read();
        const beforeLen = data.length;
        const filtered = data.filter(item => {
            for (let key in query) {
                if (item[key] === query[key]) return false;
            }
            return true;
        });
        write(filtered);
        return { deletedCount: beforeLen - filtered.length };
    };

    Model.deleteOne = async (query = {}) => {
        const data = [...read()];
        const idx = data.findIndex(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });
        if (idx !== -1) {
            data.splice(idx, 1);
            write(data);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    };

    Model.create = async (item) => {
        const inst = new Model(item);
        await inst.save();
        return inst;
    };

    return Model;
}

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

const LoginLogSchema = new mongoose.Schema({
    userName: String,
    email: String,
    role: String,
    method: { type: String, default: 'password' },
    loginTime: { type: Date, default: Date.now },
    ip: String,
    userAgent: String
});

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
    phone: String,
    created_at: { type: Date, default: Date.now },
    date: String,
    timestamp: { type: Number, default: Date.now },
    slaLimit: Date,
    isSlaBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 }
});

const BlockSchema = new mongoose.Schema({
    index: Number,
    timestamp: String,
    data: mongoose.Schema.Types.Mixed,
    previousHash: String,
    hash: String
});

// Let variables so they can be reassigned to mock models in case of fallback
let User = mongoose.model('User', UserSchema);
let OTP = mongoose.model('OTP', OtpSchema);
let LoginLog = mongoose.model('LoginLog', LoginLogSchema);
let Complaint = mongoose.model('Complaint', ComplaintSchema);
let Block = mongoose.model('Block', BlockSchema);

function fallbackToLocalJSON(err) {
    console.error('❌ MongoDB Connection Error Details:');
    console.error('Message:', err ? err.message : 'Unknown Connection Error');
    console.log('⚠️ Falling back to local JSON database...');

    User = createMockModel('users.json');
    OTP = createMockModel('otps.json');
    LoginLog = createMockModel('login_logs.json');
    Complaint = createMockModel('complaints.json');
    Block = createMockModel('blockchain.json');

    // Run initialization tasks
    setTimeout(async () => {
        try {
            await smartCityChain.init();
            await seedData();
            await migrateData();
            console.log('✅ Local JSON Database Ready');
        } catch (e) {
            console.error('Error during local JSON DB init:', e);
        }
    }, 100);

    // Automatically open browser on Windows
    const { exec } = require('child_process');
    exec('start http://localhost:3000');
    console.log('🌐 Opening website in browser...');
}

console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGODB_URI)
.then(async () => {
    console.log('🚀 Successfully Connected to MongoDB Cloud');
    try {
        await smartCityChain.init();
        await seedData();
        await migrateData();
    } catch (dbInitErr) {
        console.error('Error seeding/migrating cloud database:', dbInitErr);
    }
    
    // Automatically open the website in the default browser when the server starts (Windows)
    const { exec } = require('child_process');
    exec('start http://localhost:3000');
    console.log('🌐 Opening website in browser...');
})
.catch(err => {
    fallbackToLocalJSON(err);
});

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
        
        // SLA Schema migration step
        const allComps = await Complaint.find();
        let migratedCount = 0;
        for (const c of allComps) {
            if (!c.slaLimit) {
                let slaHours = 48; // default
                if (c.category === 'Garbage & Sanitation') slaHours = 24;
                else if (c.category === 'Water Supply') slaHours = 12;
                else if (c.category === 'Electricity') slaHours = 48;
                else if (c.category === 'Roads & Traffic') slaHours = 168; // 7 days
                
                c.slaLimit = new Date((c.timestamp || Date.now()) + slaHours * 60 * 60 * 1000);
                c.isSlaBreached = c.isSlaBreached || false;
                c.escalationLevel = c.escalationLevel || 0;
                await c.save();
                migratedCount++;
            }
        }
        if (migratedCount > 0) {
            console.log(`✅ SLA Migration: Backfilled SLA limits for ${migratedCount} complaints.`);
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
// smartCityChain.init(); // Run asynchronously after connection / fallback is ready



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
            { name: 'Commissioner Rajesh Kumar', email: 'commissioner@smartcity.com', password: '123', role: 'commissioner' },
            { name: 'Dept Head James', email: 'dept.roads@smartcity.com', dept: 'Roads & Traffic', password: '123', role: 'dept' },
            { name: 'Officer John Doe', email: 'officer.roads@smartcity.com', dept: 'Roads & Traffic', password: '123', role: 'officer' },
            { name: 'Officer Jane Smith', email: 'officer.waste@smartcity.com', dept: 'Garbage & Sanitation', password: '123', role: 'officer' },
            { name: 'Officer Mike Johnson', email: 'officer.water@smartcity.com', dept: 'Water Supply', password: '123', role: 'officer' },
            { name: 'Officer Sarah Wilson', email: 'officer.power@smartcity.com', dept: 'Electricity', password: '123', role: 'officer' }
        ];
        await User.insertMany(initialUsers);
        console.log('✅ Database seeded with initial users.');
    }
};
// seedData(); // Run asynchronously after connection / fallback is ready


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

        res.json({ success: true, message: 'OTP sent successfully', otp: otpCode });
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
            if (!existing.faceData && faceData) {
                // If account exists (like seeded admin/officer) but has no face ID, bind it
                existing.faceData = faceData;
                if (password && password === existing.password) {
                    // Password matches, update
                    await existing.save();
                    return res.json({ success: true, message: 'Face ID linked to your existing account!' });
                } else if (!password) {
                    // Allowed from biometric signup flow
                    await existing.save();
                    return res.json({ success: true, message: 'Face ID linked to your existing account!' });
                } else {
                    return res.json({ success: false, message: 'Invalid password for the existing account.' });
                }
            }
            return res.json({ success: false, message: 'Account with this Email/Phone already registered' });
        }

        // Auto-assign role based on email context for development ease
        let role = 'citizen';
        if (email.toLowerCase().includes('admin')) {
            role = 'admin';
        } else if (email.toLowerCase().includes('officer')) {
            role = 'officer';
        }

        const newUser = new User({
            name,
            email,
            password,
            faceData,
            role: role,
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
            // Save login log
            await LoginLog.create({
                userName: user.name,
                email: user.email,
                role: user.role,
                method: 'password',
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });
            console.log(`[LOGIN] ${user.name} (${user.email}) signed in`);

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

// Get all login logs (Admin only)
app.get('/api/auth/login-logs', async (req, res) => {
    try {
        const logs = await LoginLog.find().sort({ loginTime: -1 }).limit(100);
        res.json(logs);
    } catch (e) {
        res.status(500).json([]);
    }
});

// Get all registered users (Admin only)
app.get('/api/auth/users', async (req, res) => {
    try {
        const users = await User.find({}, 'name email role points').sort({ name: 1 });
        res.json(users);
    } catch (e) {
        res.status(500).json([]);
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
        const { faceData, expectedRole } = req.body;
        let loginDescriptor;
        try {
            loginDescriptor = JSON.parse(faceData);
        } catch (e) {
            return res.json({ success: false, message: 'Invalid face data format' });
        }

        if (!Array.isArray(loginDescriptor) || loginDescriptor.length !== 128) {
            return res.json({ success: false, message: 'Invalid face descriptor format. Must be a 128-dimensional array.' });
        }

        const query = { faceData: { $ne: null } };
        if (expectedRole) {
            query.role = expectedRole;
        }

        const users = await User.find(query);

        // Strict matching parameters
        const MIN_THRESHOLD = 0.42;
        const AVG_THRESHOLD = 0.48;
        
        let bestMatch = null;
        let minDistance = 9999;

        users.forEach(u => {
            try {
                const storedEmbeddings = JSON.parse(u.faceData);
                if (!Array.isArray(storedEmbeddings)) return;

                let sumDist = 0;
                let validCount = 0;
                let userMinDist = 9999;

                // Compare with all stored embeddings for the user
                for (let stored of storedEmbeddings) {
                    if (!Array.isArray(stored) || stored.length !== 128) continue;
                    const dist = euclideanDistance(loginDescriptor, stored);
                    sumDist += dist;
                    validCount++;
                    if (dist < userMinDist) {
                        userMinDist = dist;
                    }
                }

                if (validCount > 0) {
                    const avgDist = sumDist / validCount;
                    // Candidate matches must satisfy both strict minimum and average similarity thresholds
                    if (userMinDist < MIN_THRESHOLD && avgDist < AVG_THRESHOLD) {
                        if (userMinDist < minDistance) {
                            minDistance = userMinDist;
                            bestMatch = u;
                        }
                    }
                }
            } catch (err) {
                // Ignore invalid or old formats safely
            }
        });

        console.log(`[BIOMETRIC] Best Match Distance: ${minDistance.toFixed(3)} | Required Min: ${MIN_THRESHOLD}`);

        if (bestMatch) {
            const user = bestMatch;

            // Save login log for face login
            await LoginLog.create({
                userName: user.name,
                email: user.email,
                role: user.role,
                method: 'face',
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });
            console.log(`[FACE LOGIN] ${user.name} (${user.email}) signed in via Face ID`);

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

        let slaHours = 48; // default
        if (category === 'Garbage & Sanitation') slaHours = 24;
        else if (category === 'Water Supply') slaHours = 12;
        else if (category === 'Electricity') slaHours = 48;
        else if (category === 'Roads & Traffic') slaHours = 168; // 7 days

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
            slaLimit: new Date(Date.now() + slaHours * 60 * 60 * 1000),
            isSlaBreached: false,
            escalationLevel: 0,
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
        const queryId = req.params.id;
        const { status, reply, eta, beforePhoto, afterPhoto } = req.body;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.startsWith('#') ? queryId : `#${queryId}` }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

        if (complaint) {
            const oldStatus = complaint.status;
            complaint.status = status;
            if (reply) complaint.adminReply = reply;
            if (eta) complaint.eta = eta;
            if (beforePhoto) complaint.beforePhoto = beforePhoto;
            if (afterPhoto) complaint.afterPhoto = afterPhoto;
            if (reply && status === 'resolved') complaint.completionRemarks = reply;

            complaint.history.push({
                action: 'Status Update',
                timestamp: new Date().toISOString(),
                details: `Status changed to ${status}. ${reply ? 'Remarks: ' + reply : ''}`,
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
        const queryId = req.params.id;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.startsWith('#') ? queryId : `#${queryId}` }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

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
        const queryId = req.params.id;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.startsWith('#') ? queryId : `#${queryId}` }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

        if (complaint) {
            const result = await Complaint.deleteOne({ id: complaint.id });
            if (result.deletedCount > 0) res.json({ success: true });
            else res.status(404).json({ success: false, message: 'Complaint not found' });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/complaints/:id/feedback', authenticateToken, async (req, res) => {
    try {
        const queryId = req.params.id;
        const { rating, text } = req.body;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.startsWith('#') ? queryId : `#${queryId}` }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

        if (complaint) {
            complaint.status = 'feedback_submitted';
            complaint.feedback = { rating: Number(rating), text, timestamp: new Date().toISOString() };
            complaint.history.push({
                action: 'Feedback Submitted',
                timestamp: new Date().toISOString(),
                details: `Citizen rated ${rating}/5 Stars. Comments: "${text}"`
            });
            await complaint.save();

            // Blockchain Record
            await smartCityChain.addBlock({
                action: "FEEDBACK_SUBMITTED",
                complaintId: complaint.id,
                rating: Number(rating),
                by: req.user.email
            });

            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.post('/api/complaints/:id/vote', authenticateToken, async (req, res) => {
    try {
        const queryId = req.params.id;
        let comp = await Complaint.findOne({ id: queryId }) || 
                         await Complaint.findOne({ complaint_id: queryId }) ||
                         await Complaint.findOne({ id: queryId.replace('#', '') });
        
        if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });
        
        if (!comp.votedUsers) comp.votedUsers = [];
        if (comp.votedUsers.includes(req.user.email)) {
            return res.json({ success: false, message: 'You have already supported this complaint.' });
        }
        
        comp.votes = (comp.votes || 0) + 1;
        comp.votedUsers.push(req.user.email);
        
        if (comp.votes >= 5 && comp.priority !== 'Emergency') {
            comp.priority = 'High';
        }
        
        comp.history.push({
            action: 'Upvoted',
            timestamp: new Date().toISOString(),
            details: `Citizen supported this issue. Total votes: ${comp.votes}`
        });
        
        await comp.save();
        res.json({ success: true, votes: comp.votes });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/complaints/:id/reopen', authenticateToken, async (req, res) => {
    try {
        const queryId = req.params.id;
        let comp = await Complaint.findOne({ id: queryId }) || 
                         await Complaint.findOne({ complaint_id: queryId }) ||
                         await Complaint.findOne({ id: queryId.replace('#', '') });
        
        if (!comp) return res.status(404).json({ success: false, message: 'Complaint not found' });
        
        comp.status = 'pending';
        comp.history.push({
            action: 'Reopened',
            timestamp: new Date().toISOString(),
            details: `Citizen was unsatisfied and reopened the complaint.`
        });
        
        comp.slaLimit = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours SLA to resolve reopened
        comp.isSlaBreached = false;
        comp.escalationLevel = 0;
        
        await comp.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.put('/api/complaints/:id/priority', authenticateToken, async (req, res) => {
    try {
        const { priority } = req.body;
        const queryId = req.params.id;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

        if (complaint) {
            const oldPriority = complaint.priority;
            complaint.priority = priority;
            
            if (priority === 'Emergency') {
                complaint.slaLimit = new Date(Date.now() + 2 * 60 * 60 * 1000);
                complaint.isSlaBreached = false;
            }

            complaint.history.push({
                action: 'Priority Updated',
                timestamp: new Date().toISOString(),
                details: `Priority changed from ${oldPriority} to ${priority}`,
                by: req.user.name
            });

            await complaint.save();

            await smartCityChain.addBlock({
                action: "PRIORITY_CHANGE",
                complaintId: complaint.id,
                priority: priority,
                by: req.user.email
            });

            res.json({ success: true, complaint });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.put('/api/complaints/:id/reject-duplicate', authenticateToken, async (req, res) => {
    try {
        const queryId = req.params.id;
        let complaint = await Complaint.findOne({ id: queryId }) || 
                            await Complaint.findOne({ complaint_id: queryId }) ||
                            await Complaint.findOne({ id: queryId.replace('#', '') });

        if (complaint) {
            complaint.status = 'rejected';
            complaint.isDuplicate = true;
            complaint.history.push({
                action: 'Rejected Duplicate',
                timestamp: new Date().toISOString(),
                details: `Complaint marked as duplicate and rejected.`,
                by: req.user.name
            });

            await complaint.save();

            await smartCityChain.addBlock({
                action: "REJECTED_DUPLICATE",
                complaintId: complaint.id,
                by: req.user.email
            });

            res.json({ success: true, complaint });
        } else {
            res.status(404).json({ success: false, message: 'Complaint not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

app.post('/api/complaints/:id/merge', authenticateToken, async (req, res) => {
    try {
        const queryId = req.params.id;
        const { parentId } = req.body;
        
        let child = await Complaint.findOne({ id: queryId }) || 
                          await Complaint.findOne({ complaint_id: queryId }) ||
                          await Complaint.findOne({ id: queryId.replace('#', '') });

        let parent = await Complaint.findOne({ id: parentId }) || 
                           await Complaint.findOne({ complaint_id: parentId }) ||
                           await Complaint.findOne({ id: parentId.replace('#', '') });

        if (!child) return res.status(404).json({ success: false, message: 'Source complaint not found' });
        if (!parent) return res.status(404).json({ success: false, message: 'Target parent complaint not found' });

        const childVotes = child.votes || 0;
        parent.votes = (parent.votes || 0) + childVotes;
        
        if (child.votedUsers) {
            if (!parent.votedUsers) parent.votedUsers = [];
            child.votedUsers.forEach(u => {
                if (!parent.votedUsers.includes(u)) {
                    parent.votedUsers.push(u);
                }
            });
        }

        child.status = 'rejected';
        child.isDuplicate = true;
        child.duplicateOf = parent.id;
        
        child.history.push({
            action: 'Merged',
            timestamp: new Date().toISOString(),
            details: `Merged into parent complaint ${parent.id}. Status set to Rejected/Duplicate.`,
            by: req.user.name
        });

        parent.history.push({
            action: 'Votes Merged',
            timestamp: new Date().toISOString(),
            details: `Merged complaint ${child.id}. Added ${childVotes} votes. Total: ${parent.votes} votes.`,
            by: req.user.name
        });

        await child.save();
        await parent.save();

        await smartCityChain.addBlock({
            action: "MERGED_COMPLAINTS",
            childId: child.id,
            parentId: parent.id,
            votesAdded: childVotes,
            by: req.user.email
        });

        res.json({ success: true, message: 'Complaints merged successfully', child, parent });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error: ' + e.message });
    }
});

// Background SLA & Escalation Checker
async function runSLACheck() {
    try {
        const now = new Date();
        const activeComplaints = await Complaint.find({ status: { $nin: ['resolved', 'feedback_submitted', 'completed'] } });
        
        for (const comp of activeComplaints) {
            if (comp.slaLimit && now > new Date(comp.slaLimit)) {
                let breached = false;
                if (!comp.isSlaBreached) {
                    comp.isSlaBreached = true;
                    breached = true;
                    comp.history.push({
                        action: 'SLA Breached',
                        timestamp: now.toISOString(),
                        details: 'SLA limit crossed. Auto-triggering Red Alert.'
                    });
                    
                    try {
                        await smartCityChain.addBlock({
                            action: "SLA_BREACH",
                            complaintId: comp.id,
                            details: `SLA breached. Priority: ${comp.priority}`
                        });
                    } catch(err) {}
                    
                    console.log(`[SLA BREACH] Red Alert triggered for ${comp.id}`);
                }

                // Escalation check based on hours breached
                const hoursPast = (now - new Date(comp.slaLimit)) / (1000 * 60 * 60);
                let targetLevel = 0;
                if (hoursPast > 6) targetLevel = 3; // Mayor
                else if (hoursPast > 4) targetLevel = 2; // Commissioner
                else if (hoursPast > 2) targetLevel = 1; // Senior Officer

                if (comp.escalationLevel < targetLevel) {
                    const oldLevel = comp.escalationLevel;
                    comp.escalationLevel = targetLevel;
                    const levels = ['Officer', 'Senior Officer', 'Commissioner', 'Mayor'];
                    comp.history.push({
                        action: 'Auto-Escalated',
                        timestamp: now.toISOString(),
                        details: `Escalated from ${levels[oldLevel]} to ${levels[targetLevel]} automatically.`
                    });
                    
                    try {
                        await smartCityChain.addBlock({
                            action: "COMPLAINT_ESCALATED",
                            complaintId: comp.id,
                            details: `Escalated to ${levels[targetLevel]}`
                        });
                    } catch(err) {}

                    console.log(`[ESCALATION] Complaint ${comp.id} escalated to ${levels[targetLevel]}`);
                }
                
                await comp.save();
            }
        }
    } catch (e) {
        console.error("SLA check error:", e);
    }
}

// Run SLA check periodically
setInterval(runSLACheck, 15000);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    setTimeout(runSLACheck, 2000);
});

process.on('uncaughtException', (err) => console.error('Critical Error:', err));
setInterval(() => { }, 60000);
