import { Hono } from "hono";
import {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from "./supplier.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const supplierRoutes = new Hono();

supplierRoutes.use("*", verifyToken);

supplierRoutes.post("/", createSupplier);
supplierRoutes.get("/", getSuppliers);
supplierRoutes.get("/:id", getSupplier);
supplierRoutes.put("/:id", updateSupplier);
supplierRoutes.delete("/:id", deleteSupplier);

export default supplierRoutes;