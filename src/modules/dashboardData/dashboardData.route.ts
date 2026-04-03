import { Hono } from "hono";
import { getCategoryDistribution, getStockCounts, getStockMovementMonthWise } from "./dashboardData.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const dashboardDataRoutes = new Hono();

dashboardDataRoutes.use("*", verifyToken);

dashboardDataRoutes.get("/", getStockCounts);
dashboardDataRoutes.get("/date-wise", getStockMovementMonthWise);
dashboardDataRoutes.get("/category-distribution", getCategoryDistribution);


export default dashboardDataRoutes;