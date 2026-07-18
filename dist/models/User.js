"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
exports.UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    savedDestinations: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Destination' }],
    createdAt: { type: Date, default: Date.now },
});
exports.UserModel = (0, mongoose_1.model)('User', exports.UserSchema);
