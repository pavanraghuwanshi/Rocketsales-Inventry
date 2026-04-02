import { Hono } from "hono";
import { register, login, getAllUsers, updateUser, deleteUser,  } from "../user/user.controller.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";

const authRoutes = new Hono();


authRoutes.post("/login", login);


authRoutes.use("*", verifyToken);

authRoutes.post("/register", verifyToken, register);
authRoutes.get("/get-all", verifyToken, getAllUsers);
authRoutes.put("/update/:id", verifyToken, updateUser);
authRoutes.delete("/delete/:id", verifyToken, deleteUser);

export default authRoutes;