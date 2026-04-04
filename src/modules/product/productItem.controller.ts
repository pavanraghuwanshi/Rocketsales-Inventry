import type { Context } from "hono";
import { getBulkBarcodes } from "../../utils/barcode";
import Product from "./product.model";
import Category from "../category/category.model";
import Brand from "../brands/brand.model";
import Supplier from "../supplier/supplier.model";
import ProductItem from "./productItem.model";
import * as XLSX from "xlsx";
import brandModel from "../brands/brand.model";
import mongoose from "mongoose";
import { getRoleFilter } from "../../utils/roleFilteration";





//  add product item quntity wise

export const addProductItems = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { productId, warehouseId, rackId, barcodes,supplierId, adminId, purchasePrice, sellingPrice } = body;

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
      brandId: product.brandId,
      supplierId: new mongoose.Types.ObjectId(supplierId),
      warehouseId,
      rackId,
      barcodeNumber: barcode,
      skuNumber: product.skuNumber,
      adminId: finalAdminId,
      purchasePrice, 
      sellingPrice, 
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
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};



//  get product items by excel 

export const addProductItemsByExcel = async (c: Context) => {
  try {
    const user = c.get("user");

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    const warehouseId = formData.get("warehouseId");
    const rackId = formData.get("rackId");

    if (!file) {
      return c.json({ success: false, message: "Excel file required" }, 400);
    }

    if (!warehouseId || !rackId) {
      return c.json(
        { success: false, message: "warehouseId & rackId required" },
        400
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames?.[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;

    if (!sheet) {
      return c.json({ success: false, message: "Invalid Excel sheet" }, 400);
    }

    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return c.json({ success: false, message: "Empty Excel" }, 400);
    }

    // ✅ normalize
    const normalize = (obj: any) => {
      const o: any = {};
      for (let k in obj) o[k.trim().toLowerCase()] = obj[k];
      return o;
    };

    // ✅ header validation (ONLY REQUIRED)
    const requiredHeaders = ["productname", "barcode"];

    const firstRow = normalize(rows[0]);
    const excelHeaders = Object.keys(firstRow);

    const missingHeaders = requiredHeaders.filter(
      (h) => !excelHeaders.includes(h)
    );

    if (missingHeaders.length > 0) {
      return c.json({
        success: false,
        message: "Invalid Excel format",
        missingHeaders,
      }, 400);
    }

    const finalAdminId = user.id;

    // ================= 🚀 BULK FETCH =================

    const productNames = rows.map(r => normalize(r).productname);
    const barcodes = rows.map(r => normalize(r).barcode);

    const [products, brands, categories, suppliers, existingItems] =
      await Promise.all([
        Product.find({ name: { $in: productNames } }),
        Brand.find(),
        Category.find(),
        Supplier.find(),
        ProductItem.find({ barcodeNumber: { $in: barcodes } }).select("barcodeNumber"),
      ]);

    // ✅ maps (O(1))
    const productMap = new Map(products.map(p => [p.name, p]));
    const brandMap = new Map(brands.map(b => [b.name, b._id]));
    const categoryMap = new Map(categories.map(c => [c.name, c._id]));
    const supplierMap = new Map(suppliers.map(s => [s.name, s._id]));

    const existingBarcodeSet = new Set(
      existingItems.map(i => i.barcodeNumber)
    );

    const validItems: any[] = [];
    const errorItems: any[] = [];

    // ================= 🚀 PROCESS =================

    for (const row of rows) {
      const clean = normalize(row);

      const productName = clean.productname;
      const barcode = clean.barcode;

      const brandName = clean.brandname;
      const categoryName = clean.categoryname;
      const supplierName = clean.suppliername;

      const purchasePrice = clean.purchaseprice;
      const sellingPrice = clean.sellingprice;

      // ❌ required check
      if (!productName || !barcode) {
        errorItems.push({ ...row, error: "productName & barcode required" });
        continue;
      }

      // ❌ duplicate barcode
      if (existingBarcodeSet.has(barcode)) {
        errorItems.push({ ...row, error: "Duplicate barcode" });
        continue;
      }

      const product = productMap.get(productName);
      if (!product) {
        errorItems.push({ ...row, error: "Product not found" });
        continue;
      }

      // ✅ optional mapping (NO ERROR)
      const brandId = brandName ? brandMap.get(brandName) : undefined;
      const categoryId = categoryName ? categoryMap.get(categoryName) : undefined;
      const supplierId = supplierName ? supplierMap.get(supplierName) : undefined;

      validItems.push({
        productId: product._id,
        categoryId: categoryId || product.categoryId,
        brandId: brandId || product.brandId,
        ...(supplierId && { supplierId }),
        warehouseId,
        rackId,
        barcodeNumber: barcode,
        skuNumber: product.skuNumber,
        adminId: finalAdminId,
        purchasePrice,
        sellingPrice,
      });

      existingBarcodeSet.add(barcode); // avoid duplicate in same file
    }

    // ✅ insert
    if (validItems.length > 0) {
      await ProductItem.insertMany(validItems);
    }

    return c.json({
      success: true,
      insertedCount: validItems.length,
      errorCount: errorItems.length,
      errors: errorItems,
      message: "Fast Excel processed",
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
    const search = c.req.query("search") || "";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");

    // ✅ ROLE FILTER (unchanged function)
    let roleFilter: any = getRoleFilter(c, "adminId");

    // ✅ FIX HERE (convert if exists)
    if (roleFilter.adminId && mongoose.Types.ObjectId.isValid(roleFilter.adminId)) {
      roleFilter.adminId = new mongoose.Types.ObjectId(roleFilter.adminId);
    }

    const query: any = {
      ...roleFilter,
      status: "available",
    };

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
      .populate("supplierId", "name")
      .populate("categoryId", "name")
      .populate("brandId", "name")
      .populate("warehouseId", "name location")
      .populate("rackId", "name capacity")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductItem.countDocuments(query);

    return c.json({
      success: true,
      data: items,
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
      .populate("supplierId", "name phone email") // populate supplier fields
      .populate("rackId", "name capacity") // populate rack fields
      .sort({ createdAt: -1 })
      .select("-__v -categoryId -brandId")
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


//  mark product item as sold or damaged

export const markProductAsSold = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { barcodeNumber } = body;

    if (!barcodeNumber) {
      return c.json(
        { success: false, message: "barcodeNumber is required" },
        400
      );
    }

    // ✅ role-based adminId logic
    let adminId;

    if (user.role === "superadmin") {
      adminId = body.adminId || user.id;
    } else if (user.role === "admin") {
      adminId = user.id;
    } else {
      // user role
      adminId = user.adminId;
    }

    // ✅ find product item
    const item = await ProductItem.findOne({
      barcodeNumber,
      adminId,
    });

    if (!item) {
      return c.json(
        { success: false, message: "Product item not found" },
        404
      );
    }

    // ✅ already sold check
    if (item.status === "sold") {
      return c.json(
        { success: false, message: "Item already sold" },
        400
      );
    }

    // ✅ update
    item.status = "sold";
    item.outStockDate = new Date();

    await item.save();

    return c.json({
      success: true,
      message: "Product marked as sold",
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};


// Verify product item by barcode number

export const getProductByBarcodeDetailed = async (c: Context) => {
  try {
    const barcodeNumber = c.req.query("barcodeNumber");
    const user = c.get("user");

    if (!barcodeNumber) {
      return c.json(
        { success: false, message: "barcodeNumber is required" },
        400
      );
    }

    // ✅ role-based adminId
    let adminId;

    if (user.role === "superadmin") {
      adminId = c.req.query("adminId") || user.id;
    } else if (user.role === "admin") {
      adminId = user.id;
    } else {
      adminId = user.adminId;
    }

    // ✅ find + populate (only name)
    const item = await ProductItem.findOne({
      barcodeNumber,
      adminId,
    })
      .populate({ path: "productId", select: "name" })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "warehouseId", select: "name" })
      .populate({ path: "brandId", select: "name" })
      .populate({ path: "supplierId", select: "name phone" })
      .populate({ path: "rackId", select: "name" })
      .lean();

    if (!item) {
      return c.json(
        { success: false, message: "Product item not found" },
        404
      );
    }

    return c.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      500
    );
  }
};