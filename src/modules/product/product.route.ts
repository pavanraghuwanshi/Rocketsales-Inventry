import { Hono } from "hono";
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "./product.controller";

const productRoutes = new Hono();

productRoutes.post("/", createProduct);
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);

export default productRoutes;