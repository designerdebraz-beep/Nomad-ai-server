"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReview = exports.deleteDestination = exports.addDestination = exports.getDestinationById = exports.getDestinations = void 0;
const Destination_1 = require("../models/Destination");
const db_1 = require("../config/db");
const mongoose_1 = __importDefault(require("mongoose"));
const getDestinations = async (req, res) => {
    try {
        const search = req.query.search || '';
        const region = req.query.region || 'All';
        const maxCost = parseInt(req.query.maxCost) || 10000;
        const minSpeed = parseInt(req.query.minSpeed) || 0;
        const minSafety = parseFloat(req.query.minSafety) || 0;
        const sortBy = req.query.sortBy || 'name';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            let filtered = [...db.destinations];
            // Search matching
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = filtered.filter((d) => d.name.toLowerCase().includes(searchLower) ||
                    d.country.toLowerCase().includes(searchLower) ||
                    d.shortDescription.toLowerCase().includes(searchLower));
            }
            // Region Filter
            if (region && region !== 'All') {
                filtered = filtered.filter((d) => d.region === region);
            }
            // Numeric Filters
            filtered = filtered.filter((d) => d.cost <= maxCost &&
                d.internetSpeed >= minSpeed &&
                d.safetyRating >= minSafety);
            // Sorting
            filtered.sort((a, b) => {
                if (sortBy === 'cost_asc')
                    return a.cost - b.cost;
                if (sortBy === 'cost_desc')
                    return b.cost - a.cost;
                if (sortBy === 'speed')
                    return b.internetSpeed - a.internetSpeed;
                if (sortBy === 'rating')
                    return b.safetyRating - a.safetyRating;
                // Default alphabetical
                return a.name.localeCompare(b.name);
            });
            const total = filtered.length;
            const pages = Math.ceil(total / limit);
            const paginated = filtered.slice(skip, skip + limit);
            return res.json({
                destinations: paginated,
                page,
                pages,
                total,
            });
        }
        else {
            // MongoDB Flow
            const query = {};
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { country: { $regex: search, $options: 'i' } },
                    { shortDescription: { $regex: search, $options: 'i' } },
                ];
            }
            if (region && region !== 'All') {
                query.region = region;
            }
            query.cost = { $lte: maxCost };
            query.internetSpeed = { $gte: minSpeed };
            query.safetyRating = { $gte: minSafety };
            let sortOptions = {};
            if (sortBy === 'cost_asc')
                sortOptions.cost = 1;
            else if (sortBy === 'cost_desc')
                sortOptions.cost = -1;
            else if (sortBy === 'speed')
                sortOptions.internetSpeed = -1;
            else if (sortBy === 'rating')
                sortOptions.safetyRating = -1;
            else
                sortOptions.name = 1;
            const total = await Destination_1.DestinationModel.countDocuments(query);
            const pages = Math.ceil(total / limit);
            const destinations = await Destination_1.DestinationModel.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit);
            return res.json({
                destinations,
                page,
                pages,
                total,
            });
        }
    }
    catch (error) {
        console.error('Fetch destinations error:', error);
        return res.status(500).json({ message: 'Server error fetching destinations' });
    }
};
exports.getDestinations = getDestinations;
const getDestinationById = async (req, res) => {
    try {
        const { id } = req.params;
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const dest = db.destinations.find((d) => d._id === id);
            if (!dest) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            return res.json(dest);
        }
        else {
            const dest = await Destination_1.DestinationModel.findById(id).populate('author', 'username email avatar');
            if (!dest) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            return res.json(dest);
        }
    }
    catch (error) {
        console.error('Fetch destination by ID error:', error);
        return res.status(500).json({ message: 'Server error fetching destination' });
    }
};
exports.getDestinationById = getDestinationById;
const addDestination = async (req, res) => {
    try {
        const { name, country, region, shortDescription, fullDescription, cost, internetSpeed, safetyRating, weatherTemp, imageUrl, visaRequirement, } = req.body;
        const authorId = req.user.id;
        if (!name ||
            !country ||
            !region ||
            !shortDescription ||
            !fullDescription ||
            !cost ||
            !internetSpeed ||
            !safetyRating ||
            !weatherTemp ||
            !imageUrl ||
            !visaRequirement) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const newDest = {
            name,
            country,
            region,
            shortDescription,
            fullDescription,
            cost: Number(cost),
            internetSpeed: Number(internetSpeed),
            safetyRating: Number(safetyRating),
            weatherTemp: Number(weatherTemp),
            imageUrl,
            visaRequirement,
            reviews: [],
            author: authorId,
            createdAt: new Date(),
        };
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            newDest._id = new mongoose_1.default.Types.ObjectId().toString();
            db.destinations.push(newDest);
            (0, db_1.writeJsonDb)(db);
            return res.status(201).json(newDest);
        }
        else {
            const dest = new Destination_1.DestinationModel(newDest);
            await dest.save();
            return res.status(201).json(dest);
        }
    }
    catch (error) {
        console.error('Add destination error:', error);
        return res.status(500).json({ message: 'Server error adding destination' });
    }
};
exports.addDestination = addDestination;
const deleteDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const authorId = req.user.id;
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const index = db.destinations.findIndex((d) => d._id === id);
            if (index === -1) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            // Check ownership
            const dest = db.destinations[index];
            if (dest.author && dest.author !== authorId) {
                return res.status(403).json({ message: 'Unauthorized to delete this destination' });
            }
            db.destinations.splice(index, 1);
            (0, db_1.writeJsonDb)(db);
            return res.json({ message: 'Destination deleted successfully' });
        }
        else {
            const dest = await Destination_1.DestinationModel.findById(id);
            if (!dest) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            if (dest.author && dest.author.toString() !== authorId) {
                return res.status(403).json({ message: 'Unauthorized to delete this destination' });
            }
            await Destination_1.DestinationModel.findByIdAndDelete(id);
            return res.json({ message: 'Destination deleted successfully' });
        }
    }
    catch (error) {
        console.error('Delete destination error:', error);
        return res.status(500).json({ message: 'Server error deleting destination' });
    }
};
exports.deleteDestination = deleteDestination;
const addReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, username } = req.body;
        if (!rating || !comment || !username) {
            return res.status(400).json({ message: 'Rating, comment, and username are required' });
        }
        const review = {
            username,
            rating: Number(rating),
            comment,
            createdAt: new Date(),
        };
        if ((0, db_1.isJsonDbActive)()) {
            const db = (0, db_1.readJsonDb)();
            const dest = db.destinations.find((d) => d._id === id);
            if (!dest) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            dest.reviews.push(review);
            // Recalculate average rating if needed, but requirements don't ask for average recalculation, just reviews list.
            (0, db_1.writeJsonDb)(db);
            return res.status(201).json(dest);
        }
        else {
            const dest = await Destination_1.DestinationModel.findById(id);
            if (!dest) {
                return res.status(404).json({ message: 'Destination not found' });
            }
            dest.reviews.push(review);
            await dest.save();
            return res.status(201).json(dest);
        }
    }
    catch (error) {
        console.error('Add review error:', error);
        return res.status(500).json({ message: 'Server error adding review' });
    }
};
exports.addReview = addReview;
