import { Hono } from "hono";
import { createWarehouse, getRackItemsSummary, getWarehouses, updateWarehouse } from "./warehouse.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const warehouseRoutes = new Hono();

warehouseRoutes.use("*", verifyToken);



warehouseRoutes.post("/", createWarehouse);
warehouseRoutes.get("/", getWarehouses);
warehouseRoutes.get("/racks-count", getRackItemsSummary);
warehouseRoutes.put("/:id", updateWarehouse);


export default warehouseRoutes;
