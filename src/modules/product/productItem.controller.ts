import type { Context } from "hono";
import { getBulkBarcodes } from "../../utils/barcode";
import Product from "./product.model";
import ProductItem from "./productItem.model";





export const addProductItems = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { productId, warehouseId, rackId, quantity, adminId } = body;

    // ✅ validations
    if (!productId || !warehouseId || !rackId || !quantity || quantity < 1) {
      return c.json(
        { success: false, message: "productId, warehouseId, rackId, quantity required" },
        400
      );
    }

    const finalAdminId = user.role === "superadmin" ? adminId || user.id : user.id;

    // ✅ check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    // 🔥 create product items
    const barcodes = await getBulkBarcodes(quantity);

    const productItems = barcodes.map((barcode) => ({
      productId: product._id,
      warehouseId,
      rackId,
      barcodeNumber: barcode,
      skuNumber: product.skuNumber,
      adminId: finalAdminId,
    }));

    await ProductItem.insertMany(productItems);

    return c.json({
      success: true,
      itemsCreated: quantity,
      message: "Product items added successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};


