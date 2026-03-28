import { Hono } from "hono";
import {
  createBrand,
  getBrands,
  getBrand,
  updateBrand,
  deleteBrand,
} from "./brand.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const brandRoutes = new Hono();

brandRoutes.use("*", verifyToken);

brandRoutes.post("/", createBrand);
brandRoutes.get("/", getBrands);
brandRoutes.get("/:id", getBrand);
brandRoutes.put("/:id", updateBrand);
brandRoutes.delete("/:id", deleteBrand);

export default brandRoutes;