import { Hono } from "hono";
import { register, login } from "../user/user.controller.ts";

const authRoutes = new Hono();

authRoutes.post("/register", register);
authRoutes.post("/login", login);

export default authRoutes;