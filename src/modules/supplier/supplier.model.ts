import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  { timestamps: true }
);

export default mongoose.model<ISupplier>("Supplier", supplierSchema);