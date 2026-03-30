import { Hono } from "hono";
import { register, login, getAllUsers } from "../user/user.controller.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";

const authRoutes = new Hono();


authRoutes.post("/login", login);


authRoutes.use("*", verifyToken);

authRoutes.post("/register", verifyToken, register);
authRoutes.get("/get-all", verifyToken, getAllUsers);

export default authRoutes;