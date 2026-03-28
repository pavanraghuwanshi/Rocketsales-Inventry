import jwt from "jsonwebtoken";
import type { JwtPayload } from "../modules/auth/auth.type.ts";
import type { Context, Next } from "hono";


const JWT_SECRET = process.env.JWT_SECRET as string;



function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

// ✅ Verify Token (FIXED)
export const verifyToken = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("authorization");

    if (!authHeader) {
      return c.json({ message: "No token provided" }, 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return c.json({ message: "Invalid token format" }, 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ store user in context (important)
    c.set("user", decoded);

    await next(); // 👉 MUST call next()
  } catch (error) {
    return c.json({ message: "Unauthorized" }, 401);
  }
};

// ✅ Role Guard (unchanged but clean)
export const authorizeRoles = (roles: JwtPayload["role"][]) => {
  return (user: JwtPayload) => {
    if (!roles.includes(user.role)) {
      return { error: "Forbidden" };
    }
    return { success: true };
  };
};