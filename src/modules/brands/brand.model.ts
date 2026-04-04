import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBrand extends Document {
  name: string;
  description?: string;
  adminId:Types.ObjectId
}

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    adminId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User",
     }
  },
  { timestamps: true }
);

brandSchema.index(
  { name: 1, adminId: 1 },
  { unique: true }
);

export default mongoose.model<IBrand>("Brand", brandSchema);