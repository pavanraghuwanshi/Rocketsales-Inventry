import { Hono } from "hono";
import {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from "./supplier.controller";

const supplierRoutes = new Hono();

supplierRoutes.post("/", createSupplier);
supplierRoutes.get("/", getSuppliers);
supplierRoutes.get("/:id", getSupplier);
supplierRoutes.put("/:id", updateSupplier);
supplierRoutes.delete("/:id", deleteSupplier);

export default supplierRoutes;