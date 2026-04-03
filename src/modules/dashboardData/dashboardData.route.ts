import { Hono } from "hono";
import { getCategoryDistribution, getProductAging, getStockCounts, getStockMovementMonthWise, getTodayActivity } from "./dashboardData.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const dashboardDataRoutes = new Hono();

dashboardDataRoutes.use("*", verifyToken);

dashboardDataRoutes.get("/", getStockCounts);
dashboardDataRoutes.get("/date-wise", getStockMovementMonthWise);
dashboardDataRoutes.get("/category-distribution", getCategoryDistribution);
dashboardDataRoutes.get("/product-aging", getProductAging);
dashboardDataRoutes.get("/today-activity", getTodayActivity);


export default dashboardDataRoutes;