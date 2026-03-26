import { serve } from "bun";
import app from "./app";
console.log("here i am coming bro in start 1")

import { connectDB } from "./config/db";
import "dotenv/config"; // 👈 important

console.log("here i am coming before connectDB(); bro in start  2")

// connect database
await connectDB();

console.log("here i am coming bro in start 3  after await connectDB()")


serve({
  fetch: app.fetch, 
  port: 5000,
});

console.log("🚀 Server running on http://localhost:5000");