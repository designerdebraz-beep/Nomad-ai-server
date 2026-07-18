"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DestinationModel = exports.DestinationSchema = void 0;
const mongoose_1 = require("mongoose");
const ReviewSchema = new mongoose_1.Schema({
    username: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.DestinationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    region: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    cost: { type: Number, required: true },
    internetSpeed: { type: Number, required: true },
    safetyRating: { type: Number, required: true, min: 1, max: 5 },
    weatherTemp: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    visaRequirement: { type: String, required: true },
    reviews: [ReviewSchema],
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});
exports.DestinationModel = (0, mongoose_1.model)('Destination', exports.DestinationSchema);
