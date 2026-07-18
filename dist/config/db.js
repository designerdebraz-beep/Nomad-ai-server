"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJsonDb = exports.readJsonDb = exports.isJsonDbActive = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let useJsonDb = false;
const JSON_DB_PATH = path_1.default.join(__dirname, '../../data/db.json');
// Ensure data directory exists for JSON DB
const ensureJsonDbExists = () => {
    const dir = path_1.default.dirname(JSON_DB_PATH);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    if (!fs_1.default.existsSync(JSON_DB_PATH)) {
        fs_1.default.writeFileSync(JSON_DB_PATH, JSON.stringify({ users: [], destinations: [] }, null, 2), 'utf8');
    }
};
const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nomad_ai';
    try {
        console.log('Attempting to connect to MongoDB...');
        mongoose_1.default.set('strictQuery', false);
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000, // Timeout after 3 seconds
        });
        console.log('MongoDB Connected Successfully.');
        useJsonDb = false;
    }
    catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        console.log('⚠️ Falling back to Local JSON File Database (db.json)...');
        useJsonDb = true;
        ensureJsonDbExists();
    }
};
exports.connectDB = connectDB;
const isJsonDbActive = () => useJsonDb;
exports.isJsonDbActive = isJsonDbActive;
// JSON DB Interface helpers
const readJsonDb = () => {
    ensureJsonDbExists();
    const data = fs_1.default.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
};
exports.readJsonDb = readJsonDb;
const writeJsonDb = (data) => {
    ensureJsonDbExists();
    fs_1.default.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
};
exports.writeJsonDb = writeJsonDb;
