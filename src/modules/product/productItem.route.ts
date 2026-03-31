import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";

import { addProductItems, getProductItemsByRack, uploadProductItemsExcel } from "./productItem.controller";

const productItemRoutes = new Hono();

productItemRoutes.use("*", verifyToken);

productItemRoutes.post("/", addProductItems);
productItemRoutes.get("/rack-wise", getProductItemsByRack);
productItemRoutes.post("/upload-excel", uploadProductItemsExcel);


export default productItemRoutes;