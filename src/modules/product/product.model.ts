import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
  brandId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  skuNumber: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true,unique: true },
    price: { type: Number, },

    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    skuNumber: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);