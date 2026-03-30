import jwt from "jsonwebtoken";
import type { Context, Next } from "hono";
import type { JwtPayload } from "../modules/auth/auth.type.ts";

// ✅ Extend Hono Context Variables (for type safety)
export type Variables = {
  user: JwtPayload;
};

// ✅ Get JWT Secret Safely
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

// ✅ Verify Token Middleware
export const verifyToken = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("authorization");

    if (!authHeader) {
      return c.json({ message: "No token provided" }, 401);
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return c.json({ message: "Invalid token format" }, 401);
    }

    const decoded = jwt.verify(token, getJwtSecret());

    // ✅ Validate payload structure
    if (
      typeof decoded !== "object" ||
      !("id" in decoded) ||
      !("role" in decoded)
    ) {
      return c.json({ message: "Invalid token payload" }, 401);
    }

    const user = decoded as JwtPayload;

    // ✅ Store user in context
    c.set("user", user);

    await next();
  } catch (error) {
    return c.json({ message: "Unauthorized" }, 401);
  }
};

// ✅ Role-based Authorization Middleware
export const authorizeRoles = (roles: JwtPayload["role"][]) => {
  return async (c: Context, next: Next) => {
    try {
      const user = c.get("user") as JwtPayload;

      if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      if (!roles.includes(user.role)) {
        return c.json({ message: "Forbidden" }, 403);
      }

      await next();
    } catch (error) {
      return c.json({ message: "Authorization error" }, 403);
    }
  };
};