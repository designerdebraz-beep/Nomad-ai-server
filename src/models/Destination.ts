import { Schema, model } from 'mongoose';

export interface IReview {
  username: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IDestination {
  _id?: string;
  id?: string; // For JSON DB compatibility
  name: string;
  country: string;
  region: string;
  shortDescription: string;
  fullDescription: string;
  cost: number; // Monthly cost in USD
  internetSpeed: number; // In Mbps
  safetyRating: number; // 1-5 scale
  weatherTemp: number; // In Celsius
  imageUrl: string;
  visaRequirement: string;
  reviews: IReview[];
  author?: string; // User ID
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  username: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const DestinationSchema = new Schema<IDestination>({
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
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export const DestinationModel = model<IDestination>('Destination', DestinationSchema);
