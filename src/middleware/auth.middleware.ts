import jwt from "jsonwebtoken";
import type { JwtPayload } from "../modules/auth/auth.type.ts";

// ✅ Proper return type
type VerifyTokenResult =
  | { user: JwtPayload }
  | { error: string };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

// ✅ Verify Token (FIXED)
export const verifyToken = async (
  req: Request
): Promise<VerifyTokenResult> => {

  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return { error: "Unauthorized" };
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return { error: "Invalid token" };
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (
      typeof decoded !== "object" ||
      !("id" in decoded) ||
      !("role" in decoded)
    ) {
      return { error: "Invalid token payload" };
    }

    // ✅ MAIN FIX — RETURN USER
    return { user: decoded as JwtPayload };

  } catch (err) {
    return { error: "Invalid token" };
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