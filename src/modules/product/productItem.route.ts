import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";

import { addProductItems } from "./productItem.controller";

const productItemRoutes = new Hono();

productItemRoutes.use("*", verifyToken);

productItemRoutes.post("/",   verifyToken,      addProductItems);


export default productItemRoutes;