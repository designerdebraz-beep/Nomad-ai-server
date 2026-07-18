import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let useJsonDb = false;
const JSON_DB_PATH = path.join(__dirname, '../../data/db.json');

// Ensure data directory exists for JSON DB
const ensureJsonDbExists = () => {
  const dir = path.dirname(JSON_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(
      JSON_DB_PATH,
      JSON.stringify({ users: [], destinations: [] }, null, 2),
      'utf8'
    );
  }
};

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nomad_ai';
  try {
    console.log('Attempting to connect to MongoDB...');
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // Timeout after 3 seconds
    });
    console.log('MongoDB Connected Successfully.');
    useJsonDb = false;
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);

    // In production / serverless (e.g. Vercel), the filesystem is read-only,
    // so the JSON file fallback cannot persist data. Fail fast instead of
    // silently degrading to a store that will crash on the first write.
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.error(
        'Refusing to fall back to the local JSON database in production. ' +
        'Set a valid MONGODB_URI environment variable.'
      );
      throw error;
    }

    console.log('⚠️ Falling back to Local JSON File Database (db.json)...');
    useJsonDb = true;
    ensureJsonDbExists();
  }
};

export const isJsonDbActive = () => useJsonDb;

// JSON DB Interface helpers
export const readJsonDb = (): { users: any[]; destinations: any[] } => {
  ensureJsonDbExists();
  const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
  return JSON.parse(data);
};

export const writeJsonDb = (data: { users: any[]; destinations: any[] }) => {
  ensureJsonDbExists();
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
};
