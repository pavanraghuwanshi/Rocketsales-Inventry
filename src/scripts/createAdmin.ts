import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../modules/user/user.model";

// ✅ ENV
const MONGO_URI = process.env.MONGO_URI as string;

interface AdminInput {
  name: string;
  email: string;
  password: string;
}

const createAdmin = async () => {
  try {
    // 🔌 connect DB
    await mongoose.connect(MONGO_URI);
    console.log("✅ DB Connected");

    // 🧠 input (hardcoded ya CLI se le sakte ho)
    const adminData: AdminInput = {
      name: "Admin",
      email: "admin@gmail.com",
      password: "123456",
    };

    // 🔍 check existing
    const existing = await User.findOne({ email: adminData.email }).exec();

    if (existing) {
      console.log("⚠️ Admin already exists");
      process.exit(0);
    }

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // 👑 create admin
    const admin = await User.create({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("🎉 Admin created successfully:");
    console.log({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();

// bun run create:admin