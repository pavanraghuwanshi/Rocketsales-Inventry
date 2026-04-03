import { Hono } from "hono";
import { getStockCounts, getStockMovementMonthWise } from "./dashboardData.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const dashboardDataRoutes = new Hono();

dashboardDataRoutes.use("*", verifyToken);

dashboardDataRoutes.get("/", getStockCounts);
dashboardDataRoutes.get("/date-wise", getStockMovementMonthWise);


export default dashboardDataRoutes;