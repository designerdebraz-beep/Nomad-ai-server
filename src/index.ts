import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, isJsonDbActive, readJsonDb, writeJsonDb } from './config/db';
import { DestinationModel } from './models/Destination';
import authRoutes from './routes/auth';
import destinationRoutes from './routes/destinations';
import aiRoutes from './routes/ai';
import { seedDemoUser } from './controllers/authController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Lazy DB init: ensures the DB is connected and seeded exactly once,
// which is required for serverless (Vercel) where there is no persistent server.
let dbInitPromise: Promise<void> | null = null;
export const ensureDbReady = async () => {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await connectDB();
      await seedDatabase();
    })().catch((err) => {
      // Reset so a later request can retry after a transient failure.
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
};

// Initialize the DB before handling any request (works in both local and serverless).
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({ message: 'Database initialization failed' });
  }
});

// Seed Data
const seedDestinations = [
  {
    name: 'Canggu, Bali',
    country: 'Indonesia',
    region: 'Asia',
    shortDescription: 'The ultimate tropical digital nomad haven with surf, cafe culture, and vibrant community.',
    fullDescription: 'Canggu has risen to become the world capital for digital nomads. Boasting an endless array of aesthetics-focused cafes, high-speed fiber internet, and co-working spaces, it offers an unbeatable balance of work and play. Surrounded by black sand beaches and terraced rice paddies, Canggu features a highly social community of remote creators, startup founders, and wellness advocates. Accommodation options range from traditional guest houses to modern shared luxury villas.',
    cost: 1600,
    internetSpeed: 65,
    safetyRating: 4.2,
    weatherTemp: 28,
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Indonesian remote work visa (E33G) or 60-day Tourist Visa on Arrival.',
    reviews: [
      { username: 'AlexNomad', rating: 5, comment: 'Incredible food and networking. Renting a scooter is a must.', createdAt: new Date() },
      { username: 'ElenaCodes', rating: 4, comment: 'Cafe wifi is good, but traffic can get chaotic during rush hours.', createdAt: new Date() }
    ]
  },
  {
    name: 'Lisbon',
    country: 'Portugal',
    region: 'Europe',
    shortDescription: 'Europe’s leading nomad hub blending historic coastal charm with a fast-growing tech startup scene.',
    fullDescription: 'Lisbon provides everything a modern remote worker needs: 300 days of sunshine, proximity to surf beaches, historic architecture, and a dynamic entrepreneur ecosystem. Although rental prices have risen in recent years, the quality of life, fast fiber-optic internet, and highly accessible public transport make it the top choice for nomads based in Europe. The city regularly hosts international tech conferences, including Web Summit.',
    cost: 2800,
    internetSpeed: 120,
    safetyRating: 4.8,
    weatherTemp: 20,
    imageUrl: 'https://images.unsplash.com/photo-1509840144524-f679051874b2?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Portugal Digital Nomad Visa (D8) requiring €3,280 monthly remote income.',
    reviews: [
      { username: 'TechTraveler', rating: 5, comment: 'Best community events and fast internet. A bit pricey but worth it.', createdAt: new Date() }
    ]
  },
  {
    name: 'Medellin',
    country: 'Colombia',
    region: 'South America',
    shortDescription: 'The city of eternal spring, known for its green mountain views and high-growth nomad hubs.',
    fullDescription: 'Nestled in an Andean valley, Medellin offers mild spring weather year-round. Neighborhoods like El Poblado and Laureles are packed with modern cafes, lush parks, and highly rated coworking networks. The local government has invested heavily in urban innovation and cable-car transit, transforming the city into a vibrant tech hotspot. The cost of living is extremely competitive, allowing a premium lifestyle at a low cost.',
    cost: 1400,
    internetSpeed: 55,
    safetyRating: 3.5,
    weatherTemp: 22,
    imageUrl: 'https://images.unsplash.com/photo-1595878788414-9988b48227b2?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Colombia Digital Nomad Visa (V-Nomadas) for remote workers, up to 2 years.',
    reviews: [
      { username: 'JuanWrites', rating: 4, comment: 'Beautiful scenery and extremely affordable. Keep your wits about you at night.', createdAt: new Date() }
    ]
  },
  {
    name: 'Chiang Mai',
    country: 'Thailand',
    region: 'Asia',
    shortDescription: 'A laid-back cultural city offering some of the lowest costs of living and best cafes in the world.',
    fullDescription: 'Chiang Mai is a legendary low-cost digital nomad hub. Located in the mountainous north of Thailand, it features hundreds of Buddhist temples, bustling night markets, and exceptionally fast internet. The Nimman neighborhood is highly walkable and acts as the central workspace area. Food is exceptionally cheap, delicious, and healthy. It is widely considered the best city for beginner digital nomads looking to bootstrap a project.',
    cost: 1100,
    internetSpeed: 90,
    safetyRating: 4.6,
    weatherTemp: 26,
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Thailand Destination Visa (DTV) for remote workers, valid for 5 years.',
    reviews: [
      { username: 'BootstrapBob', rating: 5, comment: 'Lived here for a year on pennies. Cafe culture is unmatched.', createdAt: new Date() }
    ]
  },
  {
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    shortDescription: 'A futuristic megalopolis offering hyper-fast internet, absolute safety, and endless exploration.',
    fullDescription: 'Tokyo is an incomparable experience. While historically considered expensive, the current exchange rate makes it highly accessible for foreign remote workers. You get lightning-fast 5G speeds, absolute cleanliness, zero crime, and world-class food. The co-working space market is expanding rapidly, with major spaces in Shibuya, Shinjuku, and Roppongi. Highly suited for tech nomads seeking inspiration from the future.',
    cost: 2900,
    internetSpeed: 180,
    safetyRating: 4.9,
    weatherTemp: 16,
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Japan Digital Nomad Visa for stays up to 6 months (income requirement applies).',
    reviews: [
      { username: 'CyberNomad', rating: 5, comment: 'Fastest internet on the planet. Safest city in the world.', createdAt: new Date() }
    ]
  },
  {
    name: 'Berlin',
    country: 'Germany',
    region: 'Europe',
    shortDescription: 'A gritty, artistic capital offering unparalleled cultural depth, nightlife, and startup networks.',
    fullDescription: 'Berlin is a major startup hub and a magnet for artists and developers. The city has a unique, history-rich aesthetic, filled with clubs, art galleries, and green parks. It features highly progressive co-working networks like Betahaus and Factory Berlin. While winters are cold and finding a long-term apartment is difficult, the city’s summer atmosphere, tolerance, and tech scene make it a magnet for creative minds.',
    cost: 2600,
    internetSpeed: 85,
    safetyRating: 4.1,
    weatherTemp: 12,
    imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Germany Freelance Visa (Freiberufler) is highly popular for remote creators.',
    reviews: [
      { username: 'ArtNomad', rating: 4, comment: 'Summers are legendary. Great tech circles. Bureaucracy is tough.', createdAt: new Date() }
    ]
  },
  {
    name: 'Cape Town',
    country: 'South Africa',
    region: 'Africa',
    shortDescription: 'Where dramatic mountains meet two oceans. Perfect for outdoor adventurers and creative remote workers.',
    fullDescription: 'Cape Town is visually stunning, defined by the iconic Table Mountain and gorgeous coastlines. It operates in a favorable timezone for European remote workers. The city offers rich culinary experiences, wine farms, hiking trails, and surf spots. The digital nomad community is centered in Green Point and Sea Point, with many boutique cafes and workspaces. Remote workers must manage around loadshedding (electricity cuts), though most professional places have generators.',
    cost: 1800,
    internetSpeed: 50,
    safetyRating: 3.3,
    weatherTemp: 19,
    imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'South Africa Digital Nomad Visa recently introduced for stays up to 3 years.',
    reviews: [
      { username: 'WindSurfer', rating: 5, comment: 'Nature is gorgeous. Coworking spaces have backup power. Incredible place.', createdAt: new Date() }
    ]
  },
  {
    name: 'Buenos Aires',
    country: 'Argentina',
    region: 'South America',
    shortDescription: 'The Paris of South America, offering grand architecture, tango, steak, and high affordability.',
    fullDescription: 'Buenos Aires is a cultural heavyweight, featuring tree-lined boulevards, European-style cafes, and a legendary culinary scene. It has a highly active, intellectual, and friendly local population. The neighborhood of Palermo Soho is the epicenter of the nomad community, full of coworking offices and design-focused coffee shops. It provides an exceptional lifestyle at a highly economical rate due to favorable exchange rates.',
    cost: 1300,
    internetSpeed: 60,
    safetyRating: 3.8,
    weatherTemp: 18,
    imageUrl: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1200&q=80',
    visaRequirement: 'Argentina Digital Nomad Visa (Temporary Residency) valid for 180 days (extendable).',
    reviews: [
      { username: 'SteakLover', rating: 5, comment: 'Palermo is beautiful. The local culture is extremely warm. Great value.', createdAt: new Date() }
    ]
  }
];

export const seedDatabase = async () => {
  try {
    if (isJsonDbActive()) {
      const db = readJsonDb();
      if (db.destinations.length === 0) {
        console.log('Seeding Local JSON Database...');
        db.destinations = seedDestinations.map((d, index) => ({
          ...d,
          _id: `seed_dest_${index + 1}`,
          createdAt: new Date()
        }));
        writeJsonDb(db);
        console.log('JSON DB Seeding Completed.');
      }
    } else {
      const count = await DestinationModel.countDocuments();
      if (count === 0) {
        console.log('Seeding MongoDB Database...');
        await DestinationModel.insertMany(seedDestinations);
        console.log('MongoDB Seeding Completed.');
      }
    }

    await seedDemoUser();
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

// API Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isJsonDbActive() ? 'local_json_db' : 'mongodb',
    timestamp: new Date()
  });
});

// Start a traditional server only when NOT running on Vercel (i.e. local dev).
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    await ensureDbReady();
  });
}

export default app;
