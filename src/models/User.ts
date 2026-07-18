import { Schema, model } from 'mongoose';

export interface IUser {
  _id?: string;
  id?: string; // For JSON DB compatibility
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  savedDestinations: string[]; // Destination IDs
  createdAt: Date;
}

export const UserSchema = new Schema<IUser>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  savedDestinations: [{ type: Schema.Types.ObjectId, ref: 'Destination' }],
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = model<IUser>('User', UserSchema);
