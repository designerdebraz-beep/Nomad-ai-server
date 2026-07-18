import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User';
import { isJsonDbActive, readJsonDb, writeJsonDb } from '../config/db';
import mongoose from 'mongoose';

const generateToken = (userId: string, email: string) => {
  const secret = process.env.JWT_SECRET || 'supersecretnomadtokenkey123!';
  return jwt.sign({ id: userId, email }, secret, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isJsonDbActive()) {
      const db = readJsonDb();
      const existingUser = db.users.find((u) => u.email === normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser: IUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        username,
        email: normalizedEmail,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        savedDestinations: [],
        createdAt: new Date(),
      };

      db.users.push(newUser);
      writeJsonDb(db);

      const token = generateToken(newUser._id!, newUser.email);
      return res.status(201).json({
        token,
        user: { id: newUser._id, username: newUser.username, email: newUser.email, avatar: newUser.avatar },
      });
    } else {
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new UserModel({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        savedDestinations: [],
      });

      await user.save();
      const token = generateToken(user._id.toString(), user.email);
      return res.status(201).json({
        token,
        user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isJsonDbActive()) {
      const db = readJsonDb();
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id, user.email);
      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
      });
    } else {
      const user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id.toString(), user.email);
      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const DEMO_EMAIL = 'john.nomad@nomadai.io';
export const DEMO_PASSWORD = 'Password123!';

export const seedDemoUser = async () => {
  try {
    if (isJsonDbActive()) {
      const db = readJsonDb();
      if (!db.users.find((u) => u.email === DEMO_EMAIL)) {
        const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
        db.users.push({
          _id: 'seed_user_demo',
          username: 'JohnNomad',
          email: DEMO_EMAIL,
          password: hashedPassword,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=JohnNomad`,
          savedDestinations: [],
          createdAt: new Date(),
        });
        writeJsonDb(db);
        console.log('Demo user seeded (JSON DB).');
      }
    } else {
      const existing = await UserModel.findOne({ email: DEMO_EMAIL });
      if (!existing) {
        const demoUser = new UserModel({
          username: 'JohnNomad',
          email: DEMO_EMAIL,
          password: await bcrypt.hash(DEMO_PASSWORD, 10),
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=JohnNomad`,
          savedDestinations: [],
        });
        await demoUser.save();
        console.log('Demo user seeded (MongoDB).');
      }
    }
  } catch (error: any) {
    console.error('Demo user seeding error:', error);
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { email, username, googleId } = req.body;

    if (!email || !username) {
      return res.status(400).json({ message: 'Email and username are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isJsonDbActive()) {
      const db = readJsonDb();
      let user = db.users.find((u) => u.email === normalizedEmail);

      if (!user) {
        // Register Google User
        user = {
          _id: new mongoose.Types.ObjectId().toString(),
          username,
          email: normalizedEmail,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
          savedDestinations: [],
          createdAt: new Date(),
        };
        db.users.push(user);
        writeJsonDb(db);
      }

      const token = generateToken(user._id, user.email);
      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
      });
    } else {
      let user = await UserModel.findOne({ email: normalizedEmail });

      if (!user) {
        // Register Google User
        user = new UserModel({
          username,
          email: normalizedEmail,
          password: await bcrypt.hash(googleId || 'google_oauth_fallback_pwd_123', 10),
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
          savedDestinations: [],
        });
        await user.save();
      }

      const token = generateToken(user._id.toString(), user.email);
      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
      });
    }
  } catch (error: any) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Server error during Google login' });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    if (isJsonDbActive()) {
      const db = readJsonDb();
      const user = db.users.find((u) => u._id === userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, savedDestinations: user.savedDestinations });
    } else {
      const user = await UserModel.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, savedDestinations: user.savedDestinations });
    }
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
};
