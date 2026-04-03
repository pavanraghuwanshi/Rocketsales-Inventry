import { Hono } from "hono";
import userRoutes from "./modules/user/user.route";
import { cors } from "hono/cors";
import brandRoutes from "./modules/brands/brand.route";
import categoryRoutes from "./modules/category/category.route";
import supplierRoutes from "./modules/supplier/supplier.route";
import productRoutes from "./modules/product/product.route";
import warehouseRoutes from "./modules/warehouseAndRack/warehouse.route";
import productItemRoutes from "./modules/product/productItem.route";
import dashboardDataRoutes from "./modules/dashboardData/dashboardData.route";

const app = new Hono();

// ✅ Allow ALL CORS


app.use("*", cors({
  origin: "*",              // sab allow
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["*"],
}));

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});


// 👤 user routes
app.route("/api/user", userRoutes);


//   brand route
app.route("/api/brands", brandRoutes);

//   category route
app.route("/api/categories", categoryRoutes);

//   suppliers route
app.route("/api/suppliers", supplierRoutes);


//   warehouse route
app.route("/api/warehouses", warehouseRoutes);

//  dashboard data route
app.route("/api/dashboard", dashboardDataRoutes);


//    product route
app.route("/api/products", productRoutes);
app.route("/api/product-items", productItemRoutes);





export default app;