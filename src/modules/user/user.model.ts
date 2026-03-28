import mongoose, { Document, Types } from "mongoose";


export interface EncryptedData {
  iv: string;
  content: string;
}


export interface IUser extends Document {
  name: string;
  username: string;
  password: EncryptedData;
  role: "superadmin" | "admin" | "user";
  adminId:mongoose.Types.ObjectId;
}


const userSchema = new mongoose.Schema<IUser>(
  {
    name: String,
    username: {
      type: String,
      required: true,
      unique: true,
    },
  password: {
    iv: { type: String, required: true },
    content: { type: String, required: true },
  },
    role: {
      type: String,
      enum: ["superadmin", "admin", "user"],
      default: "user",
    },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);