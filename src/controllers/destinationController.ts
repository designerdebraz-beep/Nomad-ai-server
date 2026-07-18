import { Request, Response } from 'express';
import { DestinationModel, IDestination, IReview } from '../models/Destination';
import { isJsonDbActive, readJsonDb, writeJsonDb } from '../config/db';
import mongoose from 'mongoose';

export const getDestinations = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const region = (req.query.region as string) || 'All';
    const maxCost = parseInt(req.query.maxCost as string) || 10000;
    const minSpeed = parseInt(req.query.minSpeed as string) || 0;
    const minSafety = parseFloat(req.query.minSafety as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'name';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const skip = (page - 1) * limit;

    if (isJsonDbActive()) {
      const db = readJsonDb();
      let filtered = [...db.destinations];

      // Search matching
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.name.toLowerCase().includes(searchLower) ||
            d.country.toLowerCase().includes(searchLower) ||
            d.shortDescription.toLowerCase().includes(searchLower)
        );
      }

      // Region Filter
      if (region && region !== 'All') {
        filtered = filtered.filter((d) => d.region === region);
      }

      // Numeric Filters
      filtered = filtered.filter(
        (d) =>
          d.cost <= maxCost &&
          d.internetSpeed >= minSpeed &&
          d.safetyRating >= minSafety
      );

      // Sorting
      filtered.sort((a, b) => {
        if (sortBy === 'cost_asc') return a.cost - b.cost;
        if (sortBy === 'cost_desc') return b.cost - a.cost;
        if (sortBy === 'speed') return b.internetSpeed - a.internetSpeed;
        if (sortBy === 'rating') return b.safetyRating - a.safetyRating;
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
    } else {
      // MongoDB Flow
      const query: any = {};

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

      let sortOptions: any = {};
      if (sortBy === 'cost_asc') sortOptions.cost = 1;
      else if (sortBy === 'cost_desc') sortOptions.cost = -1;
      else if (sortBy === 'speed') sortOptions.internetSpeed = -1;
      else if (sortBy === 'rating') sortOptions.safetyRating = -1;
      else sortOptions.name = 1;

      const total = await DestinationModel.countDocuments(query);
      const pages = Math.ceil(total / limit);
      const destinations = await DestinationModel.find(query)
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
  } catch (error) {
    console.error('Fetch destinations error:', error);
    return res.status(500).json({ message: 'Server error fetching destinations' });
  }
};

export const getDestinationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isJsonDbActive()) {
      const db = readJsonDb();
      const dest = db.destinations.find((d) => d._id === id);
      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }
      return res.json(dest);
    } else {
      const dest = await DestinationModel.findById(id).populate('author', 'username email avatar');
      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }
      return res.json(dest);
    }
  } catch (error) {
    console.error('Fetch destination by ID error:', error);
    return res.status(500).json({ message: 'Server error fetching destination' });
  }
};

export const addDestination = async (req: any, res: Response) => {
  try {
    const {
      name,
      country,
      region,
      shortDescription,
      fullDescription,
      cost,
      internetSpeed,
      safetyRating,
      weatherTemp,
      imageUrl,
      visaRequirement,
    } = req.body;

    const authorId = req.user.id;

    if (
      !name ||
      !country ||
      !region ||
      !shortDescription ||
      !fullDescription ||
      !cost ||
      !internetSpeed ||
      !safetyRating ||
      !weatherTemp ||
      !imageUrl ||
      !visaRequirement
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newDest: any = {
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

    if (isJsonDbActive()) {
      const db = readJsonDb();
      newDest._id = new mongoose.Types.ObjectId().toString();
      db.destinations.push(newDest);
      writeJsonDb(db);
      return res.status(201).json(newDest);
    } else {
      const dest = new DestinationModel(newDest);
      await dest.save();
      return res.status(201).json(dest);
    }
  } catch (error) {
    console.error('Add destination error:', error);
    return res.status(500).json({ message: 'Server error adding destination' });
  }
};

export const deleteDestination = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    if (isJsonDbActive()) {
      const db = readJsonDb();
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
      writeJsonDb(db);
      return res.json({ message: 'Destination deleted successfully' });
    } else {
      const dest = await DestinationModel.findById(id);

      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      if (dest.author && dest.author.toString() !== authorId) {
        return res.status(403).json({ message: 'Unauthorized to delete this destination' });
      }

      await DestinationModel.findByIdAndDelete(id);
      return res.json({ message: 'Destination deleted successfully' });
    }
  } catch (error) {
    console.error('Delete destination error:', error);
    return res.status(500).json({ message: 'Server error deleting destination' });
  }
};

export const addReview = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, username } = req.body;

    if (!rating || !comment || !username) {
      return res.status(400).json({ message: 'Rating, comment, and username are required' });
    }

    const review: IReview = {
      username,
      rating: Number(rating),
      comment,
      createdAt: new Date(),
    };

    if (isJsonDbActive()) {
      const db = readJsonDb();
      const dest = db.destinations.find((d) => d._id === id);

      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      dest.reviews.push(review);
      // Recalculate average rating if needed, but requirements don't ask for average recalculation, just reviews list.
      writeJsonDb(db);
      return res.status(201).json(dest);
    } else {
      const dest = await DestinationModel.findById(id);

      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      dest.reviews.push(review);
      await dest.save();
      return res.status(201).json(dest);
    }
  } catch (error) {
    console.error('Add review error:', error);
    return res.status(500).json({ message: 'Server error adding review' });
  }
};
