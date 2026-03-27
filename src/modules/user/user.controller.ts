import type { Context } from "hono";
import { User } from "../../modules/user/user.model.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";
import { verifyToken } from "../../middleware/auth.middleware.ts";
import type { Types } from "mongoose";
import { decryptPassword, encryptPassword } from "../../utils/crypto.ts";


const JWT_SECRET = process.env.JWT_SECRET as string;

// ✅ Request Types
interface RegisterBody {
  name: string;
  username: string;
  password: string;
  role?: "admin" | "hr" | "user";
  createdBy:Types.ObjectId
}


// Login Types
interface LoginBody {
  username: string;
  password: string;
}


const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
};


// ✅ Register

export const register = async (c: Context) => {
  try {
    const body = await c.req.json<RegisterBody>();
    const { name, username, password, role, createdBy } = body;

    if (!name || !username || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    // 👉 get logged in user
    const auth = await verifyToken(c.req.raw);

    if ("error" in auth) {
      return c.json({ message: auth.error }, 401);
    }

    const loggedInUser = auth.user; // ⚠️ FIX (no .user)

    // ❗ safe role
    const safeRole =
      role && ["admin", "hr", "user"].includes(role) ? role : "user";

    // 👉 check existing user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return c.json({ message: "User already exists" }, 400);
    }

    // 👉 encrypt password
    const encryptedPassword = await encryptPassword(password);

    // 🔥 ROLE BASED createdBy LOGIC
    let finalCreatedBy;

    if (loggedInUser.role === "admin" && createdBy) {
      // ✅ admin can assign anyone
      finalCreatedBy = createdBy;
    } else {
      // ✅ hr/user → always self
      finalCreatedBy = loggedInUser.id;
    }


    // 👉 create user
    const user = await User.create({
      name,
      username,
      password: encryptedPassword,
      role: safeRole,
      createdBy: finalCreatedBy,
    });

    return c.json(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        createdBy: user.createdBy, // ✅ clean
      },
      201
    );
  } catch (error) {
    console.error("Register Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};



// ✅ Login


export const login = async (c: Context) => {
  const body = await c.req.json<LoginBody>();
  const { username, password } = body;

  if (!username || !password) {
    return c.json(
      { message: "username and password required" },
      400
    );
  }

  const user = await User.findOne({ username }).exec();

  if (!user) {
    return c.json(
      { message: "User not found" },
      404
    );
  }

  const decryptedPassword = decryptPassword(user.password);

  const isMatch = password === decryptedPassword;

  if (!isMatch) {
    return c.json(
      { message: "Invalid credentials" },
      401
    );
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    } as JwtPayload,
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  return c.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  });
};




// export const login = async (c: Context) => {
//   const body = await c.req.json<LoginBody>();
//   const { username, password } = body;

//   if (!username || !password) {
//     return c.json({ message: "username and password required" }, 400);
//   }

//   const user = await User.findOne({ username }).exec();

//   if (!user) {
//     return c.json({ message: "User not found" }, 404);
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     return c.json({ message: "Invalid credentials" }, 401);
//   }

//   const token = jwt.sign(
//     {
//       id: user._id.toString(),
//       role: user.role,
//     } as JwtPayload,
//     getJwtSecret(),
//     { expiresIn: "7d" }
//   );

//   // ✅ 🍪 Set Cookie
//   // setCookie(c, "token", token, {
//   //   httpOnly: true,        // 🔒 cannot access via JS (secure)
//   //   secure: true,          // HTTPS only (production)
//   //   sameSite: "Strict",    // CSRF protection
//   //   maxAge: 60 * 60 * 24 * 7, // 7 days
//   //   path: "/",
//   // });
//     setCookie(c, "token", token, {
//     httpOnly: true,
//     secure: true,      // Render (HTTPS)
//     sameSite: "None",  // cross-origin ke liye
//     path: "/",
//   });

//   return c.json({
//     message: "Login successful",
//     user: {
//       id: user._id,
//       username: user.username,
//       role: user.role,
//     },
//   });
// };