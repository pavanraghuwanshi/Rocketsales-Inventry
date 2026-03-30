import mongoose, { Schema, Document } from "mongoose";

export interface IRack extends Document {
  name: string;
  warehouseId: mongoose.Types.ObjectId;
  capacity: number;
  adminId: mongoose.Types.ObjectId;
}

const rackSchema = new Schema<IRack>({
  name: { type: String, required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  capacity: { type: Number, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model<IRack>("Rack", rackSchema);
