import type { Context } from "hono";
import { getBulkBarcodes } from "../../utils/barcode";
import Product from "./product.model";
import ProductItem from "./productItem.model";




//  add product item quntity wise
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

  //  get product item
export const getProductItems = async (c: Context) => {
  try {
    const user = c.get("user");
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");
    const search = c.req.query("search") || ""; // optional search by barcode or SKU
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");

    // At least one filter required
    if (!rackId && !warehouseId) {
      return c.json(
        { success: false, message: "Either rackId or warehouseId query param is required" },
        400
      );
    }

    // Build query dynamically
    const query: any = { status: "available" }; // only available items

    if (rackId) query.rackId = rackId;
    if (warehouseId) query.warehouseId = warehouseId;

    if (search) {
      query.$or = [
        { barcodeNumber: { $regex: search, $options: "i" } },
        { skuNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const items = await ProductItem.find(query)
      .populate("productId", "name skuNumber price brandId supplierId categoryId")
      .populate("warehouseId", "name location")
      .populate("rackId", "name capacity")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductItem.countDocuments(query);

    return c.json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      items,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};


//  get product Item rack-id wise
export const getProductItemsByRack = async (c: Context) => {
  try {
    const user = c.get("user");
    const rackId = c.req.query("rackId");
    const search = c.req.query("search") || ""; // optional search by barcode or SKU
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");

    if (!rackId) {
      return c.json({ success: false, message: "rackId query param is required" }, 400);
    }

    // Build query
    const query: any = {
      rackId,
      status: "available", // only available items
    };

    if (search) {
      // search by barcodeNumber or skuNumber
      query.$or = [
        { barcodeNumber: { $regex: search, $options: "i" } },
        { skuNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch items with relational data
    const items = await ProductItem.find(query)
      .populate("productId", "name skuNumber price brandId supplierId categoryId") // populate product fields
      .populate("warehouseId", "name location") // populate warehouse fields
      .populate("rackId", "name capacity") // populate rack fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count total matching documents
    const total = await ProductItem.countDocuments(query);

    return c.json({
      success: true,
      data:items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

