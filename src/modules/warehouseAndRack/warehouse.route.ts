import { Hono } from "hono";
import { createWarehouse, getRackItemsSummary, getRacksDropdown, getWarehouses, getWarehousesDropdown, updateWarehouse } from "./warehouse.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const warehouseRoutes = new Hono();

warehouseRoutes.use("*", verifyToken);



warehouseRoutes.post("/", createWarehouse);
warehouseRoutes.get("/", getWarehouses);
warehouseRoutes.get("/racks-count", getRackItemsSummary);
warehouseRoutes.put("/:id", updateWarehouse);




warehouseRoutes.get("/dropdown", getWarehousesDropdown);
warehouseRoutes.get("/racks-dropdown", getRacksDropdown);




export default warehouseRoutes;
