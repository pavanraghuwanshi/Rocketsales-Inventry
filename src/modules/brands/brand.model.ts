import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  description?: string;
}

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
  },
  { timestamps: true }
);

export default mongoose.model<IBrand>("Brand", brandSchema);