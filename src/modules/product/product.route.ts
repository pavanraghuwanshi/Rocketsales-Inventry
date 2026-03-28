import { Hono } from "hono";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "./product.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const productRoutes = new Hono();

productRoutes.use("*", verifyToken);

productRoutes.post("/", createProduct);
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);

export default productRoutes;