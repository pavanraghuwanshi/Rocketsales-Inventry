

import { Hono } from "hono";
import {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
} from "./category.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const categoryRoutes = new Hono();

categoryRoutes.use("*",verifyToken);

categoryRoutes.post("/", createCategory);
categoryRoutes.get("/", getCategories);
categoryRoutes.get("/:id", getCategoryById);
categoryRoutes.put("/:id", updateCategory);
categoryRoutes.delete("/:id", deleteCategory);

export default categoryRoutes;
