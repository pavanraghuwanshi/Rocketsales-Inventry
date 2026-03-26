import type { Context } from "hono";
import { User } from "../../modules/user/user.model.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";


const JWT_SECRET = process.env.JWT_SECRET as string;

// ✅ Request Types
interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "hr" | "user";
}


// Login Types
interface LoginBody {
  email: string;
  password: string;
}


const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
};


// ✅ Register

export const register = async (c: Context) => {
  const body = await c.req.json<RegisterBody>();
  const { name, email, password, role } = body;

  if (!name || !email || !password) {
    return c.json(
      { message: "All fields are required" },
      400
    );
  }

  // ❗ Never trust role from frontend (security)
  const safeRole = role && ["admin", "hr", "user"].includes(role)
    ? role
    : "user";

  // check existing user
  const existingUser = await User.findOne({ email }).exec();
  if (existingUser) {
    return c.json(
      { message: "User already exists" },
      400
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: safeRole,
  });

  return c.json(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    201
  );
};



// ✅ Login

// export const login = async (c: Context) => {
//   const body = await c.req.json<LoginBody>();
//   const { email, password } = body;

//   if (!email || !password) {
//     return c.json(
//       { message: "Email and password required" },
//       400
//     );
//   }

//   const user = await User.findOne({ email }).exec();

//   if (!user) {
//     return c.json(
//       { message: "User not found" },
//       404
//     );
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     return c.json(
//       { message: "Invalid credentials" },
//       401
//     );
//   }

//   const token = jwt.sign(
//     {
//       id: user._id.toString(),
//       role: user.role,
//     } as JwtPayload,
//     getJwtSecret(),
//     { expiresIn: "7d" }
//   );

//   return c.json({
//     token,
//     user: {
//       id: user._id,
//       email: user.email,
//       role: user.role,
//     },
//   });
// };




export const login = async (c: Context) => {
  const body = await c.req.json<LoginBody>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ message: "Email and password required" }, 400);
  }

  const user = await User.findOne({ email }).exec();

  if (!user) {
    return c.json({ message: "User not found" }, 404);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return c.json({ message: "Invalid credentials" }, 401);
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    } as JwtPayload,
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  // ✅ 🍪 Set Cookie
  // setCookie(c, "token", token, {
  //   httpOnly: true,        // 🔒 cannot access via JS (secure)
  //   secure: true,          // HTTPS only (production)
  //   sameSite: "Strict",    // CSRF protection
  //   maxAge: 60 * 60 * 24 * 7, // 7 days
  //   path: "/",
  // });
    setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,      // Render (HTTPS)
    sameSite: "None",  // cross-origin ke liye
    path: "/",
  });

  return c.json({
    message: "Login successful",
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
};