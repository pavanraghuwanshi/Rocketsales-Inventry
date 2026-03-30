

import { Hono } from "hono";
import {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
} from "./category.controller";

const categoryRoutes = new Hono();

categoryRoutes.post("/", createCategory);
categoryRoutes.get("/", getCategories);
categoryRoutes.get("/:id", getCategoryById);
categoryRoutes.put("/:id", updateCategory);
categoryRoutes.delete("/:id", deleteCategory);

export default categoryRoutes;
