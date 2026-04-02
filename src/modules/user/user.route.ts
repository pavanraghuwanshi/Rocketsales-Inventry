import { Hono } from "hono";
import { register, login, getAllUsers, updateUser, deleteUser, getAdminUsersDropdown,  } from "../user/user.controller.ts";
import { verifyToken } from "../../middleware/auth.middleware.ts";

const authRoutes = new Hono();


authRoutes.post("/login", login);


authRoutes.use("*", verifyToken);

authRoutes.post("/register", verifyToken, register);
authRoutes.get("/get-all", verifyToken, getAllUsers);
authRoutes.get("/admin-dropdown", verifyToken, getAdminUsersDropdown);
authRoutes.put("/update/:id", verifyToken, updateUser);
authRoutes.delete("/delete/:id", verifyToken, deleteUser);

export default authRoutes;