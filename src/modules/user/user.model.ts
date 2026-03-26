import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  password: string;
  role: "admin" | "hr" | "user";
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
      type: String,
      required: true,
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