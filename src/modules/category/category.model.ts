import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  adminId: mongoose.Types.ObjectId;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", categorySchema);