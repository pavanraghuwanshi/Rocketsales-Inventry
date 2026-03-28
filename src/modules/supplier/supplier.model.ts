import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
  adminId: mongoose.Types.ObjectId;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<ISupplier>("Supplier", supplierSchema);