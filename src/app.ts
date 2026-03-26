import { Hono } from "hono";
import userRoutes from "../src/modules/user/user.route";
import { cors } from "hono/cors";

const app = new Hono();

// ✅ Allow ALL CORS


const allowedOrigins = [
  "http://localhost:5173",
  "https://goyal-enterprices.vercel.app",
];

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return origin; // allow Postman / server calls
    return allowedOrigins.includes(origin) ? origin : "";
  },
  credentials: true,
}));

app.get("/", (c) => {
  return c.json({ message: "CRM API running 🚀" });
});


// 👤 user routes
app.route("/api/user", userRoutes);
export default app;