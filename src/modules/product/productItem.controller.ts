import type { Context } from "hono";
import { getBulkBarcodes } from "../../utils/barcode";
import Product from "./product.model";
import ProductItem from "./productItem.model";
import * as XLSX from "xlsx";





//  add product item quntity wise
// export const addProductItems = async (c: Context) => {
//   try {
//     const body = await c.req.json();
//     const user = c.get("user");

//     const { productId, warehouseId, rackId, quantity, adminId } = body;

//     // ✅ validations
//     if (!productId || !warehouseId || !rackId || !quantity || quantity < 1) {
//       return c.json(
//         { success: false, message: "productId, warehouseId, rackId, quantity required" },
//         400
//       );
//     }

//     const finalAdminId = user.role === "superadmin" ? adminId || user.id : user.id;

//     // ✅ check product exists
//     const product = await Product.findById(productId);
//     if (!product) {
//       return c.json({ success: false, message: "Product not found" }, 404);
//     }

//     // 🔥 create product items
//     const barcodes = await getBulkBarcodes(quantity);

//     const productItems = barcodes.map((barcode) => ({
//       productId: product._id,
//       warehouseId,
//       rackId,
//       barcodeNumber: barcode,
//       skuNumber: product.skuNumber,
//       adminId: finalAdminId,
//     }));

//     await ProductItem.insertMany(productItems);

//     return c.json({
//       success: true,
//       itemsCreated: quantity,
//       message: "Product items added successfully",
//     });
//   } catch (error: any) {
//     return c.json({ success: false, message: error.message }, 500);
//   }
// };

export const addProductItems = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { productId, warehouseId, rackId, barcodes, adminId } = body;

    // ✅ validations
    if (!productId || !warehouseId || !rackId || !barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return c.json(
        { success: false, message: "productId, warehouseId, rackId, barcodes array required" },
        400
      );
    }

    const finalAdminId =
      user.role === "superadmin" ? adminId || user.id : user.id;

    // ✅ check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    // 🔥 create product items
    const productItems = barcodes.map((barcode: string) => ({
      productId: product._id,
      categoryId: product.categoryId,
      warehouseId,
      rackId,
      barcodeNumber: barcode,
      skuNumber: product.skuNumber,
      adminId: finalAdminId,
    }));

    const existingItems = await ProductItem.find({
      barcodeNumber: { $in: barcodes },
    }).select("barcodeNumber");

    const existingBarcodes = existingItems.map(item => item.barcodeNumber);

    // 🔥 filter only new barcodes
    const newBarcodes = barcodes.filter(
      (barcode: string) => !existingBarcodes.includes(barcode)
    );

    // 🔥 update productItems based on newBarcodes only
    const filteredProductItems = newBarcodes.map((barcode: string) => ({
      productId: product._id,
      categoryId: product.categoryId,
      warehouseId,
      rackId,
      barcodeNumber: barcode,
      skuNumber: product.skuNumber,
      adminId: finalAdminId,
    }));

    if (filteredProductItems.length > 0) {
      await ProductItem.insertMany(filteredProductItems);
    }

return c.json({
  success: true,
  inserted: filteredProductItems.length,
  duplicates: existingBarcodes,
  message: "Processed with duplicate filtering",
});

    await ProductItem.insertMany(productItems);

    return c.json({
      success: true,
      itemsCreated: barcodes.length,
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
    .populate({
        path: "productId",
        select: "name skuNumber price brandId supplierId categoryId",
        populate: [
          { path: "brandId", select: "name" },       // populate brand
          { path: "categoryId", select: "name" },    // populate category
        ],
      })
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




//   Add Product Item to Rack In Bulk
export const uploadProductItemsExcel = async (c: Context) => {
  try {
    const user = c.get("user");
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || typeof file === "string") {
      return c.json({ success: false, message: "File is required" }, 400);
    }

    const buffer = Buffer.from(await (file as any).arrayBuffer());

    // Read Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames?.[0];

    if (!sheetName) {
      return c.json({ success: false, message: "Invalid Excel file" }, 400);
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return c.json({ success: false, message: "Sheet not found" }, 400);
    }

const data: any[] = XLSX.utils.sheet_to_json(sheet);

    // Expected columns: productId, warehouseId, rackId, barcodeNumber
    const productItems: any[] = [];

    for (const row of data) {
      const { productId, warehouseId, rackId, barcodeNumber, adminId } = row;

      if (!productId || !warehouseId || !rackId || !barcodeNumber) {
        continue; // skip invalid rows
      }

      const product = await Product.findById(productId);
      if (!product) continue;

      const finalAdminId =
        user.role === "superadmin" ? adminId || user.id : user.id;

      productItems.push({
        productId,
        warehouseId,
        rackId,
        barcodeNumber,
        skuNumber: product.skuNumber,
        adminId: finalAdminId,
      });
    }

    if (!productItems.length) {
      return c.json({ success: false, message: "No valid rows found" }, 400);
    }

    await ProductItem.insertMany(productItems);

    return c.json({
      success: true,
      inserted: productItems.length,
      message: "Excel data uploaded successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};