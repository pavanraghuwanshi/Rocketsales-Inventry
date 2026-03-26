import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "hr" | "user";
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "hr", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);