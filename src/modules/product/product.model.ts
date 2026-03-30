import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  brandId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },

    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);