import { Hono } from "hono";
import { getStockCounts } from "./dashboardData.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const dashboardDataRoutes = new Hono();

dashboardDataRoutes.use("*", verifyToken);

dashboardDataRoutes.get("/", getStockCounts);


export default dashboardDataRoutes;