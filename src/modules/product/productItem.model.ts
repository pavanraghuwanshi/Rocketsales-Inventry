import mongoose, { Schema, Document } from "mongoose";

export interface IProductItem extends Document {
  productId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  rackId: mongoose.Types.ObjectId;
  barcodeNumber: string;
  skuNumber: string;
  adminId: mongoose.Types.ObjectId;
  status: "available" | "sold" | "damaged";
}

const productItemSchema = new Schema<IProductItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    rackId: {
      type: Schema.Types.ObjectId,
      ref: "Rack",
      required: true,
    },

    barcodeNumber: {
      type: String,
      required: true,
      unique: true, // 🔥 must
    },

    skuNumber: {
      type: String,
      required: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["available", "sold", "damaged"],
      default: "available",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProductItem>(
  "ProductItem",
  productItemSchema
);