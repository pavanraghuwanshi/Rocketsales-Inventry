import mongoose, { Document, Schema } from "mongoose";

export interface ICounter extends Document {
  name: string;
  sequence: number;
}

const counterSchema = new Schema<ICounter>(
  {
    name: { type: String, required: true, unique: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICounter>("Counter", counterSchema);