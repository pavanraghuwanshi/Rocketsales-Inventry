import mongoose, { Schema, Document } from "mongoose";

export interface IWarehouse extends Document {
  name: string;
  adminId: mongoose.Types.ObjectId;
}

const warehouseSchema = new Schema<IWarehouse>({
  name: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model<IWarehouse>("Warehouse", warehouseSchema);
