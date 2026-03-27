import { Hono } from "hono";
import userRoutes from "./modules/user/user.route";
import { cors } from "hono/cors";

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
export default app;