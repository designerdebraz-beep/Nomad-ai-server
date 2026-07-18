"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.googleLogin = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const db_1 = require("../config/db");
const mongoose_1 = __importDefault(require("mongoose"));
const generateToken = (userId, email) => {
    const secret = process.env.JWT_SECRET || 'supersecretnomadtokenkey123!';
    return jsonwebtoken_1.default.sign({ id: userId, email }, secret, { expiresIn: '7d' });
};
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const existingUser = db.users.find((u) => u.email === normalizedEmail);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const newUser = {
                _id: new mongoose_1.default.Types.ObjectId().toString(),
                username,
                email: normalizedEmail,
                password: hashedPassword,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
                savedDestinations: [],
                createdAt: new Date(),
            };
            db.users.push(newUser);
            (0, db_1.writeJsonDb)(db);
            const token = generateToken(newUser._id, newUser.email);
            return res.status(201).json({
                token,
                user: { id: newUser._id, username: newUser.username, email: newUser.email, avatar: newUser.avatar },
            });
        }
        else {
            const existingUser = await User_1.UserModel.findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = new User_1.UserModel({
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
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const user = db.users.find((u) => u.email === normalizedEmail);
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const token = generateToken(user._id, user.email);
            return res.json({
                token,
                user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
            });
        }
        else {
            const user = await User_1.UserModel.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const token = generateToken(user._id.toString(), user.email);
            return res.json({
                token,
                user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
            });
        }
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login' });
    }
};
exports.login = login;
const googleLogin = async (req, res) => {
    try {
        const { email, username, googleId } = req.body;
        if (!email || !username) {
            return res.status(400).json({ message: 'Email and username are required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            let user = db.users.find((u) => u.email === normalizedEmail);
            if (!user) {
                // Register Google User
                user = {
                    _id: new mongoose_1.default.Types.ObjectId().toString(),
                    username,
                    email: normalizedEmail,
                    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
                    savedDestinations: [],
                    createdAt: new Date(),
                };
                db.users.push(user);
                (0, db_1.writeJsonDb)(db);
            }
            const token = generateToken(user._id, user.email);
            return res.json({
                token,
                user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
            });
        }
        else {
            let user = await User_1.UserModel.findOne({ email: normalizedEmail });
            if (!user) {
                // Register Google User
                user = new User_1.UserModel({
                    username,
                    email: normalizedEmail,
                    password: await bcryptjs_1.default.hash(googleId || 'google_oauth_fallback_pwd_123', 10),
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
    }
    catch (error) {
        console.error('Google login error:', error);
        return res.status(500).json({ message: 'Server error during Google login' });
    }
};
exports.googleLogin = googleLogin;
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const user = db.users.find((u) => u._id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, savedDestinations: user.savedDestinations });
        }
        else {
            const user = await User_1.UserModel.findById(userId).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({ id: user._id, username: user.username, email: user.email, avatar: user.avatar, savedDestinations: user.savedDestinations });
        }
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({ message: 'Server error fetching profile' });
    }
};
exports.getProfile = getProfile;
