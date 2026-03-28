import { Hono } from "hono";
import { register, login } from "../user/user.controller.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";

const authRoutes = new Hono();

authRoutes.post("/register", verifyToken, register);
authRoutes.post("/login", login);

export default authRoutes;