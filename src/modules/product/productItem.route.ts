import { Hono } from "hono";
import { verifyToken } from "../../middleware/auth.middleware";

import { addProductItems, addProductItemsByExcel, getProductByBarcodeDetailed, getProductItems, getProductItemsByRack, markProductAsSold, uploadProductItemsExcel } from "./productItem.controller";

const productItemRoutes = new Hono();

productItemRoutes.use("*", verifyToken);

productItemRoutes.post("/", addProductItems);
productItemRoutes.post("/excel", addProductItemsByExcel);
productItemRoutes.get("/all-stocks", getProductItems);
productItemRoutes.get("/rack-wise", getProductItemsByRack);
productItemRoutes.post("/upload-excel", uploadProductItemsExcel);

productItemRoutes.put("/sold-stock", markProductAsSold);
productItemRoutes.get("/verify-stock", getProductByBarcodeDetailed);


export default productItemRoutes;