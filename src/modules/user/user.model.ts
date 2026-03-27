import mongoose, { Document, Types } from "mongoose";


export interface EncryptedData {
  iv: string;
  content: string;
}


export interface IUser extends Document {
  name: string;
  username: string;
  password: EncryptedData;
  role: "admin" | "hr" | "user";
  createdBy:Types.ObjectId;
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
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);